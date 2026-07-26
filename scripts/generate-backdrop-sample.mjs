#!/usr/bin/env node
/**
 * Generate a small sample of renders through the REAL production prompt
 * builder (`enhanceStructured`) and save them for `measure-backdrop.mjs`.
 *
 * This exists so the presentation clause can be A/B'd against actual
 * generator output rather than intuition: run it once before a prompt
 * change and once after, then compare pass rates.
 *
 * Vertex Imagen only — the Replicate/Flux lane needs REPLICATE_API_TOKEN,
 * which is not available locally. Auth is a gcloud ADC token rather than the
 * app's service-account helper; the endpoint, model, and prompts are
 * otherwise identical to production.
 *
 * Usage:
 *   node_modules/.bin/vite-node scripts/generate-backdrop-sample.mjs <outDir> [token]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { enhanceStructured } from '../src/services/council/index.ts';

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tatt-pro';
const REGION = process.env.GCP_REGION || 'us-central1';
const MODEL = 'imagen-3.0-generate-001';
const COST_PER_IMAGE_USD = 0.02;

/**
 * Two record sets, selected by argv. Each yields four variations per record,
 * so one pass is 12 prompts / 12 images.
 *
 * `tuning` spans the styles the existing Vertex portfolio corpus failed worst
 * (lettering 80%, traditional 78%) plus a mid-pack blackwork session.
 * `holdout` is disjoint from it in style, placement, and subject, so a fix
 * developed against `tuning` can be checked against prompts it never saw.
 */
const HOLDOUT = [
  {
    placement: 'ribcage',
    styleTags: ['japanese', 'irezumi'],
    meaning: 'a koi swimming upstream, for stubbornness',
    references: [],
    ambiguousAxes: ['minimal-ornate'],
  },
  {
    placement: 'wrist',
    styleTags: ['fine-line', 'minimalist'],
    meaning: 'three small birds for my daughters',
    references: [],
    ambiguousAxes: ['literal-abstract'],
  },
  {
    placement: 'back',
    styleTags: ['realism', 'portrait'],
    meaning: 'a wolf, the year I stopped drinking',
    references: [],
    ambiguousAxes: [],
  },
];

const TUNING = [
  {
    placement: 'left forearm',
    styleTags: ['lettering', 'blackwork'],
    meaning: 'my grandmother’s name in script, she raised me',
    references: [],
    ambiguousAxes: ['bold-fine', 'minimal-ornate'],
  },
  {
    placement: 'upper arm',
    styleTags: ['traditional', 'color'],
    meaning: 'an anchor and swallow for my time at sea',
    references: [],
    ambiguousAxes: ['bold-fine', 'minimal-ornate'],
  },
  {
    placement: 'calf',
    styleTags: ['blackwork', 'geometric'],
    meaning: 'a mountain range for the climb out of a hard year',
    references: [],
    ambiguousAxes: ['bold-fine', 'minimal-ornate'],
  },
];

function adcToken() {
  return execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], {
    encoding: 'utf8',
  }).trim();
}

async function imagen(token, prompt, negativePrompt, aspectRatio) {
  const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${MODEL}:predict`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio,
        negativePrompt,
        safetySetting: 'block_only_high',
        personGeneration: 'allow_adult',
      },
    }),
  });
  if (!res.ok) throw new Error(`Imagen ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.predictions?.map(p => p.bytesBase64Encoded).filter(Boolean) ?? [];
}

const [outDir, setName = 'tuning'] = process.argv.slice(2).filter(a => a !== '--');
if (!outDir) {
  console.error('usage: generate-backdrop-sample.mjs <outDir> [tuning|holdout]');
  process.exit(1);
}
const RECORDS = setName === 'holdout' ? HOLDOUT : TUNING;
await mkdir(outDir, { recursive: true });

const token = adcToken();
let n = 0;
let spentUsd = 0;
const manifest = [];

for (const [ri, record] of RECORDS.entries()) {
  const { variations } = await enhanceStructured(record);
  for (const [vi, v] of variations.entries()) {
    const prompt = v.prompts.detailed ?? v.prompts.simple ?? '';
    if (!prompt) continue;
    const name = `r${ri}_v${vi}.png`;
    try {
      const [b64] = await imagen(token, prompt, v.negativePrompt, '9:16');
      spentUsd += COST_PER_IMAGE_USD;
      if (!b64) {
        console.log(`  ${name}  NO IMAGE (safety filter?)`);
        manifest.push({ name, prompt, blocked: true });
        continue;
      }
      await writeFile(path.join(outDir, name), Buffer.from(b64, 'base64'));
      manifest.push({ name, prompt, negativePrompt: v.negativePrompt });
      n++;
      console.log(`  ${name}  ok`);
    } catch (err) {
      console.log(`  ${name}  FAILED ${err.message}`);
      manifest.push({ name, prompt, error: err.message });
    }
  }
}

await writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nsaved ${n} images to ${outDir}`);
console.log(`billable images: ${(spentUsd / COST_PER_IMAGE_USD).toFixed(0)}  approx $${spentUsd.toFixed(2)}`);
