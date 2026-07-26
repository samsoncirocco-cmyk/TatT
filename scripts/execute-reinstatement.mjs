/**
 * Reinstate an artist who was taken down and has asked to come back.
 * See docs/adr/0026.
 *
 * DRY RUN BY DEFAULT. Running this with just a handle prints exactly what would
 * change and changes nothing, anywhere.
 *
 * Usage:
 *   # 1. See what would change (safe, read-only)
 *   node scripts/execute-reinstatement.mjs --instagram tattoosbyging
 *
 *   # 2. Actually reinstate — ONLY after you have seen the verification code
 *   #    published on instagram.com/<handle> by the account holder
 *   node scripts/execute-reinstatement.mjs --instagram tattoosbyging \
 *     --handle-verified --execute --confirm tattoosbyging
 *
 * Flags:
 *   --instagram <handle>  required; the handle the tombstone is keyed on
 *   --handle-verified     you assert you saw the code on that Instagram account.
 *                         No code here can read Instagram; this is the identity
 *                         check, and it is a human one.
 *   --execute             actually reinstate (otherwise: dry run)
 *   --confirm <handle>    must exactly equal --instagram
 *
 * WHAT THIS DOES NOT DO
 *
 *   - It does NOT delete the tombstone or let the crawler back in. The ingest
 *     gate stays permanently shut for this handle. That is the design, not an
 *     oversight: the artist's own profile must stay authoritative.
 *   - It does NOT restore anything. The photographs and the embedding were hard
 *     deleted and the node was scrubbed. The artist gets an EMPTY profile bound
 *     to their account, which they fill in themselves.
 *
 * There is deliberately no admin path that skips the artist's own request. If
 * you find yourself wanting one, that is the feature working.
 */
import neo4j from 'neo4j-driver';
import { config } from 'dotenv';
import { executeReinstatement, planReinstatement } from './lib/reinstate-plan.mjs';

config();
config({ path: '.env.local', override: false });

function parseArgs(argv) {
  const opts = { instagram: null, handleVerified: false, execute: false, confirm: null };
  for (let i = 0; i < argv.length; i++) {
    const next = () => argv[++i];
    switch (argv[i]) {
      case '--instagram': opts.instagram = next(); break;
      case '--handle-verified': opts.handleVerified = true; break;
      case '--execute': opts.execute = true; break;
      case '--confirm': opts.confirm = next(); break;
      default: break;
    }
  }
  return opts;
}

/**
 * Mark the tombstone as reinstated. Note what this Cypher does NOT contain:
 * no DELETE, and no change to `key`. The node stays, the key stays, and
 * TOMBSTONE_KEYS_CYPHER keeps returning it — so every ingest path keeps
 * refusing this handle forever. These are audit properties only.
 */
const MARK_TOMBSTONE_CYPHER = `
  MATCH (t:TakedownTombstone {key: $key})
  SET t.reinstatedAt = timestamp(),
      t.reinstatedByUid = $uid,
      t.reinstatementRequestId = $requestId,
      t.reinstatedArtistId = $artistId
  RETURN t.key AS key
`;

/**
 * Unsuppress the husk and bind it to the verified account.
 *
 * Only `removedAt`/`removalReason` are cleared. Nothing scrubbed is restored,
 * because nothing scrubbed still exists — the artist re-enters an empty profile.
 */
const REINSTATE_ARTIST_CYPHER = `
  MATCH (a:Artist {id: $artistId})
  SET a.removedAt = null,
      a.removalReason = null,
      a.claimedByUid = $uid,
      a.reinstatedAt = timestamp(),
      a.selfRegistered = true
  RETURN a.id AS id
`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.instagram) {
    console.error('Missing --instagram. See the header of this file for usage.');
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

  const num = (v) => (v == null ? null : Number(typeof v?.toNumber === 'function' ? v.toNumber() : v));

  const deps = {
    async readTombstone(key) {
      const res = await session.run(
        `MATCH (t:TakedownTombstone {key: $key})
         RETURN t.key AS key, t.artistId AS artistId, t.reinstatedAt AS reinstatedAt,
                t.scope AS scope, t.createdAtEpoch AS createdAtEpoch`,
        { key },
      );
      if (!res.records.length) return null;
      const r = res.records[0];
      return {
        key: r.get('key'),
        artistId: r.get('artistId'),
        reinstatedAt: num(r.get('reinstatedAt')),
        scope: r.get('scope'),
        createdAtEpoch: num(r.get('createdAtEpoch')),
      };
    },

    async readPendingRequest(handle) {
      // Most recent pending request wins; an artist who re-submits should not be
      // blocked by their own earlier attempt.
      const res = await session.run(
        `MATCH (r:ReinstatementRequest {instagram: $handle, status: 'pending'})
         RETURN r.id AS id, r.uid AS uid, r.contactEmail AS contactEmail,
                r.verificationCode AS verificationCode,
                r.issuedAtEpochMs AS issuedAtEpochMs
         ORDER BY r.issuedAtEpochMs DESC LIMIT 1`,
        { handle },
      );
      if (!res.records.length) return null;
      const r = res.records[0];
      return {
        id: r.get('id'),
        uid: r.get('uid'),
        contactEmail: r.get('contactEmail'),
        verificationCode: r.get('verificationCode'),
        issuedAtEpochMs: num(r.get('issuedAtEpochMs')),
      };
    },

    async readArtist(artistId) {
      const res = await session.run(
        `MATCH (a:Artist {id: $artistId})
         RETURN a.id AS id, a.removedAt AS removedAt, a.claimedByUid AS claimedByUid,
                a.stripeAccountId AS stripeAccountId`,
        { artistId },
      );
      if (!res.records.length) return null;
      const r = res.records[0];
      return {
        id: r.get('id'),
        removedAt: num(r.get('removedAt')),
        claimedByUid: r.get('claimedByUid'),
        stripeAccountId: r.get('stripeAccountId'),
      };
    },

    async markTombstoneReinstated(key, meta) {
      const res = await session.run(MARK_TOMBSTONE_CYPHER, {
        key, uid: meta.uid, requestId: meta.requestId, artistId: meta.artistId,
      });
      return res.records.length > 0;
    },

    async reinstateArtist(artistId, meta) {
      const res = await session.run(REINSTATE_ARTIST_CYPHER, { artistId, uid: meta.uid });
      return res.records.length > 0;
    },

    async closeRequest(requestId) {
      await session.run(
        `MATCH (r:ReinstatementRequest {id: $requestId})
         SET r.status = 'approved', r.closedAtEpochMs = timestamp()`,
        { requestId },
      );
      return true;
    },
  };

  try {
    const plan = await planReinstatement(deps, {
      instagram: opts.instagram,
      handleVerified: opts.handleVerified,
    });

    console.log('\n──────────────────────────────────────────────────────────');
    console.log(`  REINSTATEMENT PLAN — @${plan.handle}`);
    console.log('──────────────────────────────────────────────────────────\n');

    console.log(`  Tombstone key:   ${plan.tombstoneKey ?? '(none)'}`);
    console.log(`  Tombstone found: ${plan.tombstone ? 'yes' : 'NO'}`);
    if (plan.tombstone) {
      console.log(`    scope:         ${plan.tombstone.scope ?? '(unknown)'}`);
      console.log(`    removed at:    ${plan.tombstone.createdAtEpoch ? new Date(plan.tombstone.createdAtEpoch).toISOString() : '(unknown)'}`);
      console.log(`    reinstated at: ${plan.tombstone.reinstatedAt ? new Date(plan.tombstone.reinstatedAt).toISOString() : 'never'}`);
    }
    console.log(`  Artist node:     ${plan.artist ? plan.artist.id : '(none)'}`);
    if (plan.artist) {
      console.log(`    suppressed:    ${plan.artist.removedAt ? 'yes' : 'no'}`);
      console.log(`    claimed by:    ${plan.artist.claimedByUid ?? '(nobody)'}`);
      console.log(`    stripe acct:   ${plan.artist.stripeAccountId ?? '(none)'}`);
    }

    if (plan.request) {
      console.log(`\n  Pending request: ${plan.request.id}`);
      console.log(`    from uid:      ${plan.request.uid}`);
      console.log(`    contact:       ${plan.request.contactEmail}`);
      console.log(`    issued:        ${plan.request.issuedAtEpochMs ? new Date(plan.request.issuedAtEpochMs).toISOString() : '(unknown)'}`);
      console.log('');
      console.log(`  >>> CHECK https://instagram.com/${plan.handle} FOR THIS CODE:`);
      console.log(`  >>>     ${plan.request.verificationCode}`);
      console.log('  >>> That check is the ONLY identity verification in this flow.');
    } else {
      console.log('\n  Pending request: NONE');
    }

    console.log(`\n  Handle control confirmed by operator: ${plan.handleVerified ? 'YES' : 'no'}`);
    console.log(`  Ingest stays blocked after this:      ${plan.ingestStaysBlocked ? 'YES (permanently)' : '!! NO !!'}`);

    if (plan.warnings.length) {
      console.log('\n  Notes:');
      plan.warnings.forEach((w) => console.log(`      ! ${w}`));
    }
    if (plan.blockers.length) {
      console.log('\n  BLOCKERS:');
      plan.blockers.forEach((b) => console.log(`      ✗ ${b}`));
    }

    const result = await executeReinstatement(deps, plan, {
      execute: opts.execute,
      confirm: opts.confirm,
    });

    console.log('\n──────────────────────────────────────────────────────────');
    if (result.dryRun) {
      console.log('  DRY RUN — nothing was changed.');
      console.log('  Re-run with --handle-verified --execute --confirm <handle> to approve.');
    } else if (!result.executed) {
      console.log(`  NOT EXECUTED — ${result.error}`);
      process.exitCode = 1;
    } else if (result.ok) {
      console.log('  REINSTATED.');
      console.log(`    Tombstone marked (NOT removed): ${result.changed.tombstoneMarkedReinstated}`);
      console.log(`    Node unsuppressed:              ${result.changed.nodeUnsuppressed}`);
      console.log(`    Bound to uid:                   ${result.changed.boundToUid}`);
      console.log('    Scrapers remain permanently blocked from re-adding this handle.');
      console.log('    The artist has an EMPTY profile — nothing deleted was restored.');
    } else {
      console.log('  EXECUTED WITH FAILURES — this reinstatement is INCOMPLETE:');
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
  console.error('[reinstate] fatal:', err?.message || err);
  process.exit(1);
});
