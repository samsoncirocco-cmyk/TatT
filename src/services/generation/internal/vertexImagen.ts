import { getGcpAccessToken } from '@/lib/google-auth-edge';
import { logEvent } from '@/lib/observability';
import type { GenerationError, GenerationRequest, GenerationResult, Provider } from './provider';
import { asGenerationError, makeGenerationError } from './provider';

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
    throw makeGenerationError(`Imagen API error: ${response.status} - ${errText}`, {
      status: response.status,
      details: errText,
      code: response.status === 429 ? 'VERTEX_QUOTA_EXCEEDED' : 'VERTEX_IMAGEN_ERROR'
    });
  }

  const data: { predictions?: Array<{ bytesBase64Encoded?: string }> } = await response.json();
  const images = data.predictions?.map((pred) =>
    `data:image/png;base64,${pred.bytesBase64Encoded}`
  ) || [];

  return {
    images,
    safetySetting,
    personGeneration
  };
}

function buildResult(
  request: GenerationRequest,
  requestId: string,
  startedAt: number,
  attempts: number,
  fallbackUsed: boolean,
  result: { images: string[]; safetySetting: string; personGeneration: string }
): GenerationResult {
  const durationMs = Date.now() - startedAt;

  logEvent('generation.result', {
    requestId,
    success: true,
    durationMs,
    attempts,
    safetyFilterLevel: result.safetySetting,
    ...(fallbackUsed ? { fallbackUsed: true } : {}),
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
}

async function generateWithRetry(request: GenerationRequest): Promise<GenerationResult> {
  // Imagen 3's :predict body takes no source image, so an image-to-image
  // request cannot be honored here. Refuse rather than render from the
  // prompt alone: the caller asked for the source's composition, and a
  // fresh text render silently returns a different design.
  if (request.sourceImage) {
    throw makeGenerationError(
      'Vertex Imagen has no image-to-image input; sourceImage cannot be honored.',
      { status: 400, code: 'SOURCE_IMAGE_UNSUPPORTED' }
    );
  }

  const startedAt = Date.now();
  // maxRetries means "retries after the first try": default 4 => 5 total
  // attempts, matching production-hardening expectations.
  const maxRetries = request.retry?.maxRetries ?? 4;
  const baseDelayMs = request.retry?.baseDelayMs ?? 1000;

  let attempts = 0;
  let lastError: GenerationError | null = null;
  let lastErrorRetryable = false;

  const requestId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  logEvent('generation.request', {
    requestId,
    numImages: request.numImages || 1,
    aspectRatio: request.aspectRatio || '1:1',
    safetyFilterLevel: request.safetyFilterLevel || 'block_only_high',
    seed: request.seed,
    estimatedCostUsd: IMAGEN_COST_PER_IMAGE * (request.numImages || 1)
  });

  while (attempts <= maxRetries) {
    try {
      attempts += 1;
      const result = await callImagen(request);
      return buildResult(request, requestId, startedAt, attempts, false, result);
    } catch (error) {
      lastError = asGenerationError(error);
      const status = lastError.status;
      lastErrorRetryable = Boolean(status && RETRYABLE_STATUS.has(status));
      if (!lastErrorRetryable || attempts > maxRetries) break;

      // Exponential backoff (capped) to play nice with quota throttling and transient outages.
      const exponent = Math.max(0, attempts - 1);
      const delayMs = Math.min(baseDelayMs * Math.pow(2, exponent), 8000);
      console.log(`[Generation] Retry ${attempts}/${maxRetries + 1} after ${delayMs}ms (status=${status})`);
      await sleep(delayMs);
    }
  }

  // Relaxed-safety fallback only after retryable failures — a non-retryable
  // error (e.g. 400 malformed request) would fail identically on the paid
  // fallback call. Declared behavior fix (spec: generation-module).
  if (request.fallback && lastErrorRetryable) {
    try {
      const fallbackRequest: GenerationRequest = {
        ...request,
        safetyFilterLevel: request.fallback.safetyFilterLevel || 'block_only_high',
        numImages: request.numImages || 1
      };
      const result = await callImagen(fallbackRequest);
      return buildResult(request, requestId, startedAt, attempts + 1, true, result);
    } catch (fallbackError) {
      lastError = asGenerationError(fallbackError);
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
