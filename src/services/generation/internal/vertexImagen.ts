import { getGcpAccessToken } from '@/lib/google-auth-edge';
import { logEvent } from '@/lib/observability';
import type { GenerationRequest, GenerationResult, Provider } from './provider';

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tatt-pro';
const REGION = process.env.GCP_REGION || 'us-central1';
const IMAGEN_MODEL = 'imagen-3.0-generate-001';
const IMAGEN_COST_PER_IMAGE = 0.02;

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

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

async function callImagen(request: GenerationRequest) {
  const accessToken = await getGcpAccessToken();
  const endpoint = `https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/${IMAGEN_MODEL}:predict`;

  const safetySetting = resolveSafetySetting(request.safetyFilterLevel);
  const personGeneration = resolvePersonGeneration(request.personGeneration);

  const parameters: Record<string, unknown> = {
    sampleCount: request.numImages || 1,
    aspectRatio: request.aspectRatio || '1:1',
    negativePrompt: request.negativePrompt,
    safetySetting,
    personGeneration
  };

  if (request.seed !== undefined && request.seed !== null && request.seed !== '') {
    const parsedSeed = typeof request.seed === 'string' ? Number(request.seed) : request.seed;
    if (Number.isFinite(parsedSeed)) {
      parameters.seed = parsedSeed;
    }
  }

  if (request.outputFormat) {
    parameters.outputFormat = request.outputFormat;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      instances: [{ prompt: request.prompt }],
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

async function generateWithRetry(request: GenerationRequest): Promise<GenerationResult> {
  const startedAt = Date.now();
  // attempts here means "number of retries after the first try"
  // Default 4 => 5 total attempts, matching production-hardening expectations.
  const retryAttempts = request.retry?.attempts ?? 4;
  const baseDelayMs = request.retry?.baseDelayMs ?? 1000;

  let attempts = 0;
  let lastError: any = null;
  let fallbackUsed = false;

  const requestId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  logEvent('generation.request', {
    requestId,
    numImages: request.numImages || 1,
    aspectRatio: request.aspectRatio || '1:1',
    safetyFilterLevel: request.safetyFilterLevel || 'block_only_high',
    seed: request.seed,
    estimatedCostUsd: IMAGEN_COST_PER_IMAGE * (request.numImages || 1)
  });

  while (attempts <= retryAttempts) {
    try {
      attempts += 1;
      const result = await callImagen(request);
      const durationMs = Date.now() - startedAt;

      logEvent('generation.result', {
        requestId,
        success: true,
        durationMs,
        attempts,
        safetyFilterLevel: result.safetySetting,
        estimatedCostUsd: IMAGEN_COST_PER_IMAGE * (request.numImages || 1)
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
          seed: request.seed,
          fallbackUsed
        }
      };
    } catch (error: any) {
      lastError = error;
      const status = error?.status;
      const isRetryable = status && RETRYABLE_STATUS.has(status);
      if (!isRetryable || attempts > retryAttempts) break;

      // Exponential backoff (capped) to play nice with quota throttling and transient outages.
      const exponent = Math.max(0, attempts - 1);
      const delayMs = Math.min(baseDelayMs * Math.pow(2, exponent), 8000);
      console.log(`[Generation] Retry ${attempts}/${retryAttempts + 1} after ${delayMs}ms (status=${status})`);
      await sleep(delayMs);
    }
  }

  if (request.fallback) {
    try {
      fallbackUsed = true;
      const fallbackRequest: GenerationRequest = {
        ...request,
        safetyFilterLevel: request.fallback.safetyFilterLevel || 'block_only_high',
        numImages: request.numImages || 1
      };
      const result = await callImagen(fallbackRequest);
      const durationMs = Date.now() - startedAt;

      logEvent('generation.result', {
        requestId,
        success: true,
        durationMs,
        attempts: attempts + 1,
        safetyFilterLevel: result.safetySetting,
        fallbackUsed: true,
        estimatedCostUsd: IMAGEN_COST_PER_IMAGE * (request.numImages || 1)
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
          seed: request.seed,
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

export const vertexImagenProvider: Provider = {
  name: 'vertex-ai',
  generate: generateWithRetry
};
