import type { GenerationRequest, GenerationResult, Provider } from './provider';
import { makeGenerationError } from './provider';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60;

interface ReplicateModel {
  id: string;
  name: string;
  version: string;
  cost: number;
  supportsRGBA: boolean;
  params: Record<string, unknown>;
  promptPrefix?: string;
}

// Model catalog ported VERBATIM from the client AI_MODELS
// (src/features/generate/services/replicateService.js) — the LoRA scale,
// prompt prefixes, schedulers, and step counts are load-bearing settings.
export const REPLICATE_MODELS: Record<string, ReplicateModel> = {
  tattoo: {
    id: 'tattoo',
    name: 'Classic Flash',
    version: 'anotherjesse/amy-tattoo-test-1:0e345aaf74965ae98fb83ca9c65376ee42da5c7837d88c648ddc5d3cba1f35dc',
    cost: 0.003,
    supportsRGBA: true,
    params: {
      num_outputs: 4,
      width: 1024,
      height: 1024,
      scheduler: 'K_EULER',
      num_inference_steps: 50,
      guidance_scale: 7.5,
      lora_scale: 0.6
    },
    promptPrefix: 'A TOK tattoo drawing style of'
  },
  animeXL: {
    id: 'animeXL',
    name: 'Animated Ink',
    version: 'lucataco/sdxl-niji-se:9e0521b45e1774fc3288ec9ffa964d064c9d905e1ca50f37549084b021d7449c',
    cost: 0.03,
    supportsRGBA: false,
    params: {
      num_outputs: 4,
      width: 1024,
      height: 1024,
      scheduler: 'K_EULER',
      num_inference_steps: 24,
      guidance_scale: 7
    }
  },
  dreamshaper: {
    id: 'dreamshaper',
    name: 'Speed Sketch',
    version: 'lucataco/dreamshaper-xl-turbo:0a1710e0187b01a255302738ca0158ff02a22f4638679533e111082f9dd1b615',
    cost: 0.001,
    supportsRGBA: true,
    params: {
      num_outputs: 4,
      width: 1024,
      height: 1024,
      scheduler: 'K_EULER',
      num_inference_steps: 6,
      guidance_scale: 2
    }
  },
  sdxl: {
    id: 'sdxl',
    name: 'Studio Grade',
    version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    cost: 0.0055,
    supportsRGBA: true,
    params: {
      num_outputs: 4,
      width: 1024,
      height: 1024,
      scheduler: 'K_EULER',
      num_inference_steps: 50,
      guidance_scale: 7.5,
      prompt_strength: 0.8,
      refine: 'expert_ensemble_refiner',
      high_noise_frac: 0.8
    }
  }
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithReplicate(request: GenerationRequest): Promise<GenerationResult> {
  const startedAt = Date.now();
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw makeGenerationError('REPLICATE_API_TOKEN not configured', {
      code: 'REPLICATE_NOT_CONFIGURED'
    });
  }

  const model = REPLICATE_MODELS[request.modelId || ''] || REPLICATE_MODELS.sdxl;
  const prompt = model.promptPrefix ? `${model.promptPrefix} ${request.prompt}` : request.prompt;
  const numOutputs = Math.min(
    request.numImages ?? (model.params.num_outputs as number) ?? 1,
    4
  );

  const input: Record<string, unknown> = {
    ...model.params,
    num_outputs: numOutputs,
    prompt,
    negative_prompt: request.negativePrompt || ''
  };

  const createRes = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'wait'
    },
    body: JSON.stringify({
      version: model.version,
      input
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw makeGenerationError(`Replicate API Error: ${createRes.status} - ${errText}`, {
      status: createRes.status,
      code: 'REPLICATE_ERROR'
    });
  }

  let prediction = await createRes.json();
  let attempts = 1;

  // Prefer: wait usually returns a settled prediction; poll if it didn't.
  while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts <= MAX_POLLS) {
    await sleep(POLL_INTERVAL_MS);
    const pollRes = await fetch(`${REPLICATE_API_URL}/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${token}` }
    });
    prediction = await pollRes.json();
    attempts += 1;
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

  return {
    images,
    metadata: {
      model: model.id,
      provider: 'replicate',
      generatedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      attempts: 1,
      seed: request.seed,
      fallbackUsed: false
    }
  };
}

export const replicateProvider: Provider = {
  name: 'replicate',
  generate: generateWithReplicate
};
