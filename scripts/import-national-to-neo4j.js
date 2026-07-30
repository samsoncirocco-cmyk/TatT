/**
 * Import the national artist dataset (data/national-artists-*.json) into Neo4j.
 *
 * Schema:
 *   (Artist {id, name, city, state, instagram, instagramUrl, rating, reviewCount,
 *            bio, lat, lng, portfolioImages, portfolioImageCount, portfolioSource})
 *   (Shop   {placeId, name, address, city, state, lat, lng, rating, reviewCount, website})
 *   (City   {name, state})
 *   (Style  {name})
 *   (Tag    {name})
 *   (Artist)-[:WORKS_AT]->(Shop)         matched on shopName + city + state
 *   (Artist)-[:LOCATED_IN]->(City)
 *   (Shop)-[:LOCATED_IN]->(City)
 *   (Artist)-[:SPECIALIZES_IN]->(Style)
 *   (Artist)-[:TAGGED_WITH]->(Tag)
 *
 * portfolioImages currently come from the artist's or shop's own website (the
 * scraper's HTML crawl), NOT from Instagram posts — portfolioSource records
 * that provenance explicitly so it's never confused with a future Instagram
 * post-scraping step (that's separate, unbuilt work; see TAT-41). instagramUrl
 * is the artist's real Instagram profile permalink, derived from the existing
 * `instagram` handle.
 *
 * SAFETY: dry run by default — always prints what it *would* do and changes
 * nothing until you pass --apply. Artists that have been claimed
 * (claimedByUid), created by the artist (selfRegistered), taken down
 * (removedAt), tombstoned (:TakedownTombstone — see docs/adr/0025), or have a
 * pending takedown request (:TakedownRequest {status:'pending'}) are always
 * excluded from the write, regardless of --apply. The write query repeats
 * those guards so a profile protected during a long import is not overwritten.
 *
 * Usage:
 *   node scripts/import-national-to-neo4j.js --limit 50        # dry run, small slice
 *   node scripts/import-national-to-neo4j.js                   # dry run, full dataset
 *   node scripts/import-national-to-neo4j.js --apply            # actually write
 *   node scripts/import-national-to-neo4j.js --input data/final.json
 *
 * There is deliberately no wipe option. The graph also contains claims,
 * takedowns, and payment state that a dataset refresh must never delete.
 *
 * Requires NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD in .env (Aura: neo4j+s://...).
 */

import neo4j from 'neo4j-driver';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';
import {
  loadTombstoneGate,
  TOMBSTONE_KEYS_CYPHER,
} from './lib/takedown-tombstone.mjs';
import {
  NATIONAL_ARTIST_IMPORT_CYPHER,
  NATIONAL_SHOP_IMPORT_CYPHER,
  parseNationalImportArgs,
  partitionProtectedNationalArtists,
  prepareNationalArtist,
} from './lib/national-artist-import.mjs';

dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const {
  NEO4J_URI,
  NEO4J_USERNAME,
  NEO4J_USER = 'neo4j',
  NEO4J_PASSWORD,
  NEO4J_DATABASE,
} = process.env;
if (!NEO4J_URI || !NEO4J_PASSWORD) {
  console.error('❌ NEO4J_URI and NEO4J_PASSWORD must be set in .env');
  process.exit(1);
}

const options = parseNationalImportArgs(process.argv.slice(2));
const BATCH = 500;

const inputPath = resolve(process.cwd(), options.input);
const data = JSON.parse(readFileSync(inputPath, 'utf8'));
if (!Array.isArray(data.artists) || !Array.isArray(data.shops)) {
  throw new Error(`${inputPath} must contain artists and shops arrays`);
}

const rawArtists = data.artists
  .slice(0, options.limit)
  .map(prepareNationalArtist);

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USERNAME || NEO4J_USER, NEO4J_PASSWORD),
);

async function run(cypher, params) {
  const session = driver.session(
    NEO4J_DATABASE ? { database: NEO4J_DATABASE } : undefined,
  );
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

async function inBatches(items, label, cypher, countKey = null) {
  let written = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    const result = await run(cypher, { rows: items.slice(i, i + BATCH) });
    if (countKey && result.records[0]) {
      written += result.records[0].get(countKey).toNumber();
    }
    process.stdout.write(`\r  ${label}: ${Math.min(i + BATCH, items.length)}/${items.length}`);
  }
  console.log();
  return written;
}

/**
 * Everything a re-import must never touch. Five independent checks, one per
 * way an artist can have left "plain scraped data" behind them.
 */
async function findProtectedArtists() {
  const [flags, pendingRequest, tombstoneGate] = await Promise.all([
    run(
      `MATCH (a:Artist)
       WHERE a.removedAt IS NOT NULL
          OR a.claimedByUid IS NOT NULL
          OR coalesce(a.selfRegistered, false) = true
       RETURN a.id AS id,
              a.removedAt IS NOT NULL AS removed,
              a.claimedByUid IS NOT NULL AS claimed,
              coalesce(a.selfRegistered, false) AS selfRegistered`,
      {},
    ),
    run(
      `MATCH (r:TakedownRequest {status: 'pending'})
       WHERE r.artistId IS NOT NULL
       RETURN collect(DISTINCT r.artistId) AS ids`,
      {},
    ),
    loadTombstoneGate(async () => {
      const result = await run(TOMBSTONE_KEYS_CYPHER, {});
      return result.records.map((record) => record.get('key')).filter(Boolean);
    }),
  ]);

  const removedIds = new Set();
  const claimedIds = new Set();
  const selfRegisteredIds = new Set();
  for (const rec of flags.records) {
    if (rec.get('removed')) removedIds.add(rec.get('id'));
    if (rec.get('claimed')) claimedIds.add(rec.get('id'));
    if (rec.get('selfRegistered')) selfRegisteredIds.add(rec.get('id'));
  }
  const pendingRequestIds = new Set(pendingRequest.records[0].get('ids'));
  return {
    removedIds,
    claimedIds,
    selfRegisteredIds,
    pendingRequestIds,
    tombstoneGate,
  };
}

const t0 = Date.now();
console.log(`Checking Neo4j for protected artists → ${NEO4J_URI}`);
const protectedArtists = await findProtectedArtists();

const { allowed: artists, counts: skipCounts } =
  partitionProtectedNationalArtists(rawArtists, protectedArtists);

const shopKeys = new Set(artists.map((a) => `${a.shopName}|${a.city}|${a.state}`));
// Import shops referenced by the artist slice, plus (on full runs) the rest.
const shops = Number.isFinite(options.limit)
  ? data.shops.filter((s) => shopKeys.has(`${s.shopName}|${s.city}|${s.state}`))
  : data.shops;

console.log(`Input: ${inputPath}`);
console.log(`\nImport candidates: ${artists.length} artists, ${shops.length} shops`);
console.log(
  `Protected — never written: ${skipCounts.removed} removed, ${skipCounts.claimed} claimed, ` +
    `${skipCounts.selfRegistered} self-registered, ${skipCounts.pendingRequest} pending takedown request, ` +
    `${skipCounts.tombstoned} tombstoned`,
);

if (!options.apply) {
  console.log('\nDRY RUN — nothing was written. Pass --apply to write to Neo4j.');
  await driver.close();
  process.exit(0);
}

// Constraints (idempotent) — also give us index-backed MERGEs
for (const c of [
  'CREATE CONSTRAINT artist_id IF NOT EXISTS FOR (a:Artist) REQUIRE a.id IS UNIQUE',
  'CREATE CONSTRAINT shop_place_id IF NOT EXISTS FOR (s:Shop) REQUIRE s.placeId IS UNIQUE',
  'CREATE CONSTRAINT city_key IF NOT EXISTS FOR (c:City) REQUIRE (c.name, c.state) IS UNIQUE',
  'CREATE CONSTRAINT style_name IF NOT EXISTS FOR (s:Style) REQUIRE s.name IS UNIQUE',
  'CREATE CONSTRAINT tag_name IF NOT EXISTS FOR (t:Tag) REQUIRE t.name IS UNIQUE',
])
  await run(c);

const shopsWritten = await inBatches(
  shops,
  'shops',
  NATIONAL_SHOP_IMPORT_CYPHER,
  'written',
);

const artistsWritten = await inBatches(
  artists,
  'artists',
  NATIONAL_ARTIST_IMPORT_CYPHER,
  'written',
);

console.log(
  `Applied: ${artistsWritten}/${artists.length} artists and ${shopsWritten}/${shops.length} shops. ` +
    `${artists.length - artistsWritten} artist candidates were protected at write time.`,
);

// Verify: report what actually landed
const counts = await run(`
  CALL () { MATCH (a:Artist) RETURN count(a) AS artists }
  CALL () { MATCH (s:Shop) RETURN count(s) AS shops }
  CALL () { MATCH (c:City) RETURN count(c) AS cities }
  CALL () { MATCH (st:Style) RETURN count(st) AS styles }
  CALL () { MATCH ()-[r:WORKS_AT]->() RETURN count(r) AS worksAt }
  CALL () { MATCH ()-[r:SPECIALIZES_IN]->() RETURN count(r) AS specializes }
  RETURN artists, shops, cities, styles, worksAt, specializes
`);
const rec = counts.records[0];
console.log('\nGraph now contains:');
for (const k of rec.keys) console.log(`  ${k}: ${rec.get(k).toNumber()}`);
console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

await driver.close();
