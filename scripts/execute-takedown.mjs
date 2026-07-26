/**
 * Execute an artist takedown. See docs/adr/0024.
 *
 * DRY RUN BY DEFAULT. Running this with just an artist id prints exactly what
 * would be removed and changes nothing, anywhere.
 *
 * Usage:
 *   # 1. See what would be removed (safe, read-only)
 *   node scripts/execute-takedown.mjs --artist-id artist_tattoosbyging
 *
 *   # 2. Actually remove it (only after verifying the requester)
 *   node scripts/execute-takedown.mjs --artist-id artist_tattoosbyging \
 *     --scope all --execute --confirm artist_tattoosbyging
 *
 * Flags:
 *   --artist-id <id>   required
 *   --scope <all|images>  default: all
 *   --reason "<text>"  recorded on the node and the tombstone
 *   --execute          actually remove (otherwise: dry run)
 *   --confirm <id>     must exactly equal --artist-id; guards against a stray
 *                      --execute deleting the wrong artist
 *
 * What "removed" means, and why, is ADR 0024. The short version:
 *   GCS photos + Supabase embedding  → hard deleted
 *   :Artist node                     → soft-deleted and scrubbed, not dropped
 *                                      (held deposits, audit trail, and so a
 *                                       re-import MERGEs onto a removedAt husk)
 *   :TakedownTombstone               → permanent, blocks re-ingest
 */
import neo4j from 'neo4j-driver';
import { config } from 'dotenv';
import { executeTakedown, planTakedown } from './lib/takedown-plan.mjs';

config();
config({ path: '.env.local', override: false });

const DEFAULT_BUCKET = 'tatt-pro-assets';

function parseArgs(argv) {
  const opts = { artistId: null, scope: 'all', reason: null, execute: false, confirm: null };
  for (let i = 0; i < argv.length; i++) {
    const next = () => argv[++i];
    switch (argv[i]) {
      case '--artist-id': opts.artistId = next(); break;
      case '--scope': opts.scope = next(); break;
      case '--reason': opts.reason = next(); break;
      case '--execute': opts.execute = true; break;
      case '--confirm': opts.confirm = next(); break;
      default: break;
    }
  }
  return opts;
}

// ─── Property scrub list (ADR 0024 §2) ──────────────────────────────────────
// The husk must retain no personal data. Money/ownership properties are
// deliberately NOT in this list.
const SCRUBBED_PROPERTIES = [
  'name', 'bio', 'instagram', 'handle', 'shopName', 'city', 'state',
  'lat', 'lng', 'location', 'email', 'profile_url', 'sourcePages',
  'portfolioImages', 'portfolioImageCount', 'portfolioSource',
  'rating', 'reviewCount', 'hourlyRate', 'yearsExperience', 'embedding_id',
];

const SUPPRESS_CYPHER = `
  MATCH (a:Artist {id: $artistId})
  SET a.removedAt = timestamp(),
      a.removalReason = $reason,
      ${SCRUBBED_PROPERTIES.map((p) => `a.\`${p}\` = null`).join(',\n      ')}
  WITH a
  OPTIONAL MATCH (a)-[:CREATED]->(t:Tattoo)
  DETACH DELETE t
  WITH DISTINCT a
  OPTIONAL MATCH (a)-[r:SPECIALIZES_IN|HAS_INSTAGRAM|HAS_WEBSITE|TAGGED_WITH|APPRENTICED_UNDER|INFLUENCED_BY|HAS_ARTIST]-()
  DELETE r
  RETURN a.id AS id
`;

const TOMBSTONE_CYPHER = `
  UNWIND $keys AS k
  MERGE (t:TakedownTombstone {key: k.key})
  ON CREATE SET t.keyType = k.keyType,
                t.artistId = $artistId,
                t.scope = $scope,
                t.reason = $reason,
                t.createdAtEpoch = timestamp()
  RETURN count(t) AS written
`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.artistId) {
    console.error('Missing --artist-id. See the header of this file for usage.');
    process.exit(2);
  }
  if (!['all', 'images'].includes(opts.scope)) {
    console.error(`--scope must be "all" or "images" (got ${JSON.stringify(opts.scope)}).`);
    process.exit(2);
  }

  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(
      process.env.NEO4J_USERNAME || process.env.NEO4J_USER,
      process.env.NEO4J_PASSWORD,
    ),
  );
  const session = driver.session(
    process.env.NEO4J_DATABASE ? { database: process.env.NEO4J_DATABASE } : undefined,
  );

  const bucketName = process.env.GCS_BUCKET_NAME || process.env.GCS_BUCKET || DEFAULT_BUCKET;

  // Lazily constructed so a dry run never needs GCS/Supabase credentials.
  let bucket = null;
  async function getBucket() {
    if (!bucket) {
      const { Storage } = await import('@google-cloud/storage');
      bucket = new Storage().bucket(bucketName);
    }
    return bucket;
  }
  let supabase = null;
  async function getSupabase() {
    if (!supabase) {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );
    }
    return supabase;
  }

  const deps = {
    async readArtist(artistId) {
      const res = await session.run(
        `MATCH (a:Artist {id: $artistId})
         RETURN a.id AS id, a.name AS name, a.instagram AS instagram,
                a.handle AS handle, a.sourcePages AS sourcePages,
                a.portfolioImages AS portfolioImages, a.removedAt AS removedAt,
                a.stripeAccountId AS stripeAccountId, a.claimedByUid AS claimedByUid`,
        { artistId },
      );
      if (!res.records.length) return null;
      const r = res.records[0];
      return {
        id: r.get('id'),
        name: r.get('name'),
        // Fall back to `handle` — the crawler cohort stores it there, not on `instagram`.
        instagram: r.get('instagram') || r.get('handle'),
        sourcePages: r.get('sourcePages') || [],
        portfolioImages: r.get('portfolioImages') || [],
        removedAt: r.get('removedAt'),
        stripeAccountId: r.get('stripeAccountId'),
        claimedByUid: r.get('claimedByUid'),
      };
    },

    async listGcsObjects(prefix) {
      const b = await getBucket();
      // No maxResults cap — the shared listFiles helper defaults to 100 and we
      // must not under-report what is about to be deleted.
      const [files] = await b.getFiles({ prefix });
      return files.map((f) => f.name);
    },

    async countEmbeddings(artistId) {
      const sb = await getSupabase();
      const { count, error } = await sb
        .from('portfolio_embeddings')
        .select('artist_id', { count: 'exact', head: true })
        .eq('artist_id', artistId);
      if (error) throw new Error(`Supabase count failed: ${error.message}`);
      return count ?? 0;
    },

    async listPendingRelays(artistId) {
      const res = await session.run(
        `MATCH (r:BookingRelay {artistId: $artistId, status: 'pending'})
         RETURN r.id AS id, r.amountCents AS amountCents`,
        { artistId },
      );
      return res.records.map((r) => ({
        id: r.get('id'),
        amountCents: Number(r.get('amountCents') ?? 0),
      }));
    },

    async deleteGcsObjects(paths) {
      const b = await getBucket();
      let deleted = 0;
      const failed = [];
      for (const p of paths) {
        try {
          await b.file(p).delete();
          deleted++;
        } catch (err) {
          if (err?.code === 404) { deleted++; continue; }
          failed.push({ path: p, error: err?.message || String(err) });
        }
      }
      return { deleted, failed };
    },

    async deleteEmbedding(artistId) {
      const sb = await getSupabase();
      const { error } = await sb.from('portfolio_embeddings').delete().eq('artist_id', artistId);
      if (error) throw new Error(`Supabase delete failed: ${error.message}`);
      return true;
    },

    async writeTombstones(keys, meta) {
      const res = await session.run(TOMBSTONE_CYPHER, {
        keys,
        artistId: meta.artistId,
        scope: meta.scope,
        reason: meta.reason,
      });
      return res.records.length > 0;
    },

    async suppressArtist(artistId, meta) {
      const res = await session.run(SUPPRESS_CYPHER, { artistId, reason: meta.reason ?? null });
      return res.records.length > 0;
    },
  };

  try {
    const plan = await planTakedown(deps, {
      artistId: opts.artistId,
      scope: opts.scope,
      reason: opts.reason,
    });

    console.log('\n──────────────────────────────────────────────────────────');
    console.log(`  TAKEDOWN PLAN — ${opts.artistId}  (scope: ${opts.scope})`);
    console.log('──────────────────────────────────────────────────────────\n');

    if (!plan.found) {
      console.log('  Artist not found in the graph.');
      plan.blockers.forEach((b) => console.log(`  ✗ ${b}`));
      process.exitCode = 1;
      return;
    }

    console.log(`  Name:            ${plan.artist.name ?? '(none)'}`);
    console.log(`  Instagram:       ${plan.artist.instagram ?? '(none)'}`);
    console.log(`  Already removed: ${plan.alreadyRemoved ? 'YES' : 'no'}`);
    console.log('');
    console.log(`  GCS objects to delete (gs://${bucketName}/): ${plan.gcsObjects.length}`);
    plan.gcsObjects.forEach((o) => console.log(`      - ${o}`));
    console.log(`  Supabase portfolio_embeddings rows to delete: ${plan.embeddingRows}`);
    console.log(`  Artist node: ${plan.willSuppressNode ? 'soft-delete + scrub' : 'untouched (scope=images)'}`);
    console.log(`  Tombstone keys to write: ${plan.tombstoneKeys.length}`);
    plan.tombstoneKeys.forEach((k) => console.log(`      - ${k.key}`));

    if (plan.warnings.length) {
      console.log('\n  Warnings:');
      plan.warnings.forEach((w) => console.log(`      ! ${w}`));
    }
    if (plan.blockers.length) {
      console.log('\n  BLOCKERS:');
      plan.blockers.forEach((b) => console.log(`      ✗ ${b}`));
    }

    const result = await executeTakedown(deps, plan, {
      execute: opts.execute,
      confirm: opts.confirm,
    });

    console.log('\n──────────────────────────────────────────────────────────');
    if (result.dryRun) {
      console.log('  DRY RUN — nothing was changed.');
      console.log('  Re-run with --execute --confirm <artist-id> to remove for real.');
    } else if (!result.executed) {
      console.log(`  NOT EXECUTED — ${result.error}`);
      process.exitCode = 1;
    } else if (result.ok) {
      console.log('  EXECUTED.');
      console.log(`    GCS objects deleted:   ${result.removed.gcsObjects}`);
      console.log(`    Embedding rows deleted:${result.removed.embeddingRows}`);
      console.log(`    Node suppressed:       ${result.removed.nodeSuppressed}`);
      console.log(`    Tombstone keys:        ${result.removed.tombstoneKeys}`);
    } else {
      console.log('  EXECUTED WITH FAILURES — this takedown is INCOMPLETE:');
      result.failures.forEach((f) => console.log(`      ✗ ${f}`));
      console.log('  Re-run after fixing the above. Do not report this as done.');
      process.exitCode = 1;
    }
    console.log('──────────────────────────────────────────────────────────\n');
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error('[takedown] fatal:', err?.message || err);
  process.exit(1);
});
