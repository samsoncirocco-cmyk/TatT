/**
 * validate-permalink-sample.mjs — TAT-40: spot-check derived Instagram
 * permalinks against Instagram's tokenless oEmbed endpoint.
 *
 * This is VALIDATION, not scraping: one oEmbed lookup per sampled permalink
 * (https://www.instagram.com/api/v1/oembed/?url=…), nothing fetched beyond
 * the oEmbed JSON, nothing stored. Signal observed 2026-07-27:
 *   valid post  → HTTP 200, JSON body with an `html` embed snippet
 *   junk post   → HTTP 404 "No Media Match"
 *
 * Rate limits: the oEmbed endpoint allows 1,000 req/hr; we throttle to a
 * conservative default of 480/hr (7.5s spacing) and back off exponentially
 * on 429/5xx. A 300-permalink sample therefore takes ~40 minutes.
 *
 * Only a SAMPLE is validated (default 300 of ~30k) — validating the full set
 * would burn 60+ hours of rate-limit budget for little marginal information;
 * the embed tier keeps a runtime fallback for the residue of bad permalinks.
 * The sample is drawn with a seeded PRNG so a run is reproducible.
 *
 * Usage:
 *   node scripts/validate-permalink-sample.mjs                  # 300-permalink sample
 *   node scripts/validate-permalink-sample.mjs --sample 50      # quicker smoke run
 *   ... [--input data/portfolio-permalinks.json] [--rate-per-hour 480] [--seed 40]
 */

import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OEMBED = 'https://www.instagram.com/api/v1/oembed/?url=';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const MAX_RETRIES = 3;

function parseArgs(argv) {
  const opts = {
    input: path.join(ROOT, 'data/portfolio-permalinks.json'),
    sample: 300,
    ratePerHour: 480,
    seed: 40, // TAT-40
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') opts.input = path.resolve(ROOT, argv[++i]);
    else if (argv[i] === '--sample') opts.sample = Math.max(1, Number(argv[++i]) || 300);
    else if (argv[i] === '--rate-per-hour') opts.ratePerHour = Math.min(500, Math.max(1, Number(argv[++i]) || 480));
    else if (argv[i] === '--seed') opts.seed = Number(argv[++i]) || 40;
  }
  return opts;
}

/** mulberry32 — tiny seeded PRNG, good enough for reproducible sampling. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function checkPermalink(permalink) {
  let backoff = 30_000;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res;
    try {
      res = await fetch(OEMBED + encodeURIComponent(permalink), {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      if (attempt === MAX_RETRIES) return { status: 'error', detail: err.message };
      await sleep(backoff); backoff *= 2;
      continue;
    }
    if (res.status === 200) {
      const body = await res.text();
      try {
        const json = JSON.parse(body);
        if (typeof json.html === 'string' && json.html.length > 0) return { status: 'valid' };
        return { status: 'error', detail: '200 but no embed html' };
      } catch {
        return { status: 'error', detail: '200 but non-JSON body (blocked?)' };
      }
    }
    if (res.status === 404) return { status: 'invalid' };
    // 429 / 403 / 5xx — rate limited or transient; back off and retry.
    if (attempt === MAX_RETRIES) return { status: 'error', detail: `HTTP ${res.status}` };
    console.log(`    HTTP ${res.status} — backing off ${backoff / 1000}s`);
    await sleep(backoff); backoff *= 2;
  }
  return { status: 'error', detail: 'unreachable' };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const derived = JSON.parse(await readFile(opts.input, 'utf8'));

  // Population: every derived permalink (artistId, archiveIndex, url).
  const population = [];
  for (const [artistId, permalinks] of Object.entries(derived.artists || {})) {
    permalinks.forEach((p, i) => { if (p) population.push({ artistId, index: i, permalink: p }); });
  }

  const rand = mulberry32(opts.seed);
  const sampleSize = Math.min(opts.sample, population.length);
  // Partial Fisher–Yates: draw sampleSize items without replacement.
  for (let i = 0; i < sampleSize; i++) {
    const j = i + Math.floor(rand() * (population.length - i));
    [population[i], population[j]] = [population[j], population[i]];
  }
  const sample = population.slice(0, sampleSize);
  const intervalMs = Math.ceil(3_600_000 / opts.ratePerHour);

  console.log('validate-permalink-sample (TAT-40 — oEmbed spot-check, throttled)');
  console.log(`  population: ${population.length} derived permalinks (${opts.input})`);
  console.log(`  sample:     ${sampleSize} (seed ${opts.seed})`);
  console.log(`  throttle:   ${opts.ratePerHour}/hr → ${intervalMs}ms between requests`);
  console.log(`  ETA:        ~${Math.round((sampleSize * intervalMs) / 60000)} min\n`);

  const counts = { valid: 0, invalid: 0, error: 0 };
  const failures = [];
  for (let i = 0; i < sample.length; i++) {
    const { artistId, index, permalink } = sample[i];
    const result = await checkPermalink(permalink);
    counts[result.status]++;
    if (result.status !== 'valid') failures.push({ artistId, index, permalink, ...result });
    if ((i + 1) % 25 === 0 || i === sample.length - 1) {
      console.log(`  [${i + 1}/${sample.length}] valid=${counts.valid} invalid=${counts.invalid} error=${counts.error}`);
    }
    if (i < sample.length - 1) await sleep(intervalMs);
  }

  const decided = counts.valid + counts.invalid;
  console.log('\n─── sample validity ───');
  console.log(`  valid:   ${counts.valid}`);
  console.log(`  invalid: ${counts.invalid}`);
  console.log(`  error:   ${counts.error} (excluded from the rate)`);
  console.log(`  validity rate: ${decided ? ((100 * counts.valid) / decided).toFixed(1) : 'n/a'}% of ${decided} decided`);
  if (failures.length) {
    console.log('\n─── non-valid samples ───');
    for (const f of failures) {
      console.log(`  ${f.status.padEnd(7)} ${f.permalink} (${f.artistId}[${f.index}]${f.detail ? `, ${f.detail}` : ''})`);
    }
  }
}

main().catch((err) => {
  console.error('[validate-permalink-sample] FATAL:', err);
  process.exit(1);
});
