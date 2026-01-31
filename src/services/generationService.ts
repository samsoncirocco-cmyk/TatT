import { getGcpAccessToken } from '@/lib/google-auth-edge';
import { logEvent } from '@/lib/observability';

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tatt-pro';
const REGION = process.env.GCP_REGION || 'us-central1';
const IMAGEN_MODEL = 'imagen-3.0-generate-001';
const IMAGEN_COST_PER_IMAGE = 0.02;

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export interface GenerationOptions {
  prompt: string;
  negativePrompt?: string;
  numImages?: number;
  aspectRatio?: string;
  safetyFilterLevel?: string;
  personGeneration?: string;
  outputFormat?: string;
  seed?: number | string;
  retry?: {
    attempts?: number;
    baseDelayMs?: number;
  };
  fallback?: {
    safetyFilterLevel?: string;
  };
}

export interface GenerationResult {
  images: string[];
  metadata: {
    model: string;
    provider: string;
    generatedAt: string;
    durationMs: number;
    attempts: number;
    safetyFilterLevel: string;
    personGeneration: string;
    seed?: number | string;
    fallbackUsed: boolean;
  };
}

function resolveSafetySetting(safetyFilterLevel?: string) {
  const normalized = (safetyFilterLevel || '').toLowerCase().trim();
  if (!normalized) return 'block_only_high';
  return normalized;
}

function resolvePersonGeneration(personGeneration?: string) {
  const normalized = (personGeneration || '').toLowerCase().trim();
  if (!normalized) return 'allow_adult';
  return normalized;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callImagen(options: GenerationOptions) {
  const accessToken = await getGcpAccessToken();
  const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${IMAGEN_MODEL}:predict`;

  const safetySetting = resolveSafetySetting(options.safetyFilterLevel);
  const personGeneration = resolvePersonGeneration(options.personGeneration);

  const parameters: Record<string, unknown> = {
    sampleCount: options.numImages || 1,
    aspectRatio: options.aspectRatio || '1:1',
    negativePrompt: options.negativePrompt,
    safetySetting,
    personGeneration
  };

  if (options.seed !== undefined && options.seed !== null && options.seed !== '') {
    const parsedSeed = typeof options.seed === 'string' ? Number(options.seed) : options.seed;
    if (Number.isFinite(parsedSeed)) {
      parameters.seed = parsedSeed;
    }
  }

  if (options.outputFormat) {
    parameters.outputFormat = options.outputFormat;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [{ prompt: options.prompt }],
      parameters
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    const error: any = new Error(`Imagen API error: ${response.status} - ${errText}`);
    error.status = response.status;
    error.details = errText;
    error.code = response.status === 429 ? 'VERTEX_QUOTA_EXCEEDED' : 'VERTEX_IMAGEN_ERROR';
    throw error;
  }

  const data = await response.json();
  const images = data.predictions?.map((pred: any) =>
    `data:image/png;base64,${pred.bytesBase64Encoded}`
  ) || [];

  return {
    images,
    safetySetting,
    personGeneration
  };
}

export async function generateWithRetry(options: GenerationOptions): Promise<GenerationResult> {
  const startedAt = Date.now();
  const retryAttempts = options.retry?.attempts ?? 2;
  const baseDelayMs = options.retry?.baseDelayMs ?? 400;

  let attempts = 0;
  let lastError: any = null;
  let fallbackUsed = false;

  const requestId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  logEvent('generation.request', {
    requestId,
    numImages: options.numImages || 1,
    aspectRatio: options.aspectRatio || '1:1',
    safetyFilterLevel: options.safetyFilterLevel || 'block_only_high',
    seed: options.seed,
    estimatedCostUsd: IMAGEN_COST_PER_IMAGE * (options.numImages || 1)
  });

  while (attempts <= retryAttempts) {
    try {
      attempts += 1;
      const result = await callImagen(options);
      const durationMs = Date.now() - startedAt;

      logEvent('generation.result', {
        requestId,
        success: true,
        durationMs,
        attempts,
        safetyFilterLevel: result.safetySetting,
        estimatedCostUsd: IMAGEN_COST_PER_IMAGE * (options.numImages || 1)
      });

      return {
        images: result.images,
        metadata: {
          model: IMAGEN_MODEL,
          provider: 'vertex-ai',
          generatedAt: new Date().toISOString(),
          durationMs,
          attempts,
          safetyFilterLevel: result.safetySetting,
          personGeneration: result.personGeneration,
          seed: options.seed,
          fallbackUsed
        }
      };
    } catch (error: any) {
      lastError = error;
      const status = error?.status;
      const isRetryable = status && RETRYABLE_STATUS.has(status);
      if (!isRetryable || attempts > retryAttempts) break;
      await sleep(baseDelayMs * attempts);
    }
  }

  if (options.fallback) {
    try {
      fallbackUsed = true;
      const fallbackOptions: GenerationOptions = {
        ...options,
        safetyFilterLevel: options.fallback.safetyFilterLevel || 'block_only_high',
        numImages: options.numImages || 1
      };
      const result = await callImagen(fallbackOptions);
      const durationMs = Date.now() - startedAt;

      logEvent('generation.result', {
        requestId,
        success: true,
        durationMs,
        attempts: attempts + 1,
        safetyFilterLevel: result.safetySetting,
        fallbackUsed: true,
        estimatedCostUsd: IMAGEN_COST_PER_IMAGE * (options.numImages || 1)
      });

      return {
        images: result.images,
        metadata: {
          model: IMAGEN_MODEL,
          provider: 'vertex-ai',
          generatedAt: new Date().toISOString(),
          durationMs,
          attempts: attempts + 1,
          safetyFilterLevel: result.safetySetting,
          personGeneration: result.personGeneration,
          seed: options.seed,
          fallbackUsed
        }
      };
    } catch (fallbackError: any) {
      lastError = fallbackError;
    }
  }

  logEvent('generation.result', {
    requestId,
    success: false,
    attempts,
    error: lastError?.message || 'Generation failed'
  }, 'error');

  throw lastError || new Error('Generation failed');
}
