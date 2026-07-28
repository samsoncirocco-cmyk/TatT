/**
 * Re-harvest candidate style tags and queue unknowns for human review.
 *
 * Sources:
 *  - src/config/modelRoutingRules.js  (STYLE_MODEL_MAPPING keys)
 *  - Neo4j (read-only: Style node names + Artist.styles values); skipped
 *    gracefully when unreachable or unconfigured.
 *
 * Any harvested term not already in data/style-ontology.json (by id or alias)
 * is written to data/ontology-proposals.json as a pending proposal. This
 * script NEVER writes to the ontology itself — growth is human-approved via
 * propose-ontology-candidates.mjs (ADR-0011).
 *
 * Usage: node scripts/extract-style-ontology.mjs
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { STYLE_MODEL_MAPPING } from '../src/config/modelRoutingRules.js';
import {
  buildLookup,
  collectCandidates,
  loadJson,
  saveJson,
  updateProposals,
} from './lib/ontology.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ONTOLOGY_PATH = path.join(ROOT, 'data', 'style-ontology.json');
const PROPOSALS_PATH = path.join(ROOT, 'data', 'ontology-proposals.json');

/** Harvest style terms from in-repo sources. Pure file reads, no network. */
export function harvestRepoSources() {
  const mappingKeys = Object.keys(STYLE_MODEL_MAPPING).filter((k) => k !== 'default');
  return [
    { source: 'repo:src/config/modelRoutingRules.js', terms: mappingKeys },
  ];
}

/**
 * Read-only Neo4j harvest of distinct style values. Returns [] (with a
 * warning) when credentials are missing or the instance is unreachable.
 */
async function harvestNeo4j() {
  let neo4j;
  let dotenv;
  try {
    ({ default: neo4j } = await import('neo4j-driver'));
    ({ default: dotenv } = await import('dotenv'));
  } catch {
    console.warn('[extract-style-ontology] neo4j-driver/dotenv unavailable — skipping Neo4j harvest');
    return [];
  }
  dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true });
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !user || !password) {
    console.warn('[extract-style-ontology] Neo4j credentials not set — skipping Neo4j harvest');
    return [];
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), { connectionTimeout: 15000 });
  const database = process.env.NEO4J_DATABASE || undefined;
  const session = driver.session(database ? { database } : undefined);
  try {
    const terms = [];
    const styleNodes = await session.run(
      'MATCH (s:Style) WHERE s.name IS NOT NULL RETURN DISTINCT s.name AS name',
    );
    const artistStyles = await session.run(
      'MATCH (a:Artist) WHERE a.styles IS NOT NULL UNWIND a.styles AS s RETURN DISTINCT s AS name',
    );
    for (const record of [...styleNodes.records, ...artistStyles.records]) {
      const name = record.get('name');
      if (typeof name === 'string') terms.push(name);
    }
    return terms;
  } catch (err) {
    console.warn(`[extract-style-ontology] Neo4j harvest failed (${err.message}) — skipping`);
    return [];
  } finally {
    await session.close();
    await driver.close();
  }
}

async function main() {
  const ontology = loadJson(ONTOLOGY_PATH);
  const proposals = loadJson(PROPOSALS_PATH, []);
  const lookup = buildLookup(ontology);

  const sources = harvestRepoSources();
  const neo4jTerms = await harvestNeo4j();
  if (neo4jTerms.length > 0) {
    sources.push({ source: 'neo4j', terms: neo4jTerms });
  }

  const candidates = collectCandidates(sources);
  const known = candidates.filter((c) => lookup.has(c.normalized));
  const next = updateProposals(proposals, candidates, lookup);
  const newlyQueued = next.length - proposals.length;

  saveJson(PROPOSALS_PATH, next);

  const pending = next.filter((p) => p.status === 'pending').length;
  console.log(`Harvested ${candidates.length} distinct terms (${known.length} already in ontology).`);
  console.log(`Queued ${newlyQueued} new proposal(s); ${pending} pending total.`);
  if (pending > 0) {
    console.log('Review with: node scripts/propose-ontology-candidates.mjs --list');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`[extract-style-ontology] ${err.message}`);
    process.exit(1);
  });
}
