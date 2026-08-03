#!/usr/bin/env node
/**
 * Generate a small sample of renders through the REAL production prompt
 * builder (`enhanceStructured`) and save them for `measure-backdrop.mjs`.
 *
 * This exists so the presentation clause can be A/B'd against actual
 * generator output rather than intuition: run it once before a prompt
 * change and once after, then compare pass rates.
 *
 * Two lanes, because the presentation fix was only ever MEASURED on one.
 * ADR-0023 pins realism/portrait to Vertex Imagen and everything else to
 * Flux or Krea, so the lane serving most sessions is the lane with no
 * backdrop measurement behind it — the gap that ADR's Consequences section
 * admits to. Imagen auth is a gcloud ADC token; Flux needs
 * REPLICATE_API_TOKEN. Endpoints, models and prompts are otherwise identical
 * to production.
 *
 * Usage:
 *   node_modules/.bin/vite-node scripts/generate-backdrop-sample.mjs <outDir> [tuning|holdout] [imagen|flux]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { enhanceStructured } from '../src/services/council/index.ts';

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tatt-pro';
const REGION = process.env.GCP_REGION || 'us-central1';
const MODEL = 'imagen-3.0-generate-001';
const IMAGEN_COST_PER_IMAGE_USD = 0.02;

// The default lane for every non-realism style (ADR-0023), invoked by slug
// exactly as src/services/generation/internal/replicate.ts does.
const FLUX_SLUG = 'black-forest-labs/flux-dev';
const FLUX_COST_PER_IMAGE_USD = 0.025;

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

function replicateToken() {
  const fromEnv = process.env.REPLICATE_API_TOKEN;
  if (fromEnv) return fromEnv;
  // Local runs read .env.local the same way `next dev` would.
  const envFile = readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const match = envFile.match(/^REPLICATE_API_TOKEN=(.*)$/m);
  if (!match) throw new Error('REPLICATE_API_TOKEN not found in env or .env.local');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

/**
 * One flux-dev render, returned as base64 so both lanes write identically.
 * Mirrors the production provider: official-model slug endpoint, Prefer:
 * wait, negatives folded into the prompt as an "Avoid:" clause because the
 * Flux family takes no negative_prompt input.
 */
async function flux(apiToken, prompt, negativePrompt, aspectRatio) {
  const avoid = (negativePrompt || '').trim();
  const full = avoid ? `${prompt.trim().replace(/\.$/, '')}. Avoid: ${avoid}.` : prompt;

  // Replicate throttles hard below $5 of account credit (6/min, burst 1).
  // The production provider already honours retry_after; this sample has to
  // as well, or a low-credit account measures as a failed lane rather than a
  // slow one.
  let res;
  for (let attempt = 1; ; attempt++) {
    res = await fetch(`https://api.replicate.com/v1/models/${FLUX_SLUG}/predictions`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiToken}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt: full,
          aspect_ratio: aspectRatio,
          guidance: 3,
          num_inference_steps: 28,
          output_format: 'png',
          num_outputs: 1,
        },
      }),
    });
    if (res.status !== 429 || attempt >= 8) break;
    const body = await res.text();
    let waitMs = 10_000;
    try {
      const parsed = JSON.parse(body)?.retry_after;
      if (typeof parsed === 'number' && parsed > 0) waitMs = parsed * 1000;
    } catch {
      /* non-JSON throttle body — keep the default wait */
    }
    process.stdout.write(`    throttled, waiting ${Math.round(waitMs / 1000)}s\n`);
    await new Promise(r => setTimeout(r, waitMs + 1500));
  }
  if (!res.ok) throw new Error(`Flux ${res.status}: ${(await res.text()).slice(0, 300)}`);
  let prediction = await res.json();
  for (let i = 0; prediction.status !== 'succeeded' && prediction.status !== 'failed' && i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${apiToken}` },
    });
    prediction = await poll.json();
  }
  if (prediction.status !== 'succeeded') {
    throw new Error(`Flux prediction ${prediction.status}: ${prediction.error ?? 'unknown'}`);
  }
  const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!url) return [];
  const image = await fetch(url);
  if (!image.ok) throw new Error(`Flux output fetch ${image.status}`);
  return [Buffer.from(await image.arrayBuffer()).toString('base64')];
}

const [outDir, setName = 'tuning', lane = 'imagen'] = process.argv
  .slice(2)
  .filter(a => a !== '--');
if (!outDir || !['imagen', 'flux'].includes(lane)) {
  console.error('usage: generate-backdrop-sample.mjs <outDir> [tuning|holdout] [imagen|flux]');
  process.exit(1);
}
const RECORDS = setName === 'holdout' ? HOLDOUT : TUNING;
await mkdir(outDir, { recursive: true });

const COST_PER_IMAGE_USD =
  lane === 'flux' ? FLUX_COST_PER_IMAGE_USD : IMAGEN_COST_PER_IMAGE_USD;
const token = lane === 'flux' ? replicateToken() : adcToken();
console.log(`lane: ${lane}  set: ${setName}`);
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
      const [b64] =
        lane === 'flux'
          ? await flux(token, prompt, v.negativePrompt, '9:16')
          : await imagen(token, prompt, v.negativePrompt, '9:16');
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
