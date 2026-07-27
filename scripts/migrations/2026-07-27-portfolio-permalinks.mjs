/**
 * TAT-40 — write recovered Instagram post permalinks onto :Artist nodes.
 *
 * Adds ONE new property, additively:
 *
 *   a.portfolioPermalinks — string[] aligned index-for-index with
 *   a.portfolioImages; empty string where no permalink was recovered
 *   (Neo4j arrays cannot hold nulls). Artists with zero recovered
 *   permalinks are left untouched (property absent = none recovered).
 *
 * No existing property is modified or deleted. The profile embed tier reads
 * portfolioPermalinks only when ENABLE_IG_EMBEDS=true and otherwise
 * degrades to an empty embed list.
 *
 * Input: the derived-permalink map produced by
 *   node scripts/derive-portfolio-permalinks.mjs
 * (disk-only derivation from the scraper's archived Apify profiles — see
 * scripts/lib/instagram-permalinks.mjs for how a permalink is derived and
 * why the hosted GCS filename index, not array position, is the join key).
 *
 * Idempotent: recomputes every artist's array and skips nodes whose stored
 * portfolioPermalinks already match; re-running after a partial failure
 * only writes the remainder.
 *
 * Usage:
 *   node scripts/migrations/2026-07-27-portfolio-permalinks.mjs           # dry run (default)
 *   node scripts/migrations/2026-07-27-portfolio-permalinks.mjs --apply   # writes
 *   ... [--input data/portfolio-permalinks.json]
 *
 * Dry run is read-only and prints the exact coverage it would write.
 */

import path from 'path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import { alignPermalinks } from '../lib/instagram-permalinks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const APPLY = process.argv.includes('--apply');
const BATCH_SIZE = 500;

function inputPath() {
  const i = process.argv.indexOf('--input');
  return path.resolve(ROOT, i !== -1 ? process.argv[i + 1] : 'data/portfolio-permalinks.json');
}

async function main() {
  const { default: neo4j } = await import('neo4j-driver');
  const { default: dotenv } = await import('dotenv');
  dotenv.config({ path: path.join(ROOT, '.env.local'), quiet: true });

  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;
  if (!uri || !user || !password) throw new Error('NEO4J_* credentials missing from .env.local');

  const derivedFile = inputPath();
  let derived;
  try {
    derived = JSON.parse(await readFile(derivedFile, 'utf8'));
  } catch (err) {
    throw new Error(
      `Cannot read ${derivedFile} (${err.message}). ` +
        'Run: node scripts/derive-portfolio-permalinks.mjs',
    );
  }
  const archive = derived.artists || {};
  console.log(APPLY ? '=== APPLYING ===' : '=== DRY RUN (no writes) ===');
  console.log(`derived map: ${derivedFile} (generated ${derived.generatedAt}, ${Object.keys(archive).length} artists)`);

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), { connectionTimeout: 15000 });
  const session = driver.session({ database: process.env.NEO4J_DATABASE || undefined });
  const num = (v) => (v && v.toNumber ? v.toNumber() : Number(v));

  try {
    const result = await session.executeRead((tx) =>
      tx.run(`
        MATCH (a:Artist)
        WHERE a.portfolioImages IS NOT NULL AND size(a.portfolioImages) > 0
        RETURN a.id AS id, a.portfolioImages AS images, a.portfolioPermalinks AS existing
      `),
    );

    const stats = {
      hostedArtists: 0,
      hostedImages: 0,
      imagesWithPermalink: 0,
      artistsFull: 0,
      artistsPartial: 0,
      artistsNone: 0,
      artistsNotInArchive: 0,
      alreadyCurrent: 0, // stored array already matches — skipped (idempotency)
      toWrite: 0,
    };
    const writes = [];

    for (const record of result.records) {
      const id = record.get('id');
      const images = record.get('images');
      const existing = record.get('existing');
      stats.hostedArtists++;
      stats.hostedImages += images.length;

      if (!(id in archive)) stats.artistsNotInArchive++;
      const aligned = alignPermalinks(images, archive[id]);
      const recovered = aligned.filter(Boolean).length;
      stats.imagesWithPermalink += recovered;
      if (recovered === images.length) stats.artistsFull++;
      else if (recovered > 0) stats.artistsPartial++;
      else stats.artistsNone++;

      if (recovered === 0) continue; // leave the property absent — nothing recovered
      if (Array.isArray(existing) && JSON.stringify(existing) === JSON.stringify(aligned)) {
        stats.alreadyCurrent++;
        continue;
      }
      writes.push({ id, permalinks: aligned });
    }
    stats.toWrite = writes.length;

    const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a');
    console.log('\n─── hosted-image coverage ───');
    console.log(`  artists with portfolioImages: ${stats.hostedArtists}`);
    console.log(`  hosted images:                ${stats.hostedImages}`);
    console.log(`  images with a permalink:      ${stats.imagesWithPermalink} (${pct(stats.imagesWithPermalink, stats.hostedImages)})`);
    console.log(`  artists fully covered:        ${stats.artistsFull}`);
    console.log(`  artists partially covered:    ${stats.artistsPartial}`);
    console.log(`  artists with none:            ${stats.artistsNone}`);
    console.log(`  hosted artists absent from archive: ${stats.artistsNotInArchive}`);
    console.log('\n─── writes ───');
    console.log(`  already current (skipped):    ${stats.alreadyCurrent}`);
    console.log(`  ${APPLY ? 'writing' : 'WOULD write'} portfolioPermalinks on: ${stats.toWrite} artist(s)`);

    if (!APPLY) {
      console.log('\nRe-run with --apply to write.');
      return;
    }

    let written = 0;
    for (let i = 0; i < writes.length; i += BATCH_SIZE) {
      const batch = writes.slice(i, i + BATCH_SIZE);
      const res = await session.executeWrite((tx) =>
        tx.run(
          `
          UNWIND $rows AS row
          MATCH (a:Artist {id: row.id})
          SET a.portfolioPermalinks = row.permalinks
          RETURN count(a) AS n
          `,
          { rows: batch },
        ),
      );
      written += num(res.records[0].get('n'));
      console.log(`  batch ${Math.floor(i / BATCH_SIZE) + 1}: ${written}/${writes.length}`);
    }

    const verify = await session.executeRead((tx) =>
      tx.run(`
        MATCH (a:Artist)
        WHERE a.portfolioPermalinks IS NOT NULL
        RETURN count(a) AS artists,
               sum(size([p IN a.portfolioPermalinks WHERE p <> ''])) AS permalinks,
               sum(CASE WHEN size(a.portfolioPermalinks) <> size(a.portfolioImages) THEN 1 ELSE 0 END) AS misaligned
      `),
    );
    const v = verify.records[0];
    console.log('\n─── post-apply verification ───');
    console.log(`  artists with portfolioPermalinks: ${num(v.get('artists'))}`);
    console.log(`  non-empty permalink entries:      ${num(v.get('permalinks'))}`);
    console.log(`  length-misaligned arrays:         ${num(v.get('misaligned'))} (must be 0)`);
  } finally {
    await session.close();
    await driver.close();
  }
}

main().catch((err) => {
  console.error(`[portfolio-permalinks] ${err.message}`);
  process.exit(1);
});
