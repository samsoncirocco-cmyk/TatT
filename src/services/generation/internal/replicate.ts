import type { AspectRatio, GenerationRequest, GenerationResult, Provider } from './provider';
import { makeGenerationError } from './provider';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60;
// Replicate throttles hard when account credit is low (burst of 1/min), so
// a reveal's four concurrent predictions must be able to wait out a 429.
const MAX_CREATE_ATTEMPTS = 3;
const MAX_RETRY_AFTER_MS = 15_000;

interface ReplicateModel {
  id: string;
  name: string;
  /** Official Replicate model — invoked by slug via /models/{slug}/predictions, no version hash. */
  slug: string;
  cost: number;
  /** Krea accepts one output per prediction; the Flux family takes num_outputs. */
  supportsNumOutputs: boolean;
  /** Ratios this model's input schema actually accepts (verified against its OpenAPI schema). */
  aspectRatios: ReadonlySet<string>;
  /** Requested ratio → nearest schema-legal ratio, for the gaps in aspectRatios. */
  aspectRemap: Readonly<Record<string, string>>;
  params: Record<string, unknown>;
}

// Verified from the models' published OpenAPI schemas (replicate.com/<slug>).
const FLUX_ASPECT_RATIOS = new Set(['1:1', '16:9', '21:9', '3:2', '2:3', '4:5', '5:4', '3:4', '4:3', '9:16', '9:21']);
const KREA_ASPECT_RATIOS = new Set(['1:1', '4:3', '3:2', '16:9', '2.35:1', '4:5', '2:3', '9:16']);

// The Flux/Krea catalog (replaced the SDXL-era models — two generations
// behind on linework and prompt adherence). None of these accept a
// negative_prompt input: negatives are folded into the prompt as an
// "Avoid:" clause below.
export const REPLICATE_MODELS: Record<string, ReplicateModel> = {
  'flux-dev': {
    id: 'flux-dev',
    name: 'FLUX.1 Dev',
    slug: 'black-forest-labs/flux-dev',
    cost: 0.025,
    supportsNumOutputs: true,
    aspectRatios: FLUX_ASPECT_RATIOS,
    aspectRemap: {},
    params: {
      guidance: 3,
      num_inference_steps: 28,
      output_format: 'png'
    }
  },
  'flux-schnell': {
    id: 'flux-schnell',
    name: 'FLUX.1 Schnell',
    slug: 'black-forest-labs/flux-schnell',
    cost: 0.003,
    supportsNumOutputs: true,
    aspectRatios: FLUX_ASPECT_RATIOS,
    aspectRemap: {},
    params: {
      output_format: 'png'
    }
  },
  krea2: {
    id: 'krea2',
    name: 'Krea 2 Medium',
    slug: 'krea/krea-2-medium',
    cost: 0.035,
    supportsNumOutputs: false,
    aspectRatios: KREA_ASPECT_RATIOS,
    // Krea's schema has no 3:4 — 4:5 is the nearest portrait ratio it takes.
    aspectRemap: { '3:4': '4:5' },
    params: {}
  }
};

// Sessions persist their pinned modelId (ADR-0016), so ids from the retired
// SDXL catalog must keep resolving — a stored pick or refinement regen from
// before the switch lands on the closest current model.
const LEGACY_MODEL_ALIASES: Record<string, string> = {
  sdxl: 'flux-dev',
  tattoo: 'flux-dev',
  dreamshaper: 'flux-schnell',
  animeXL: 'krea2'
};

function resolveModel(modelId?: string): ReplicateModel {
  if (modelId && REPLICATE_MODELS[modelId]) return REPLICATE_MODELS[modelId];
  const alias = modelId ? LEGACY_MODEL_ALIASES[modelId] : undefined;
  if (alias) return REPLICATE_MODELS[alias];
  return REPLICATE_MODELS['flux-dev'];
}

function resolveAspectRatio(model: ReplicateModel, aspectRatio?: AspectRatio): string {
  if (!aspectRatio) return '1:1';
  if (model.aspectRatios.has(aspectRatio)) return aspectRatio;
  return model.aspectRemap[aspectRatio] || '1:1';
}

/**
 * Flux/Krea have no negative_prompt input — fold the negatives into the
 * prompt itself, which these prompt-adherent models handle well.
 */
function withAvoidClause(prompt: string, negativePrompt?: string): string {
  const negatives = (negativePrompt || '').trim();
  if (!negatives) return prompt;
  const base = prompt.trim().replace(/\.$/, '');
  return `${base}. Avoid: ${negatives}.`;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One prediction: create (with 429 retry_after handling), then poll to settled. */
async function runPrediction(
  model: ReplicateModel,
  input: Record<string, unknown>,
  token: string
): Promise<{ images: string[]; createAttempts: number }> {
  const endpoint = `${REPLICATE_API_URL}/models/${model.slug}/predictions`;

  let createRes: Response;
  let attempt = 1;
  for (;;) {
    createRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait'
      },
      body: JSON.stringify({ input })
    });

    if (createRes.status === 429 && attempt < MAX_CREATE_ATTEMPTS) {
      const errText = await createRes.text();
      let retryAfterMs = 10_000;
      try {
        const retryAfter = JSON.parse(errText)?.retry_after;
        if (typeof retryAfter === 'number' && retryAfter > 0) {
          retryAfterMs = retryAfter * 1000;
        }
      } catch {
        // Non-JSON throttle body — keep the default wait.
      }
      await sleep(Math.min(retryAfterMs, MAX_RETRY_AFTER_MS));
      attempt += 1;
      continue;
    }
    break;
  }

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw makeGenerationError(`Replicate API Error: ${createRes.status} - ${errText}`, {
      status: createRes.status,
      code: 'REPLICATE_ERROR'
    });
  }

  let prediction = await createRes.json();
  let polls = 1;

  // Prefer: wait usually returns a settled prediction; poll if it didn't.
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && polls <= MAX_POLLS) {
    await sleep(POLL_INTERVAL_MS);
    const pollRes = await fetch(`${REPLICATE_API_URL}/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${token}` }
    });
    prediction = await pollRes.json();
    polls += 1;
  }

  if (prediction.status === 'failed') {
    throw new Error(`Replicate prediction failed: ${prediction.error || 'unknown error'}`);
  }
  if (prediction.status !== 'succeeded') {
    throw new Error('Replicate prediction timed out');
  }

  const images: string[] = Array.isArray(prediction.output)
    ? prediction.output
    : [prediction.output].filter(Boolean);

  return { images, createAttempts: attempt };
}

async function generateWithReplicate(request: GenerationRequest): Promise<GenerationResult> {
  const startedAt = Date.now();
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw makeGenerationError('REPLICATE_API_TOKEN not configured', {
      code: 'REPLICATE_NOT_CONFIGURED'
    });
  }

  const model = resolveModel(request.modelId);
  const numImages = Math.min(Math.max(request.numImages ?? 1, 1), 4);

  const input: Record<string, unknown> = {
    ...model.params,
    prompt: withAvoidClause(request.prompt, request.negativePrompt),
    aspect_ratio: resolveAspectRatio(model, request.aspectRatio)
  };
  if (model.supportsNumOutputs) {
    input.num_outputs = numImages;
  }
  if (request.seed !== undefined && request.seed !== '') {
    const seed = Number(request.seed);
    if (Number.isFinite(seed)) input.seed = seed;
  }

  // Single-output models (Krea) fan out: N parallel predictions merged in
  // order, so callers asking for 4 images get 4 regardless of model.
  const fanOut = model.supportsNumOutputs ? 1 : numImages;
  const runs = await Promise.all(
    Array.from({ length: fanOut }, () => runPrediction(model, input, token))
  );

  return {
    images: runs.flatMap((run) => run.images),
    metadata: {
      model: model.id,
      provider: 'replicate',
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      // Total create calls (throttle retries + fan-out included) — the
      // telemetry to watch when reading 429 frequency.
      attempts: runs.reduce((sum, run) => sum + run.createAttempts, 0),
      seed: request.seed,
      fallbackUsed: false
    }
  };
}

export const replicateProvider: Provider = {
  name: 'replicate',
  generate: generateWithReplicate
};
