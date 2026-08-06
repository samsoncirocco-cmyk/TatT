#!/usr/bin/env node
/**
 * Generate the multi-character corpus through the REAL prompt builder and
 * score how much of each requested cast actually survived into the render.
 *
 * This is the measurement `measure-backdrop` cannot make. Backdrop scores
 * presentation and is blind to correctness; this scores whether the people
 * the customer named are in the picture.
 *
 * Usage (needs a TS-aware runner for the .ts imports):
 *   vite-node -c vitest.config.js scripts/measure-cast.mjs -- <outDir> [imagen|flux] [jsonOut]
 */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { enhanceStructured } from '../src/services/council/index.ts';
import { resolveLane, adcToken } from './renderLanes.mjs';
import { CAST_RECORDS, scoreCastDir, summarizeCast } from './castCorpus.mjs';

const args = process.argv.slice(2).filter((a) => a !== '--');
const outDir = args[0];
if (!outDir) {
  console.error('usage: measure-cast.mjs <outDir> [imagen|flux|gemini|replicate-imagen|replicate-nano-banana] [jsonOut]');
  process.exit(1);
}
// Allow `<outDir> <jsonOut>` (default lane), matching measure-backdrop's shape.
// A bare second token that ends in .json is jsonOut, not a lane name.
const lane = args[1]?.endsWith('.json') ? 'flux' : (args[1] ?? 'flux');
const jsonOut = args[1]?.endsWith('.json') ? args[1] : args[2];
const maxNewRenders = Number(process.env.MEASURE_MAX_NEW_RENDERS || Number.POSITIVE_INFINITY);
const skipScoring = process.env.MEASURE_SKIP_SCORING === '1';

await mkdir(outDir, { recursive: true });
const { render, token, costUsd } = resolveLane(lane);
console.log(`lane: ${lane}  records: ${CAST_RECORDS.length}`);

const manifestPath = path.join(outDir, 'manifest.json');
let manifest = [];
try {
  manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
const measuredNames = new Set(manifest.map((entry) => entry.name));
let billable = 0;

async function checkpoint(entry) {
  manifest.push(entry);
  measuredNames.add(entry.name);
  // Paid calls are serial. Persist each outcome so an interrupted corpus can
  // resume instead of re-paying for successful images already on disk.
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

/*
 * CAST_CLAUSE=off drops ONLY the per-character identity clause
 * ("Character identities: Sora — Kingdom Hearts; …") by emptying
 * characterIdentities, and keeps requestedCharacters intact.
 *
 * That distinction is the whole point: emptying requestedCharacters too would
 * also switch selectAxes out of compositional mode and swap the ensemble
 * treatments, so it would measure a different prompt path rather than the
 * proposed one-line production fix.
 */
const dropClause = (process.env.CAST_CLAUSE || 'on').toLowerCase() === 'off';
if (dropClause) console.log('identity clause: OFF (characterIdentities emptied)');

outer: for (const { id, cast, record: baseRecord } of CAST_RECORDS) {
  const record = dropClause ? { ...baseRecord, characterIdentities: [] } : baseRecord;
  const { variations } = await enhanceStructured(record);
  for (const [vi, v] of variations.entries()) {
    if (billable >= maxNewRenders) break outer;
    const prompt = v.prompts.detailed ?? v.prompts.simple ?? '';
    if (!prompt) continue;
    const name = `${id}_v${vi}.png`;
    const imagePath = path.join(outDir, name);
    if (measuredNames.has(name)) {
      console.log(`  ${name}  already checkpointed`);
      continue;
    }
    try {
      await access(imagePath);
      // The pre-checkpointing runner may have completed an image before it
      // stopped. Record it without rendering it a second time.
      await checkpoint({ name, recordId: id, cast, prompt, resumed: true });
      console.log(`  ${name}  resumed from existing image`);
      continue;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    try {
      const [b64] = await render(token, prompt, v.negativePrompt, '9:16');
      billable++;
      if (!b64) {
        console.log(`  ${name}  NO IMAGE (safety filter?)`);
        await checkpoint({ name, recordId: id, cast, blocked: true });
        continue;
      }
      await writeFile(imagePath, Buffer.from(b64, 'base64'));
      await checkpoint({ name, recordId: id, cast, prompt });
      console.log(`  ${name}  ok`);
    } catch (err) {
      console.log(`  ${name}  FAILED ${err.message}`);
      await checkpoint({ name, recordId: id, cast, error: err.message });
    }
  }
}

console.log(`\nrendered this run ${billable}  declared $${(billable * costUsd).toFixed(2)}`);
console.log(`checkpointed corpus outputs ${manifest.filter((entry) => !entry.blocked && !entry.error).length}`);

if (skipScoring) {
  console.log('scoring skipped for this checkpoint transaction');
  process.exit(0);
}

console.log('\nscoring with the production vision prompt…');
const results = await scoreCastDir(outDir, adcToken());
const summary = summarizeCast(results);

console.log(`\n${outDir}  (lane: ${lane})`);
console.log(`  renders scored        ${summary.total}`);
console.log(`  full cast present     ${summary.complete}`);
console.log(`  no cast recognized    ${summary.none}`);
console.log(`  mean completeness     ${(summary.meanCompleteness * 100).toFixed(1)}%`);
console.log(`  renders with text     ${summary.textIntrusions}/${summary.total}`);
if (summary.intrudedWords.length) {
  console.log(`  words drawn in        ${summary.intrudedWords.slice(0, 12).join(', ')}`);
}
console.log('\n  by request:');
for (const [id, s] of Object.entries(summary.byRecord)) {
  const pct = ((s.sum / s.total) * 100).toFixed(0);
  console.log(`    ${id.padEnd(20)} ${pct.padStart(4)}%   full ${s.complete}/${s.total}`);
}

console.log('\n  per render:');
for (const r of results) {
  if (r.error) {
    console.log(`    ${r.file.padEnd(22)} ERROR ${r.error}`);
    continue;
  }
  const got = r.found.length ? r.found.join(', ') : '—';
  console.log(
    `    ${r.file.padEnd(22)} ${r.found.length}/${r.cast.length}  got: ${got}` +
      (r.extra.length ? `  | unexpected: ${r.extra.join(', ')}` : '')
  );
}

if (jsonOut) {
  await writeFile(jsonOut, JSON.stringify({ dir: outDir, lane, summary, results }, null, 2));
  console.log(`\n  wrote ${jsonOut}`);
}
