/**
 * link-artist-styles.mjs — the missing write path: take a style artifact and
 * MERGE (Artist)-[:SPECIALIZES_IN]->(Style) into the live Neo4j graph.
 *
 * Standalone, idempotent, DRY-RUN BY DEFAULT. NOT deployed app code — an
 * operator tool run by hand against the live graph, in the same spirit as
 * scripts/host-artist-images.mjs and scripts/import-to-neo4j.js.
 *
 * ── Why this script exists ─────────────────────────────────────────────────
 * Enrichment used to end at a JSON file on disk. Nothing read it, so a perfect
 * enrichment run changed nothing a user saw. `/api/v1/match/semantic` reads
 * artist styles from (Artist)-[:SPECIALIZES_IN]->(Style) and uses them as a
 * HARD FILTER, so that relationship is the only thing that makes enrichment
 * reach the product.
 *
 * ── Why dry-run is the default (the opposite of host-artist-images.mjs) ─────
 * That script writes an artist property it owns end-to-end. This one adds edges
 * to the graph's matching filter: a wrong edge surfaces the wrong artist to a
 * real user, and edges are harder to eyeball afterwards than an image array.
 * So the safe mode is the default and mutation costs an explicit --execute.
 *
 * ── Idempotency ────────────────────────────────────────────────────────────
 *   MERGE (s:Style {name})            — never a duplicate Style node
 *   MERGE (a)-[r:SPECIALIZES_IN]->(s) — never a duplicate edge
 *   ON CREATE SET r.source, r.createdAt
 * ON CREATE (not SET) matters twice over: a re-run is a true no-op, and an edge
 * that was already in the graph from the seed import is never relabelled as if
 * this script had produced it. `source` also makes the write reversible:
 *   MATCH ()-[r:SPECIALIZES_IN {source:'instagram-bio'}]->() DELETE r
 *
 * Only SPECIALIZES_IN is written. import-to-neo4j.js also mirrors seed styles
 * onto (Shop)-[:FEATURES_STYLE]->(Style), but the match filter does not read
 * that edge, and mirroring would require every artist to have a Shop. Out of
 * scope on purpose.
 *
 * ── Input ──────────────────────────────────────────────────────────────────
 * A style artifact — scripts/harvest-ig-styles.mjs output, or anything shaped
 *   { "artists": [ { "artistId": "artist_x", "styles": ["Fine Line", …] } ] }
 * Off-vocabulary style names are dropped (see scripts/lib/artist-styles.mjs);
 * the graph filter is exact-name, so a tag outside CANONICAL_STYLE_NAMES is
 * unreachable from the UI and would only add noise.
 *
 * ── Credentials ────────────────────────────────────────────────────────────
 * NEO4J_URI, NEO4J_USERNAME/NEO4J_USER, NEO4J_PASSWORD, NEO4J_DATABASE
 * (.env then .env.local, matching import-to-neo4j.js).
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *   node scripts/link-artist-styles.mjs --input data/enrichment/ig-artist-styles.json
 *      ↑ dry run: reads the graph, writes nothing, prints the full plan
 *
 *   node scripts/link-artist-styles.mjs --input data/enrichment/ig-artist-styles.json --execute
 *      ↑ the only form that mutates the graph
 *
 * Flags:
 *   --input <file>    style artifact (required)
 *   --execute         actually write. Without it the script CANNOT mutate.
 *   --limit <n>       consider at most n artist records (sorted; for a pilot)
 *   --source <name>   value for r.source on created edges (default: instagram-bio)
 *   --batch-size <n>  rows per Cypher round trip (default: 500)
 *   --sample <n>      plan rows to print (default: 15)
 */

import { readFile } from 'node:fs/promises';
import { config } from 'dotenv';

import { normalizeStyleRecord, toStylePairs, resolveOntologyLabel } from './lib/artist-styles.mjs';

config();
config({ path: '.env.local', override: true });

const DEFAULT_SOURCE = 'instagram-bio';
const DEFAULT_BATCH_SIZE = 500;
const DEFAULT_SAMPLE = 15;

// ─── Pure helpers (unit-tested; no I/O, no driver) ─────────────────────────

/**
 * Minimal flag parser. `execute` defaults to FALSE — the dry-run guarantee is
 * a property of this function, and the test suite asserts it directly.
 */
export function parseArgs(argv) {
  const opts = {
    input: null,
    execute: false,
    limit: Infinity,
    source: DEFAULT_SOURCE,
    batchSize: DEFAULT_BATCH_SIZE,
    sample: DEFAULT_SAMPLE,
  };
  for (let i = 0; i < argv.length; i++) {
    const next = () => argv[++i];
    switch (argv[i]) {
      case '--input': opts.input = next(); break;
      case '--execute': opts.execute = true; break;
      case '--limit': opts.limit = Math.max(0, Math.trunc(Number(next())) || 0); break;
      case '--source': opts.source = next(); break;
      case '--batch-size': opts.batchSize = Math.max(1, Math.trunc(Number(next())) || DEFAULT_BATCH_SIZE); break;
      case '--sample': opts.sample = Math.max(0, Math.trunc(Number(next())) || 0); break;
      default: break;
    }
  }
  return opts;
}

/** Pull the artist rows out of an artifact, tolerating a bare array. */
export function recordsFromArtifact(artifact) {
  const rows = Array.isArray(artifact) ? artifact : artifact?.artists;
  if (!Array.isArray(rows)) return [];
  return rows.map(normalizeStyleRecord).filter(Boolean);
}

/**
 * Read-only probe: for every (artistId, style) pair, does the Artist exist and
 * is the edge already there? This is what makes the dry run honest — the plan
 * is computed against the real graph, not guessed.
 */
export function buildPlanProbe(pairs) {
  const query = `
    UNWIND $rows AS row
    OPTIONAL MATCH (a:Artist {id: row.artistId})
    OPTIONAL MATCH (a)-[rel:SPECIALIZES_IN]->(:Style {name: row.style})
    RETURN row.artistId AS artistId,
           row.style AS style,
           a IS NOT NULL AS artistExists,
           rel IS NOT NULL AS linkExists
  `;
  return { query, params: { rows: pairs } };
}

/** Read-only probe: which of the artifact's style names already have a node. */
export function buildStyleProbe(styleNames) {
  const query = `
    UNWIND $names AS name
    OPTIONAL MATCH (s:Style {name: name})
    RETURN name AS name, s IS NOT NULL AS exists
  `;
  return { query, params: { names: styleNames } };
}

/** Read-only probe: artists carrying at least one style, for before/after. */
export function buildCoverageProbe() {
  return {
    query: `
      MATCH (a:Artist)
      RETURN count(a) AS artists,
             count(CASE WHEN (a)-[:SPECIALIZES_IN]->(:Style) THEN 1 END) AS styled
    `,
    params: {},
  };
}

/**
 * The one mutating statement. MERGE + ON CREATE SET is the whole idempotency
 * guarantee: re-running creates nothing and relabels nothing.
 */
export function buildStyleLinkWrite(pairs, source, createdAt) {
  const query = `
    UNWIND $rows AS row
    MATCH (a:Artist {id: row.artistId})
    MERGE (s:Style {name: row.style})
    MERGE (a)-[rel:SPECIALIZES_IN]->(s)
    ON CREATE SET rel.source = $source, rel.createdAt = $createdAt
    RETURN count(rel) AS touched
  `;
  return { query, params: { rows: pairs, source, createdAt } };
}

/**
 * Fold probe rows into the plan the dry run prints. Everything the operator
 * needs to decide, and the same numbers --execute will act on.
 */
export function summarizePlan(probeRows) {
  const missingArtists = new Set();
  const matchedArtists = new Set();
  const gainingArtists = new Set();
  const toCreate = [];
  let alreadyLinked = 0;

  for (const row of probeRows) {
    if (!row.artistExists) {
      missingArtists.add(row.artistId);
      continue;
    }
    matchedArtists.add(row.artistId);
    if (row.linkExists) {
      alreadyLinked += 1;
    } else {
      toCreate.push({ artistId: row.artistId, style: row.style });
      gainingArtists.add(row.artistId);
    }
  }

  const byStyle = {};
  for (const p of toCreate) byStyle[p.style] = (byStyle[p.style] || 0) + 1;

  return {
    pairs: probeRows.length,
    matchedArtists: matchedArtists.size,
    missingArtists: [...missingArtists].sort(),
    alreadyLinked,
    toCreate,
    gainingArtists: gainingArtists.size,
    createdByStyle: byStyle,
  };
}

/** Split rows into fixed-size batches for the Cypher round trips. */
export function chunk(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

// ─── I/O ───────────────────────────────────────────────────────────────────

const toNum = (neo4j, v) => (neo4j.isInt(v) ? v.toNumber() : v);

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.input) {
    console.error('ERROR: --input <file> is required (a style artifact, e.g. from harvest-ig-styles.mjs).');
    process.exit(1);
  }

  const artifact = JSON.parse(await readFile(opts.input, 'utf8'));
  const allRecords = recordsFromArtifact(artifact);
  const records = allRecords.slice(0, opts.limit);
  const pairs = toStylePairs(records);
  const styleNames = [...new Set(pairs.map((p) => p.style))].sort();

  console.log('link-artist-styles');
  console.log(`  input:       ${opts.input}`);
  console.log(`  artifact src:${artifact?.source ?? '(unknown)'}  generated ${artifact?.generatedAt ?? '(unknown)'}`);
  console.log(`  mode:        ${opts.execute ? '*** EXECUTE — WILL WRITE TO NEO4J ***' : 'DRY RUN (default) — no writes'}`);
  console.log(`  source tag:  ${opts.source}`);
  console.log(`  records:     ${records.length}${allRecords.length !== records.length ? ` (of ${allRecords.length}, --limit)` : ''}`);
  console.log(`  pairs:       ${pairs.length}`);

  if (pairs.length === 0) {
    console.log('\nNothing to do.');
    return;
  }

  if (!process.env.NEO4J_PASSWORD) {
    console.error('\nERROR: NEO4J_PASSWORD is not set — cannot read the graph to build a plan.');
    console.error('Set NEO4J_URI / NEO4J_USERNAME / NEO4J_PASSWORD in .env.local.');
    process.exit(1);
  }

  const neo4j = (await import('neo4j-driver')).default;
  const driver = neo4j.driver(
    process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USERNAME || process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
  );
  const session = driver.session(process.env.NEO4J_DATABASE ? { database: process.env.NEO4J_DATABASE } : undefined);
  const read = async ({ query, params }) =>
    (await session.executeRead((tx) => tx.run(query, params))).records.map((r) => {
      const o = r.toObject();
      for (const k of Object.keys(o)) o[k] = toNum(neo4j, o[k]);
      return o;
    });

  try {
    // ── Plan (always, in both modes) ────────────────────────────────────────
    const before = (await read(buildCoverageProbe()))[0];
    const probeRows = [];
    for (const batch of chunk(pairs, opts.batchSize)) probeRows.push(...(await read(buildPlanProbe(batch))));
    const plan = summarizePlan(probeRows);
    const styleRows = await read(buildStyleProbe(styleNames));
    const newStyleNodes = styleRows.filter((r) => !r.exists).map((r) => r.name);

    console.log('\n─── plan ───');
    console.log(`  graph today:            ${before.styled} / ${before.artists} artists carry >=1 style`);
    console.log(`  artists matched by id:  ${plan.matchedArtists} / ${records.length} (${((plan.matchedArtists / records.length) * 100).toFixed(1)}%)`);
    console.log(`  artists NOT found:      ${plan.missingArtists.length}`);
    if (plan.missingArtists.length > 0) {
      console.log(`    e.g. ${plan.missingArtists.slice(0, 10).join(', ')}`);
    }
    console.log(`  pairs already linked:   ${plan.alreadyLinked}  (no-op — re-run safe)`);
    console.log(`  pairs WOULD create:     ${plan.toCreate.length}`);
    console.log(`  artists gaining a style:${plan.gainingArtists}`);
    console.log(`  Style nodes WOULD create: ${newStyleNodes.length ? newStyleNodes.join(', ') : 'none'}`);
    console.log('  new edges by style:');
    for (const [style, n] of Object.entries(plan.createdByStyle).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(5)}  ${style}`);
    }
    if (opts.sample > 0 && plan.toCreate.length > 0) {
      console.log(`  sample of edges to create (first ${Math.min(opts.sample, plan.toCreate.length)}):`);
      for (const p of plan.toCreate.slice(0, opts.sample)) {
        console.log(`    (${p.artistId})-[:SPECIALIZES_IN]->(:Style {name: ${JSON.stringify(p.style)}})`);
      }
    }

    // Vocabulary sanity: by this point every name is a GRAPH spelling produced
    // by toStylePairs, so anything that no longer resolves through the ontology
    // means the two data files drifted from what was written.
    const offVocab = styleNames.filter((s) => !resolveOntologyLabel(s));
    if (offVocab.length > 0) console.log(`  ⚠ off-vocabulary styles survived normalization: ${offVocab.join(', ')}`);

    // The invariant the vocabulary rebase exists to protect: this import adds
    // artists to Style nodes that already exist, and never mints a new one.
    if (newStyleNodes.length > 0) {
      console.log(`\n  ⚠ WOULD CREATE ${newStyleNodes.length} NEW Style node(s): ${newStyleNodes.join(', ')}`);
      console.log('    A new Style node re-splits the controlled vocabulary (data/style-ontology.json).');
      console.log('    Re-check the tag → graph-name mapping in scripts/lib/artist-styles.mjs before executing.');
    }

    if (!opts.execute) {
      console.log('\n─── DRY RUN — nothing was written ───');
      console.log('  To apply this exact plan, re-run with --execute:');
      console.log(`    node scripts/link-artist-styles.mjs --input ${opts.input} --execute`);
      console.log(`  To undo afterwards:`);
      console.log(`    MATCH ()-[r:SPECIALIZES_IN {source:'${opts.source}'}]->() DELETE r`);
      return;
    }

    // ── Execute ─────────────────────────────────────────────────────────────
    const createdAt = Date.now();
    console.log('\n─── EXECUTING ───');
    let touched = 0;
    const batches = chunk(pairs, opts.batchSize);
    for (let i = 0; i < batches.length; i++) {
      const { query, params } = buildStyleLinkWrite(batches[i], opts.source, createdAt);
      const res = await session.executeWrite((tx) => tx.run(query, params));
      touched += res.records.length > 0 ? toNum(neo4j, res.records[0].get('touched')) : 0;
      console.log(`  ✓ batch ${i + 1}/${batches.length} — ${touched}/${pairs.length} pairs merged`);
    }

    const after = (await read(buildCoverageProbe()))[0];
    console.log('\n─── result ───');
    console.log(`  pairs merged:  ${touched}`);
    console.log(`  coverage:      ${before.styled} → ${after.styled} of ${after.artists} artists (+${after.styled - before.styled})`);
    console.log(`  undo:          MATCH ()-[r:SPECIALIZES_IN {source:'${opts.source}'}]->() DELETE r`);
  } finally {
    await session.close();
    await driver.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}
