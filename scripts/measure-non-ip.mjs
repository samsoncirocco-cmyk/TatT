#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { enhanceStructured } from '../src/services/council/index.ts';
import { adcToken, resolveLane } from './renderLanes.mjs';
import { NON_IP_RECORDS, scoreNonIpDir, summarizeNonIp } from './nonIpCorpus.mjs';

const [outDir, lane = 'replicate-nano-banana', jsonOut] = process.argv.slice(2).filter((arg) => arg !== '--');
if (!outDir) throw new Error('usage: measure-non-ip.mjs <outDir> [lane] [jsonOut]');
const { render, token, costUsd } = resolveLane(lane);
const maxNewRenders = Number(process.env.MEASURE_MAX_NEW_RENDERS || Number.POSITIVE_INFINITY);
const skipScoring = process.env.MEASURE_SKIP_SCORING === '1';
const scoreRecordId = process.env.MEASURE_SCORE_RECORD;
const scoreFileNames = process.env.MEASURE_SCORE_FILES ? new Set(process.env.MEASURE_SCORE_FILES.split(',')) : undefined;
await mkdir(outDir, { recursive: true });
const manifestPath = path.join(outDir, 'manifest.json');
let manifest = [];
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const recorded = new Set(manifest.map((entry) => entry.name));
let billable = 0;
outer:
for (const { id, expected, record } of NON_IP_RECORDS) {
  const { variations } = await enhanceStructured(record);
  for (const [index, variation] of variations.entries()) {
    if (billable >= maxNewRenders) break outer;
    const name = `${id}_v${index}.png`;
    if (recorded.has(name)) continue;
    const target = path.join(outDir, name);
    try { await access(target); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const [base64] = await render(token, variation.prompts.detailed ?? variation.prompts.simple, variation.negativePrompt, '9:16');
      billable++;
      if (base64) await writeFile(target, Buffer.from(base64, 'base64'));
    }
    manifest.push({ name, recordId: id, expected });
    recorded.add(name);
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
}
if (skipScoring) {
  console.log(JSON.stringify({ lane, declaredRenderCostUsd: billable * costUsd, checkpointed: manifest.length }, null, 2));
  process.exit(0);
}
const results = await scoreNonIpDir(outDir, adcToken(), scoreRecordId, scoreFileNames);
const summary = summarizeNonIp(results);
console.log(JSON.stringify({ lane, declaredRenderCostUsd: billable * costUsd, summary, results }, null, 2));
if (jsonOut) await writeFile(jsonOut, JSON.stringify({ lane, declaredRenderCostUsd: billable * costUsd, summary, results }, null, 2));
