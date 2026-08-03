/*
 * The Vertex image provider.
 *
 * Despite the file name, this no longer calls Imagen. Google is retiring every
 * `imagen-*` endpoint (announced for 2026-08-17) and directs all of them to the
 * Gemini image models, so this talks to `gemini-3.1-flash-image` through the
 * same `:generateContent` shape the rest of our Vertex callers use
 * (designConversation/providers.ts, vision/referenceAnalysis.ts). The file and
 * the exported provider keep their names so the migration stays a one-file
 * diff; `provider: 'vertex-ai'` is unchanged and callers are untouched.
 *
 * Three request fields Imagen accepted have no equivalent on the Gemini image
 * models, and each is handled rather than silently dropped:
 *   - negativePrompt → folded into the prompt as an "Avoid:" clause, the same
 *     convention replicate.ts already uses for Flux/Krea.
 *   - numImages      → one image per call, so N images fan out into N parallel
 *     calls and merge in order, mirroring replicate.ts's fan-out.
 *   - seed           → not accepted; kept in metadata so stored routes and
 *     telemetry still round-trip, but it no longer pins the output.
 * `personGeneration` maps onto `imageConfig.personGeneration` (Gemini's enum).
 * Callers that relied on seed for *determinism* no longer get it.
 */
import { getGcpAccessToken } from '@/lib/google-auth-edge';
import { logEvent } from '@/lib/observability';
import type { GenerationError, GenerationRequest, GenerationResult, Provider } from './provider';
import { asGenerationError, makeGenerationError } from './provider';

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'tatt-pro';

/*
 * The Gemini image models are published globally rather than per-region, and
 * the global publisher endpoint drops the region prefix from the host. Both
 * are env-overridable so a region rollout (or a model bump) is a config change
 * rather than a deploy of this file.
 */
const IMAGE_MODEL = process.env.VERTEX_IMAGE_MODEL || 'gemini-3.1-flash-image';
const IMAGE_LOCATION = process.env.VERTEX_IMAGE_LOCATION || 'global';

/*
 * Flash Image list price at time of migration. Imagen 3 was $0.02; this only
 * feeds the cost telemetry, so a stale figure skews the spend dashboard rather
 * than any billing path.
 */
const IMAGE_COST_PER_IMAGE = Number(process.env.VERTEX_IMAGE_COST_USD || 0.039);

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/** Every category Vertex accepts a threshold for; we set them uniformly. */
const HARM_CATEGORIES = [
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT'
] as const;

/*
 * Imagen's filter vocabulary → Gemini's HarmBlockThreshold. Imagen carried two
 * generations of names (`block_only_high` and the later `block_few`), and both
 * appear in stored routes, so both spellings map. Anything unrecognized falls
 * through to the Imagen default we have always sent.
 */
const SAFETY_THRESHOLDS: Record<string, string> = {
  block_none: 'BLOCK_NONE',
  block_fewest: 'BLOCK_NONE',
  block_only_high: 'BLOCK_ONLY_HIGH',
  block_few: 'BLOCK_ONLY_HIGH',
  block_medium_and_above: 'BLOCK_MEDIUM_AND_ABOVE',
  block_some: 'BLOCK_MEDIUM_AND_ABOVE',
  block_low_and_above: 'BLOCK_LOW_AND_ABOVE',
  block_most: 'BLOCK_LOW_AND_ABOVE'
};

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

/*
 * Imagen took lowercase `allow_adult` / `dont_allow` / `allow_all`. Gemini's
 * imageConfig expects the PersonGeneration enum (ALLOW_ADULT / ALLOW_NONE /
 * ALLOW_ALL). Metadata still echoes the Imagen-shaped value callers send.
 */
function toGeminiPersonGeneration(personGeneration?: string): string {
  switch (resolvePersonGeneration(personGeneration)) {
    case 'allow_all':
      return 'ALLOW_ALL';
    case 'dont_allow':
    case 'allow_none':
      return 'ALLOW_NONE';
    case 'allow_adult':
    default:
      return 'ALLOW_ADULT';
  }
}

function resolveThreshold(safetySetting: string): string {
  return SAFETY_THRESHOLDS[safetySetting] || 'BLOCK_ONLY_HIGH';
}

/** Gemini fans out one call per image; clamp to the same 1–4 range Imagen sampleCount used. */
function resolveNumImages(numImages?: number): number {
  return Math.min(Math.max(numImages ?? 1, 1), 4);
}

function imageEndpoint(): string {
  const host =
    IMAGE_LOCATION === 'global'
      ? 'https://aiplatform.googleapis.com'
      : `https://${IMAGE_LOCATION}-aiplatform.googleapis.com`;
  return (
    `${host}/v1/projects/${PROJECT_ID}/locations/${IMAGE_LOCATION}` +
    `/publishers/google/models/${IMAGE_MODEL}:generateContent`
  );
}

/*
 * Gemini has no negative_prompt input. Same convention as replicate.ts: fold
 * the negatives into the prompt so the shield tokens still reach the model.
 */
function withAvoidClause(prompt: string, negativePrompt?: string): string {
  const negatives = (negativePrompt || '').trim();
  if (!negatives) return prompt;
  // Keep identical to replicate.ts so Vertex↔Flux fallback sees the same text.
  const base = prompt.trim().replace(/\.$/, '');
  return `${base}. Avoid: ${negatives}.`;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One call → at most one image. Callers wanting more fan out over this. */
async function callGeminiImage(
  request: GenerationRequest,
  accessToken: string,
  safetySetting: string
): Promise<string[]> {
  const response = await fetch(imageEndpoint(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: withAvoidClause(request.prompt, request.negativePrompt) }]
        }
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: request.aspectRatio || '1:1',
          personGeneration: toGeminiPersonGeneration(request.personGeneration)
        }
      },
      safetySettings: HARM_CATEGORIES.map((category) => ({
        category,
        threshold: resolveThreshold(safetySetting)
      }))
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw makeGenerationError(`Vertex image API error: ${response.status} - ${errText}`, {
      status: response.status,
      details: errText,
      code: response.status === 429 ? 'VERTEX_QUOTA_EXCEEDED' : 'VERTEX_IMAGE_ERROR'
    });
  }

  const data: {
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
    }>;
    promptFeedback?: { blockReason?: string };
  } = await response.json();

  /*
   * A safety block is a 200 with no image, not an HTTP error. Imagen surfaced
   * the same case as an empty predictions array and the caller's fallback chain
   * treated it as a failure; keep that behavior but say why, since "no image"
   * and "blocked" are very different things to debug.
   */
  const blockReason =
    data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason;

  const images = (data.candidates || []).flatMap((candidate) =>
    (candidate.content?.parts || [])
      .filter((part) => part.inlineData?.data)
      .map(
        (part) =>
          `data:${part.inlineData!.mimeType || 'image/png'};base64,${part.inlineData!.data}`
      )
  );

  if (images.length === 0) {
    throw makeGenerationError(
      `Vertex image API returned no image${blockReason ? ` (${blockReason})` : ''}`,
      {
        status: response.status,
        details: blockReason,
        code: 'VERTEX_IMAGE_NO_OUTPUT'
      }
    );
  }

  // Contract: one call → one image. Extra inlineData parts are discarded so
  // fan-out cannot overshoot the caller's requested count.
  return images.slice(0, 1);
}

/** N images = N parallel calls, merged in order (replicate.ts does the same). */
async function generateImages(
  request: GenerationRequest,
  safetySetting: string
): Promise<{ images: string[]; safetySetting: string; personGeneration: string }> {
  const accessToken = await getGcpAccessToken();
  const numImages = resolveNumImages(request.numImages);

  const runs = await Promise.all(
    Array.from({ length: numImages }, () =>
      callGeminiImage(request, accessToken, safetySetting)
    )
  );

  return {
    images: runs.flat().slice(0, numImages),
    safetySetting,
    personGeneration: resolvePersonGeneration(request.personGeneration)
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
    estimatedCostUsd: IMAGE_COST_PER_IMAGE * resolveNumImages(request.numImages)
  });

  return {
    images: result.images,
    metadata: {
      model: IMAGE_MODEL,
      provider: 'vertex-ai',
      generatedAt: new Date().toISOString(),
      durationMs,
      attempts,
      safetyFilterLevel: result.safetySetting,
      personGeneration: result.personGeneration,
      // Echoed, not honored — the Gemini image models take no seed.
      seed: request.seed,
      fallbackUsed
    }
  };
}

async function generateWithRetry(request: GenerationRequest): Promise<GenerationResult> {
  const startedAt = Date.now();
  // maxRetries means "retries after the first try": default 4 => 5 total
  // attempts, matching production-hardening expectations.
  const maxRetries = request.retry?.maxRetries ?? 4;
  const baseDelayMs = request.retry?.baseDelayMs ?? 1000;

  let attempts = 0;
  let lastError: GenerationError | null = null;
  let lastErrorRetryable = false;

  const numImages = resolveNumImages(request.numImages);
  const requestId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  logEvent('generation.request', {
    requestId,
    numImages,
    aspectRatio: request.aspectRatio || '1:1',
    safetyFilterLevel: request.safetyFilterLevel || 'block_only_high',
    seed: request.seed,
    estimatedCostUsd: IMAGE_COST_PER_IMAGE * numImages
  });

  while (attempts <= maxRetries) {
    try {
      attempts += 1;
      const result = await generateImages(
        request,
        resolveSafetySetting(request.safetyFilterLevel)
      );
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

  // Relaxed-safety fallback after retryable failures, or after a safety/empty
  // image response (VERTEX_IMAGE_NO_OUTPUT) where looser thresholds are the
  // recovery. Skip for other non-retryable errors (e.g. 400 malformed) — those
  // fail identically on the paid fallback call. Declared behavior fix (spec:
  // generation-module), extended for Gemini's 200-with-no-image safety blocks.
  const fallback = request.fallback;
  if (fallback && (lastErrorRetryable || lastError?.code === 'VERTEX_IMAGE_NO_OUTPUT')) {
    try {
      const result = await generateImages(
        { ...request, numImages },
        resolveSafetySetting(fallback.safetyFilterLevel || 'block_only_high')
      );
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
