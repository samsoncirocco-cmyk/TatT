#!/usr/bin/env node
/**
 * CLI over scripts/backdropCorpus.mjs — reports the `assessBackdrop` pass
 * rate for a directory of renders. This is the acceptance metric for any
 * change to the generation prompt's presentation clause.
 *
 * Usage (needs a TS-aware runner for the .ts guard import):
 *   node_modules/.bin/vite-node scripts/measure-backdrop.mjs <dir> [out.json]
 */
import { writeFile } from 'node:fs/promises';
import { measureDir, summarize } from './backdropCorpus.mjs';

const [dir, jsonOut] = process.argv.slice(2).filter(a => a !== '--');
if (!dir) {
  console.error('usage: measure-backdrop.mjs <dir> [out.json]');
  process.exit(1);
}

const results = await measureDir(dir);
const summary = summarize(results);

console.log(`\n${dir}`);
console.log(`  total          ${summary.total}`);
console.log(`  passed         ${summary.passed}  (${(summary.passRate * 100).toFixed(1)}%)`);
console.log(`  opaque-scene   ${summary.failed}`);
for (const [kind, n] of Object.entries(summary.byKind)) console.log(`    ${kind.padEnd(14)} ${n}`);

const fractions = results.map(r => r.fraction).sort((a, b) => a - b);
const at = q => fractions[Math.min(fractions.length - 1, Math.floor(q * fractions.length))];
if (fractions.length) {
  console.log(`  border fraction p10/p50/p90  ${at(0.1).toFixed(3)} / ${at(0.5).toFixed(3)} / ${at(0.9).toFixed(3)}`);
}

if (jsonOut) {
  await writeFile(jsonOut, JSON.stringify({ dir, summary, results }, null, 2));
  console.log(`  wrote ${jsonOut}`);
}
