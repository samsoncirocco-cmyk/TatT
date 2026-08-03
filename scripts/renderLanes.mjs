/**
 * The two production render lanes, callable from measurement scripts.
 *
 * Extracted from generate-backdrop-sample.mjs so every harness measures the
 * same thing the product does, and so a fix to one lane (throttle handling,
 * a changed input name) reaches every harness at once instead of being
 * patched into whichever script noticed first.
 *
 * Auth deliberately differs from the app: a gcloud ADC token for Vertex
 * rather than the service-account helper, because local runs have ADC and
 * not GOOGLE_APPLICATION_CREDENTIALS_JSON. Endpoints, models, and inputs are
 * otherwise identical to src/services/generation/internal/*.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tatt-pro';
export const REGION = process.env.GCP_REGION || 'us-central1';

const IMAGEN_MODEL = 'imagen-3.0-generate-001';
const FLUX_SLUG = 'black-forest-labs/flux-dev';

export const LANE_COST_USD = { imagen: 0.02, flux: 0.025 };

export function adcToken() {
  return execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], {
    encoding: 'utf8',
  }).trim();
}

export function replicateToken() {
  const fromEnv = process.env.REPLICATE_API_TOKEN;
  if (fromEnv) return fromEnv;
  // Local runs read .env.local the same way `next dev` would.
  const envFile = readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  const match = envFile.match(/^REPLICATE_API_TOKEN=(.*)$/m);
  if (!match) throw new Error('REPLICATE_API_TOKEN not found in env or .env.local');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

export async function imagen(token, prompt, negativePrompt, aspectRatio) {
  const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${IMAGEN_MODEL}:predict`;
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
  return data.predictions?.map((p) => p.bytesBase64Encoded).filter(Boolean) ?? [];
}

/**
 * One flux-dev render, returned as base64 so both lanes write identically.
 * Mirrors the production provider: official-model slug endpoint, Prefer:
 * wait, and negatives folded into the prompt as an "Avoid:" clause because
 * the Flux family takes no negative_prompt input.
 */
export async function flux(apiToken, prompt, negativePrompt, aspectRatio) {
  const avoid = (negativePrompt || '').trim();
  const full = avoid ? `${prompt.trim().replace(/\.$/, '')}. Avoid: ${avoid}.` : prompt;

  // Replicate throttles to 6/min with a burst of 1 while account credit is
  // under $5. The production provider honours retry_after; a harness that
  // does not would measure a low-credit account as a broken lane rather
  // than a slow one.
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
    await new Promise((r) => setTimeout(r, waitMs + 1500));
  }
  if (!res.ok) throw new Error(`Flux ${res.status}: ${(await res.text()).slice(0, 300)}`);

  let prediction = await res.json();
  for (let i = 0; prediction.status !== 'succeeded' && prediction.status !== 'failed' && i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
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

/** Pick a lane's renderer and token together, so they cannot be mismatched. */
export function resolveLane(lane) {
  if (lane === 'flux') return { render: flux, token: replicateToken(), costUsd: LANE_COST_USD.flux };
  if (lane === 'imagen') return { render: imagen, token: adcToken(), costUsd: LANE_COST_USD.imagen };
  throw new Error(`unknown lane '${lane}' (expected imagen|flux)`);
}
