/**
 * harvest-ig-styles.mjs — turn already-scraped Instagram bios into a reviewable
 * artist→style artifact.
 *
 * Standalone, offline, deterministic. NOT deployed app code — an operator tool.
 * It makes NO network calls and spends NO money: it reads JSON files the Apify
 * scrape already wrote to disk and runs the canonical style regexes over the
 * `bio` field. Re-running it on the same input always produces the same output.
 *
 * ── Why bios and not shop websites ─────────────────────────────────────────
 * An Instagram bio is first-person and scoped to exactly one artist by
 * construction, so the section-attribution errors that dominate the website
 * scraping lane (styles bleeding between artists listed on one roster page)
 * cannot occur. See docs/audits/2026-07-25-enrichment-gate-review.md.
 *
 * ── Input shape (one JSON file per artist, as written by the IG scrape) ─────
 *   {
 *     "artistId": "artist_inkbysam",   // required — Neo4j Artist.id
 *     "handle":   "inkbysam",          // optional — provenance / spot-checking
 *     "bio":      "Fine line & black and grey …"   // the text we read
 *   }
 * Files with no artistId, no bio, or no style hit are counted and skipped.
 *
 * ── Output artifact ────────────────────────────────────────────────────────
 *   {
 *     "generatedAt": "2026-07-25T…Z",
 *     "source": "instagram-bio",
 *     "inputDir": "…",
 *     "stats": { profiles, withBio, styled, pairs, styleHistogram, countHistogram },
 *     "artists": [
 *       { "artistId", "handle", "styles": ["Fine Line", …],
 *         "bio": "<verbatim source bio>",
 *         "evidence": [{ "style": "Fine Line", "match": "fine line", "index": 0 }] }
 *     ]
 *   }
 * `bio` + `evidence` are kept so any tag can be hand-checked from the artifact
 * alone, without re-reading the scrape.
 *
 * The artifact is inert: it changes nothing until scripts/link-artist-styles.mjs
 * is run against it with an explicit --execute.
 *
 * ── Usage ──────────────────────────────────────────────────────────────────
 *   node scripts/harvest-ig-styles.mjs --input ~/tatt-scraper/data/enrichment/instagram/apify-profiles \
 *                                      --out data/enrichment/ig-artist-styles.json
 *
 * Flags:
 *   --input <dir>       directory of per-artist JSON profiles (required)
 *   --out <file>        artifact path (default: data/enrichment/ig-artist-styles.json)
 *   --limit <n>         read at most n profile files (sorted; for sampling)
 *   --max-styles <n>    drop artists carrying more than n styles (default: no cap).
 *                       An artist tagged with most of the vocabulary is noise in a
 *                       hard-filter match regardless of per-tag defensibility.
 *   --stdout            print the artifact instead of writing a file
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import {
  extractStyleEvidence,
  rejectSpuriousEvidence,
  isSafeArtistId,
  CANONICAL_STYLE_NAMES,
} from './lib/artist-styles.mjs';

const DEFAULT_OUT = 'data/enrichment/ig-artist-styles.json';
export const SOURCE_NAME = 'instagram-bio';

// ─── Pure helpers (unit-tested; no I/O) ────────────────────────────────────

/** Minimal flag parser: --input dir --out file --limit 5 --max-styles 4 --raw --stdout */
export function parseArgs(argv) {
  const opts = { input: null, out: DEFAULT_OUT, limit: Infinity, maxStyles: Infinity, guard: true, stdout: false };
  for (let i = 0; i < argv.length; i++) {
    const next = () => argv[++i];
    switch (argv[i]) {
      case '--input': opts.input = next(); break;
      case '--out': opts.out = next(); break;
      case '--limit': opts.limit = Math.max(0, Math.trunc(Number(next())) || 0); break;
      case '--max-styles': opts.maxStyles = Math.max(1, Math.trunc(Number(next())) || 1); break;
      case '--raw': opts.guard = false; break;
      case '--stdout': opts.stdout = true; break;
      default: break;
    }
  }
  return opts;
}

/**
 * Turn one parsed profile into a styled artist row, or null when it yields
 * nothing usable. `reason` on the null path is what the run summary counts.
 * Returns the guard's rejections too so the run can report them.
 */
export function harvestProfile(raw, maxStyles = Infinity, guard = true) {
  const none = (reason) => ({ record: null, rejected: [], reason });
  if (!raw || typeof raw !== 'object') return none('unparseable');
  if (!isSafeArtistId(raw.artistId)) return none('no-artist-id');
  const bio = typeof raw.bio === 'string' ? raw.bio : '';
  if (bio.trim() === '') return none('no-bio');

  const raws = extractStyleEvidence(bio);
  const { kept, rejected } = guard
    ? rejectSpuriousEvidence(bio, raws)
    : { kept: raws, rejected: [] };

  const withId = rejected.map((r) => ({ artistId: raw.artistId, ...r }));
  if (kept.length === 0) return { record: null, rejected: withId, reason: 'no-style' };
  if (kept.length > maxStyles) return { record: null, rejected: withId, reason: 'too-many-styles' };

  return {
    record: {
      artistId: raw.artistId,
      handle: typeof raw.handle === 'string' ? raw.handle : null,
      styles: kept.map((e) => e.style),
      bio,
      evidence: kept,
    },
    rejected: withId,
    reason: null,
  };
}

/** Roll harvested records up into the artifact's stats block. */
export function buildStats(records, counters) {
  const styleHistogram = Object.fromEntries(CANONICAL_STYLE_NAMES.map((s) => [s, 0]));
  const countHistogram = {};
  let pairs = 0;

  for (const rec of records) {
    for (const s of rec.styles) styleHistogram[s] += 1;
    pairs += rec.styles.length;
    const n = String(rec.styles.length);
    countHistogram[n] = (countHistogram[n] || 0) + 1;
  }

  return {
    profiles: counters.profiles,
    withBio: counters.withBio,
    styled: records.length,
    pairs,
    skipped: {
      unparseable: counters.unparseable,
      noArtistId: counters.noArtistId,
      noBio: counters.noBio,
      noStyle: counters.noStyle,
      tooManyStyles: counters.tooManyStyles,
    },
    styleHistogram,
    countHistogram,
  };
}

/** Assemble the full artifact document (kept pure so tests can assert its shape). */
export function buildArtifact(records, stats, meta) {
  return {
    generatedAt: meta.generatedAt,
    source: SOURCE_NAME,
    inputDir: meta.inputDir,
    guard: meta.guard,
    stats,
    guardRejections: meta.rejected,
    artists: records,
  };
}

// ─── I/O ───────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.input) {
    console.error('ERROR: --input <dir> is required (directory of per-artist IG profile JSON files).');
    process.exit(1);
  }

  console.log('harvest-ig-styles');
  console.log(`  input:      ${opts.input}`);
  console.log(`  out:        ${opts.stdout ? '(stdout)' : opts.out}`);
  console.log(`  limit:      ${opts.limit === Infinity ? 'all' : opts.limit}`);
  console.log(`  maxStyles:  ${opts.maxStyles === Infinity ? 'no cap' : opts.maxStyles}`);
  console.log(`  guard:      ${opts.guard ? 'on' : 'off (--raw: faithful regex port)'}`);

  const entries = await readdir(opts.input);
  const files = entries.filter((f) => f.toLowerCase().endsWith('.json')).sort().slice(0, opts.limit);

  const counters = {
    profiles: 0, withBio: 0,
    unparseable: 0, noArtistId: 0, noBio: 0, noStyle: 0, tooManyStyles: 0,
  };
  const records = [];
  const rejections = [];

  for (const file of files) {
    counters.profiles++;
    let raw;
    try {
      raw = JSON.parse(await readFile(path.join(opts.input, file), 'utf8'));
    } catch (err) {
      counters.unparseable++;
      console.log(`  ⚠ skipping ${file}: ${err.message}`);
      continue;
    }
    if (typeof raw?.bio === 'string' && raw.bio.trim() !== '') counters.withBio++;

    const { record, rejected, reason } = harvestProfile(raw, opts.maxStyles, opts.guard);
    rejections.push(...rejected);
    if (record) records.push(record);
    else if (reason === 'unparseable') counters.unparseable++;
    else if (reason === 'no-artist-id') counters.noArtistId++;
    else if (reason === 'no-bio') counters.noBio++;
    else if (reason === 'no-style') counters.noStyle++;
    else if (reason === 'too-many-styles') counters.tooManyStyles++;
  }

  records.sort((a, b) => a.artistId.localeCompare(b.artistId));
  rejections.sort((a, b) => a.artistId.localeCompare(b.artistId));
  const stats = buildStats(records, counters);
  const artifact = buildArtifact(records, stats, {
    generatedAt: new Date().toISOString(),
    inputDir: path.resolve(opts.input),
    guard: opts.guard,
    rejected: rejections,
  });

  const json = JSON.stringify(artifact, null, 2);
  if (opts.stdout) {
    console.log(json);
  } else {
    await mkdir(path.dirname(opts.out), { recursive: true });
    await writeFile(opts.out, `${json}\n`, 'utf8');
  }

  console.log('\n─── summary ───');
  console.log(`  profiles read:   ${stats.profiles}`);
  console.log(`  with a bio:      ${stats.withBio}`);
  console.log(`  styled artists:  ${stats.styled}`);
  console.log(`  (artist,style):  ${stats.pairs}`);
  console.log(`  skipped:         ${JSON.stringify(stats.skipped)}`);
  console.log(`  guard rejected:  ${rejections.length} tag(s)`);
  for (const r of rejections) console.log(`    ✗ ${r.artistId}: ${r.style} (${r.reason}) — ${JSON.stringify(r.match)}`);
  console.log(`  styles/artist:   ${JSON.stringify(stats.countHistogram)}`);
  console.log('  tag histogram:');
  for (const [style, n] of Object.entries(stats.styleHistogram).sort((a, b) => b[1] - a[1])) {
    if (n > 0) console.log(`    ${String(n).padStart(5)}  ${style}`);
  }
  if (!opts.stdout) console.log(`\n  artifact → ${opts.out}`);
  console.log('\n  This artifact is inert. Nothing reaches the graph until');
  console.log('  scripts/link-artist-styles.mjs is run against it with --execute.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}
