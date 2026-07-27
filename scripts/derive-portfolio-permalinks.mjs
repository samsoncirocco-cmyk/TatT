/**
 * derive-portfolio-permalinks.mjs — TAT-40: derive Instagram post permalinks
 * for hosted portfolio images from the scraper's ARCHIVED Apify profiles.
 *
 * Disk-only. No network calls, no scraping, no database access. The archive
 * (one JSON file per artist) retains cdninstagram source URLs whose
 * `ig_cache_key` param encodes the post's media ID; the shortcode — and so
 * https://www.instagram.com/p/<shortcode>/ — is mechanically derivable.
 * See scripts/lib/instagram-permalinks.mjs for the derivation itself.
 *
 * Output: a JSON map consumed by the graph migration
 * (scripts/migrations/2026-07-27-portfolio-permalinks.mjs):
 *   {
 *     generatedAt: "<ISO>",
 *     input: "<archive dir>",
 *     stats: { ...coverage counts... },
 *     artists: {
 *       "<artistId>": ["https://www.instagram.com/p/…/", null, …]
 *       // one entry per FILTERED archive image index — the same index the
 *       // uploader embedded in the hosted GCS filename; null = unrecoverable
 *     }
 *   }
 *
 * The output file is intentionally NOT committed (see .gitignore) — it is an
 * intermediate artifact, regenerable from the archive at any time.
 *
 * Usage:
 *   node scripts/derive-portfolio-permalinks.mjs \
 *     --input ~/tatt-scraper/data/enrichment/instagram/apify-profiles \
 *     --output data/portfolio-permalinks.json
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { derivePermalinksForImages } from './lib/instagram-permalinks.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_INPUT = path.join(
  os.homedir(),
  'tatt-scraper/data/enrichment/instagram/apify-profiles',
);
const DEFAULT_OUTPUT = path.join(ROOT, 'data/portfolio-permalinks.json');

function parseArgs(argv) {
  const opts = { input: DEFAULT_INPUT, output: DEFAULT_OUTPUT };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') opts.input = argv[++i];
    else if (argv[i] === '--output') opts.output = argv[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log('derive-portfolio-permalinks (TAT-40 — disk-only, no network)');
  console.log(`  input:  ${opts.input}`);
  console.log(`  output: ${opts.output}`);

  const files = (await readdir(opts.input)).filter((f) => f.toLowerCase().endsWith('.json')).sort();
  console.log(`  archive files: ${files.length}`);

  const artists = {};
  const stats = {
    archiveFiles: files.length,
    unparseableFiles: 0,
    artistsWithImages: 0,
    sourceImages: 0,
    permalinksDerived: 0,
    artistsAllDerived: 0,
    artistsSomeDerived: 0,
    artistsNoneDerived: 0,
  };

  for (const file of files) {
    let raw;
    try {
      raw = JSON.parse(await readFile(path.join(opts.input, file), 'utf8'));
    } catch (err) {
      stats.unparseableFiles++;
      console.log(`  ⚠ unparseable ${file}: ${err.message}`);
      continue;
    }
    const artistId = raw?.artistId;
    if (typeof artistId !== 'string' || !artistId) continue;
    const permalinks = derivePermalinksForImages(raw.images);
    if (permalinks.length === 0) continue;

    stats.artistsWithImages++;
    stats.sourceImages += permalinks.length;
    const derived = permalinks.filter(Boolean).length;
    stats.permalinksDerived += derived;
    if (derived === permalinks.length) stats.artistsAllDerived++;
    else if (derived > 0) stats.artistsSomeDerived++;
    else stats.artistsNoneDerived++;

    artists[artistId] = permalinks;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    input: opts.input,
    stats,
    artists,
  };
  await mkdir(path.dirname(opts.output), { recursive: true });
  await writeFile(opts.output, JSON.stringify(payload));

  const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a');
  console.log('\n─── archive coverage (source images, pre-hosting) ───');
  console.log(`  artists with images:      ${stats.artistsWithImages}`);
  console.log(`  source images:            ${stats.sourceImages}`);
  console.log(`  permalinks derived:       ${stats.permalinksDerived} (${pct(stats.permalinksDerived, stats.sourceImages)})`);
  console.log(`  artists fully derived:    ${stats.artistsAllDerived}`);
  console.log(`  artists partially derived:${stats.artistsSomeDerived}`);
  console.log(`  artists none derived:     ${stats.artistsNoneDerived}`);
  if (stats.unparseableFiles) console.log(`  unparseable files:        ${stats.unparseableFiles}`);
  console.log(`\nWrote ${opts.output}`);
  console.log('Hosted-image alignment happens in the migration:');
  console.log('  node scripts/migrations/2026-07-27-portfolio-permalinks.mjs   # dry run');
}

main().catch((err) => {
  console.error('[derive-portfolio-permalinks] FATAL:', err);
  process.exit(1);
});
