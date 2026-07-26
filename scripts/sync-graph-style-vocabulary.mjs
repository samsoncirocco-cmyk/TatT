/**
 * Snapshot the live artist graph's *matchable* style vocabulary (ADR-0010).
 *
 * The /matches and /smart-match style pills must offer exactly the styles the
 * graph can actually answer with. Hand-maintaining that list is what produced
 * dead filters ("Script" was never a Style node; "Japanese" and "Minimalist"
 * are nodes with zero artists), so the list is generated instead.
 *
 * A style is *matchable* when at least one Artist points at it with
 * SPECIALIZES_IN — the only edge the match query traverses
 * (src/features/match-pulse/services/neo4jService.ts). Style nodes reachable
 * only from Tattoo nodes via FEATURES_STYLE cannot return an artist and are
 * deliberately excluded.
 *
 * Each graph name is resolved through data/style-ontology.json, so the graph's
 * spelling ("Japanese (Irezumi)") and the product's vocabulary ("Japanese")
 * stay reconciled by the ontology's aliases rather than by a second mapping.
 * A graph name that resolves to nothing is reported, never guessed at — new
 * vocabulary enters the ontology only by human approval (ADR-0011, see
 * scripts/extract-style-ontology.mjs + propose-ontology-candidates.mjs).
 *
 * READ-ONLY: this script never writes to Neo4j.
 *
 * Usage: node scripts/sync-graph-style-vocabulary.mjs [--check]
 *   (default)  rewrite data/graph-style-vocabulary.json
 *   --check    exit 1 if the checked-in snapshot is stale (no write)
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import { buildLookup, normalizeTerm } from './lib/ontology.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ONTOLOGY_PATH = path.join(ROOT, 'data', 'style-ontology.json');
const SNAPSHOT_PATH = path.join(ROOT, 'data', 'graph-style-vocabulary.json');

/** Pull every Style name that at least one Artist SPECIALIZES_IN, with counts. */
async function readMatchableStyles() {
  const { default: neo4j } = await import('neo4j-driver');
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true });

  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !user || !password) {
    throw new Error('NEO4J_URI / NEO4J_USERNAME / NEO4J_PASSWORD must be set in .env.local');
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    connectionTimeout: 15000,
  });
  const session = driver.session({
    database: process.env.NEO4J_DATABASE || undefined,
    defaultAccessMode: neo4j.session.READ,
  });
  try {
    // executeRead pins this to a read transaction — the snapshot job must
    // never be able to mutate the production graph.
    const result = await session.executeRead((tx) =>
      tx.run(`
        MATCH (:Artist)-[:SPECIALIZES_IN]->(s:Style)
        WHERE s.name IS NOT NULL
        RETURN s.name AS name, count(*) AS artists
        ORDER BY name
      `),
    );
    return result.records.map((r) => ({
      name: r.get('name'),
      artists: r.get('artists').toNumber ? r.get('artists').toNumber() : Number(r.get('artists')),
    }));
  } finally {
    await session.close();
    await driver.close();
  }
}

function buildSnapshot(rows, lookup) {
  const unresolved = [];
  // Several graph spellings can collapse onto one ontology tag (e.g. a future
  // "Japanese" and today's "Japanese (Irezumi)"); keep every spelling so the
  // match query can compare against all of them.
  const byTag = new Map();

  for (const { name, artists } of rows) {
    const tag = lookup.get(normalizeTerm(name));
    if (!tag) {
      unresolved.push(name);
      continue;
    }
    const entry = byTag.get(tag) ?? { tag, graphNames: [], artists: 0 };
    if (!entry.graphNames.includes(name)) entry.graphNames.push(name);
    entry.artists += artists;
    byTag.set(tag, entry);
  }

  const styles = [...byTag.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  return { styles, unresolved };
}

async function main() {
  const check = process.argv.includes('--check');
  const ontology = JSON.parse(readFileSync(ONTOLOGY_PATH, 'utf8'));
  const lookup = buildLookup(ontology);

  const rows = await readMatchableStyles();
  const { styles, unresolved } = buildSnapshot(rows, lookup);

  if (unresolved.length > 0) {
    console.warn(
      `[sync-graph-style-vocabulary] ${unresolved.length} graph style name(s) are not in the ontology ` +
        `and were skipped: ${unresolved.join(', ')}\n` +
        '  Run `node scripts/extract-style-ontology.mjs` to queue them for human approval (ADR-0011).',
    );
  }
  if (styles.length === 0) {
    throw new Error('Refusing to write an empty snapshot — the graph returned no matchable styles');
  }

  const snapshot = {
    source: 'neo4j:SPECIALIZES_IN',
    generated: new Date().toISOString().slice(0, 10),
    ontologyVersion: ontology.version,
    styles,
  };
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;

  if (check) {
    const current = readFileSync(SNAPSHOT_PATH, 'utf8');
    // `generated` is a timestamp, not vocabulary — compare the styles only.
    const stale = JSON.stringify(JSON.parse(current).styles) !== JSON.stringify(styles);
    if (stale) {
      console.error(
        '[sync-graph-style-vocabulary] data/graph-style-vocabulary.json is stale — re-run without --check',
      );
      process.exit(1);
    }
    console.log('[sync-graph-style-vocabulary] snapshot is current');
    return;
  }

  writeFileSync(SNAPSHOT_PATH, serialized);
  const total = styles.reduce((n, s) => n + s.artists, 0);
  console.log(
    `[sync-graph-style-vocabulary] wrote ${styles.length} matchable styles (${total} artist links) to data/graph-style-vocabulary.json`,
  );
}

main().catch((err) => {
  console.error(`[sync-graph-style-vocabulary] ${err.message}`);
  process.exit(1);
});
