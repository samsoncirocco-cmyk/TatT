/**
 * OPTIONAL graph tidy-up — NOT required by any code.
 *
 * The style vocabulary fix (src/lib/style-vocabulary.ts) reconciles the
 * graph's spellings through the ontology's aliases, so /matches, /artists and
 * /smart-match are correct against the graph exactly as it stands today. This
 * script only removes the *cause* of that reconciliation, and is safe to
 * never run.
 *
 * What it would do:
 *
 *  1. Merge the empty `Japanese` Style node into `Japanese (Irezumi)`, then
 *     rename the survivor to `Japanese`. The graph currently has both: 434
 *     artists SPECIALIZES_IN "Japanese (Irezumi)" and 0 on "Japanese" (which
 *     only has FEATURES_STYLE edges from Tattoo nodes).
 *  2. Delete Style nodes with no relationships at all, if any.
 *
 * It does NOT rename `Lettering`. Lettering is the correct name — it is what
 * data/style-ontology.json, the settings picker and the scraper all call it,
 * and the graph agrees. "Script" was a name only the old CANONICAL_STYLES
 * list used, and it is now an alias of `lettering` in the ontology. Nothing
 * should create a `Script` Style node.
 *
 * Usage:
 *   node scripts/migrations/2026-07-25-consolidate-style-nodes.mjs           # dry run (default)
 *   node scripts/migrations/2026-07-25-consolidate-style-nodes.mjs --apply   # writes
 *
 * Dry run is read-only and prints the exact counts it would change.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const APPLY = process.argv.includes('--apply');

/** (from, into) pairs — every `from` node's edges move onto `into`. */
const MERGES = [{ from: 'Japanese (Irezumi)', into: 'Japanese' }];

async function main() {
  const { default: neo4j } = await import('neo4j-driver');
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true });

  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !user || !password) throw new Error('NEO4J_* credentials missing from .env.local');

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), { connectionTimeout: 15000 });
  const session = driver.session({ database: process.env.NEO4J_DATABASE || undefined });
  const num = (v) => (v && v.toNumber ? v.toNumber() : Number(v));

  try {
    console.log(APPLY ? '=== APPLYING ===' : '=== DRY RUN (no writes) ===');

    for (const { from, into } of MERGES) {
      const survey = await session.executeRead((tx) =>
        tx.run(
          `
          OPTIONAL MATCH (src:Style {name: $from})
          OPTIONAL MATCH (dst:Style {name: $into})
          RETURN
            src IS NOT NULL AS hasSrc,
            dst IS NOT NULL AS hasDst,
            size([(:Artist)-[:SPECIALIZES_IN]->(src) | 1]) AS srcArtists,
            size([(:Artist)-[:SPECIALIZES_IN]->(dst) | 1]) AS dstArtists,
            size([(:Tattoo)-[:FEATURES_STYLE]->(src) | 1]) AS srcTattoos,
            size([(:Tattoo)-[:FEATURES_STYLE]->(dst) | 1]) AS dstTattoos
          `,
          { from, into },
        ),
      );
      const r = survey.records[0];
      if (!r?.get('hasSrc')) {
        console.log(`- "${from}": no such Style node, nothing to do`);
        continue;
      }
      console.log(
        `- "${from}" (${num(r.get('srcArtists'))} artists, ${num(r.get('srcTattoos'))} tattoos) ` +
          `-> "${into}" (${r.get('hasDst') ? `${num(r.get('dstArtists'))} artists, ${num(r.get('dstTattoos'))} tattoos` : 'does not exist yet'})`,
      );

      if (!APPLY) continue;

      // MERGE the target first so the rewire has somewhere to land, move both
      // edge types, then drop the now-edgeless source node.
      await session.executeWrite((tx) =>
        tx.run(
          `
          MATCH (src:Style {name: $from})
          MERGE (dst:Style {name: $into})
          WITH src, dst
          CALL {
            WITH src, dst
            MATCH (a:Artist)-[rel:SPECIALIZES_IN]->(src)
            MERGE (a)-[:SPECIALIZES_IN]->(dst)
            DELETE rel
          }
          CALL {
            WITH src, dst
            MATCH (t:Tattoo)-[rel:FEATURES_STYLE]->(src)
            MERGE (t)-[:FEATURES_STYLE]->(dst)
            DELETE rel
          }
          WITH src
          DETACH DELETE src
          `,
          { from, into },
        ),
      );
      console.log(`  merged.`);
    }

    const orphans = await session.executeRead((tx) =>
      tx.run('MATCH (s:Style) WHERE NOT (s)--() RETURN s.name AS name ORDER BY name'),
    );
    const names = orphans.records.map((r) => r.get('name'));
    console.log(
      names.length
        ? `- ${names.length} Style node(s) with no relationships: ${names.join(', ')}`
        : '- no orphaned Style nodes',
    );
    if (APPLY && names.length) {
      await session.executeWrite((tx) =>
        tx.run('MATCH (s:Style) WHERE NOT (s)--() DELETE s'),
      );
      console.log('  deleted.');
    }

    if (!APPLY) {
      console.log('\nRe-run with --apply to write. Afterwards re-run:');
      console.log('  node scripts/sync-graph-style-vocabulary.mjs');
    }
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error(`[consolidate-style-nodes] ${err.message}`);
  process.exit(1);
});
