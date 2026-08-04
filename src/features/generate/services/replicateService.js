/**
 * Replicate API Service for Tattoo Design Generation
 *
 * This service handles all interactions with Replicate's Flux/Krea models
 * to generate custom tattoo designs based on user input.
 *
 * Budget Considerations:
 * - Flux Dev costs ~$0.025 per image, Schnell ~$0.003, Krea 2 ~$0.035
 * - Generating 4 variations on Flux Dev = ~$0.10 per request
 * - Implement caching and rate limiting to control costs
 */

import { buildPrompt, validateInput } from '@/config/promptTemplates';
import {
  fetchJSON,
  postJSON,
  FetchError,
  ErrorCodes,
  getUserErrorMessage,
  isErrorCode
} from '@/services/fetchWithAbort';
import { routeGeneration } from '@/services/generation';
import { getApiAuthHeaders } from '@/lib/client-api-auth';
import { DEMO_MOCK_IMAGES } from '@/lib/demo-images';

// Proxy server configuration (injected via env)
// Use Next.js relative API path
const PROXY_URL = '/api';
console.log('[Replicate] Service Config:', { PROXY_URL, demoMode: process.env.NEXT_PUBLIC_DEMO_MODE });
const VERTEX_GENERATE_URL = '/api/v1/generate';

// Demo mode for testing without API calls
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Mock tattoo images for demo mode — the shared repo-local set
// (src/lib/demo-images.ts); two of the Unsplash photos this list once
// carried 404'd.
const MOCK_IMAGES = DEMO_MOCK_IMAGES;

// Ratios each model's input schema actually accepts (mirrors the server
// generation module, verified against the models' published OpenAPI schemas).
const FLUX_ASPECT_RATIOS = new Set(['1:1', '16:9', '21:9', '3:2', '2:3', '4:5', '5:4', '3:4', '4:3', '9:16', '9:21']);
const KREA_ASPECT_RATIOS = new Set(['1:1', '4:3', '3:2', '16:9', '2.35:1', '4:5', '2:3', '9:16']);

// Model configuration. Official Replicate models are invoked by slug (no
// version hash). None of the Flux/Krea family accepts a negative_prompt
// input — negatives are folded into the prompt as an "Avoid:" clause.
export const AI_MODELS = {
  'flux-dev': {
    id: 'flux-dev',
    name: 'FLUX.1 Dev',
    slug: 'black-forest-labs/flux-dev',
    description: 'Primary generalist — best linework and prompt adherence.',
    cost: 0.025,
    supportsRGBA: true,
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
    description: 'The fastest way to see your ideas come to life.',
    cost: 0.003,
    supportsRGBA: true,
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
    description: 'Expressive illustration, anime, and painterly styles.',
    cost: 0.035,
    supportsRGBA: false,
    supportsNumOutputs: false, // one output per prediction — callers fan out
    aspectRatios: KREA_ASPECT_RATIOS,
    // Krea's schema has no 3:4 — 4:5 is the nearest portrait ratio it takes.
    aspectRemap: { '3:4': '4:5' },
    params: {}
  },
  imagen3: {
    id: 'imagen3',
    name: 'Hyper-Realism',
    version: 'imagegeneration@006',
    description: 'Unbelievable detail that looks like a photo.',
    cost: 0.03, // Approximate Vertex AI pricing
    provider: 'vertex-ai', // Special flag for Vertex AI models
    supportsRGBA: false,
    params: {
      num_outputs: 4,
      width: 1024,
      height: 1024,
      aspect_ratio: '1:1',
      safety_filter_level: 'block_only_high', // Fixed: valid option
      person_generation: 'allow_adult'
    }
  }
};

/*
 * Default model.
 *
 * This is the Studio page's only model selection — `imagen3` is not offered
 * anywhere in the UI, so DEFAULT_MODEL was the single live path from /studio
 * to Vertex. It bypassed `modelRoutingRules.js` entirely, which is why the
 * routing-table change that took realism off Google did not cover it.
 *
 * flux_dev for the same reason the routing table now says so: the Gemini image
 * models that replace the retired Imagen endpoints have no negative-prompt
 * input, so the "no text" instruction is only prose in the prompt and the
 * model wrote banner lettering into 2 of 2 measured designs. Permanent
 * lettering in skin is not a risk worth a marginal quality delta, and Flux was
 * already the shipped fallback for these styles.
 */
const DEFAULT_MODEL = 'flux-dev';
const PREVIEW_MODEL = 'flux-schnell';

// Ids from the retired SDXL catalog must keep resolving — stored model picks
// and old callers land on the closest current model.
const LEGACY_MODEL_ALIASES = {
  sdxl: 'flux-dev',
  tattoo: 'flux-dev',
  dreamshaper: 'flux-schnell',
  animeXL: 'krea2'
};

function resolveModelId(modelId) {
  if (AI_MODELS[modelId]) return modelId;
  return LEGACY_MODEL_ALIASES[modelId] || modelId;
}

// Flux/Krea size output via aspect_ratio, not width/height — high-res vs
// preview now only differ in output count.
const PREVIEW_OVERRIDES = {
  num_outputs: 1
};

const HIGH_RES_OVERRIDES = {
  num_outputs: 1
};

/**
 * Flux/Krea have no negative_prompt input — fold the negatives into the
 * prompt itself, which these prompt-adherent models handle well.
 */
function withAvoidClause(prompt, negativePrompt) {
  const negatives = (negativePrompt || '').trim();
  if (!negatives) return prompt;
  const base = prompt.trim().replace(/\.$/, '');
  return `${base}. Avoid: ${negatives}.`;
}

function resolveAspectRatio(model, aspectRatio) {
  if (!aspectRatio) return '1:1';
  if (model.aspectRatios.has(aspectRatio)) return aspectRatio;
  return model.aspectRemap[aspectRatio] || '1:1';
}

// Budget tracking (stored in localStorage for MVP)
const BUDGET_STORAGE_KEY = 'tattester_api_usage';

/**
 * Track API usage for budget monitoring
 * In production, this would be server-side
 */
function trackAPIUsage(requestCost = 0.022) {
  try {
    const usage = JSON.parse(localStorage.getItem(BUDGET_STORAGE_KEY) || '{"total": 0, "requests": []}');

    usage.total += requestCost;
    usage.requests.push({
      timestamp: new Date().toISOString(),
      cost: requestCost
    });

    // Keep only last 100 requests for storage efficiency
    if (usage.requests.length > 100) {
      usage.requests = usage.requests.slice(-100);
    }

    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(usage));

    console.log(`[Budget Tracker] Total spent: $${usage.total.toFixed(2)}`);

    return usage;
  } catch (error) {
    console.error('Error tracking API usage:', error);
    return null;
  }
}

/**
 * Get current API usage statistics
 */
export function getAPIUsage() {
  try {
    const usage = JSON.parse(localStorage.getItem(BUDGET_STORAGE_KEY) || '{"total": 0, "requests": []}');

    const today = new Date().toISOString().split('T')[0];
    const todayRequests = usage.requests.filter(req =>
      req.timestamp.startsWith(today)
    );

    const todayCost = todayRequests.reduce((sum, req) => sum + req.cost, 0);

    return {
      totalSpent: usage.total,
      totalRequests: usage.requests.length,
      todaySpent: todayCost,
      todayRequests: todayRequests.length,
      remainingBudget: 500 - usage.total
    };
  } catch (error) {
    console.error('Error getting API usage:', error);
    return null;
  }
}

/**
 * Run one prediction through the proxy: create by model slug, then poll to a
 * settled state with abort support. Returns the final prediction object.
 */
async function runProxyPrediction(model, predictionInput, authHeaders, signal) {
  const prediction = await postJSON(
    `${PROXY_URL}/predictions`,
    {
      model: model.slug,
      input: predictionInput
    },
    {
      headers: authHeaders
    }
  );

  console.log('[Replicate] Prediction created:', prediction.id);

  // Poll for completion with abort support
  let result = prediction;
  const maxAttempts = 60; // 60 attempts × 2 seconds = 2 minutes max
  let attempts = 0;

  while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
    // Check for abort before waiting
    if (signal?.aborted) {
      console.log('[Replicate] Polling cancelled by user');
      throw new Error('Generation cancelled');
    }

    // Abortable wait
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 2000);
      signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Generation cancelled'));
      }, { once: true });
    });

    // Check abort before fetching
    if (signal?.aborted) {
      console.log('[Replicate] Polling cancelled by user');
      throw new Error('Generation cancelled');
    }

    result = await fetchJSON(`${PROXY_URL}/predictions/${prediction.id}`, {
      signal,
      headers: authHeaders
    });
    attempts++;

    console.log(`[Replicate] Status: ${result.status} (attempt ${attempts}/${maxAttempts})`);
  }

  if (result.status === 'failed') {
    throw new Error(result.error || 'Prediction failed');
  }

  if (result.status !== 'succeeded') {
    throw new Error('Prediction timed out');
  }

  return result;
}

/**
 * Generate tattoo designs using Replicate AI models
 *
 * @param {Object} userInput - User's design parameters
 * @param {string} userInput.style - Tattoo style (traditional, neoTraditional, etc.)
 * @param {string} userInput.subject - Subject description (e.g., "wolf and moon")
 * @param {string} userInput.bodyPart - Body part placement
 * @param {string} userInput.size - Design size (small, medium, large)
 * @param {string} userInput.aiModel - AI model to use (optional, will be auto-selected if not provided)
 * @param {string} modelId - Optional explicit model ID to use (overrides userInput.aiModel)
 * @param {AbortSignal} signal - Optional abort signal to cancel polling
 * @returns {Promise<Object>} Generated design data with image URLs
 */
export async function generateTattooDesign(userInput, modelId = null, signal = null, options = {}) {
  // Validate input
  const validation = validateInput(userInput);
  if (!validation.isValid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
  }

  // Get selected model: explicit modelId > userInput.aiModel > default
  const requestedModelId = modelId || userInput.aiModel || DEFAULT_MODEL;
  const selectedModelId = resolveModelId(requestedModelId);
  let model = AI_MODELS[selectedModelId];

  if (!model) {
    console.warn(`[Replicate] Invalid model: ${selectedModelId}, falling back to default`);
    model = AI_MODELS[DEFAULT_MODEL];
    if (!model) {
      throw new Error(`Invalid model: ${selectedModelId} and default model not found`);
    }
  }

  // Detect if this is a council-enhanced prompt
  // Council prompts are already complete and should not be wrapped in templates
  const isCouncilEnhanced = userInput.subject && (
    userInput.subject.includes('masterfully composed') ||
    userInput.subject.includes('Character details:') ||
    userInput.subject.includes('photorealistic') ||
    userInput.subject.length > 500 // Long prompts are likely council-enhanced
  );

  let finalPrompt;
  let negativePrompt;

  if (isCouncilEnhanced) {
    // Use the enhanced prompt directly without template wrapping
    console.log('[Replicate] Using council-enhanced prompt (skipping template)');
    finalPrompt = userInput.subject;
    negativePrompt = userInput.negativePrompt || 'blurry, low quality, distorted, watermark, text, signature, cartoon, childish, unrealistic anatomy, multiple people, cluttered background, oversaturated, low contrast, pixelated, amateur, messy linework';
  } else {
    // Build optimized prompt using templates
    const promptConfig = buildPrompt(userInput);
    finalPrompt = promptConfig.prompt;
    negativePrompt = promptConfig.negativePrompt;
  }

  const inputOverrides = options.inputOverrides || {};
  const outputFormat = options.outputFormat || 'png';
  const enableRGBA = options.enableRGBA === true;
  const rgbaEnabled = enableRGBA && model.supportsRGBA;
  const allowFallback = options.allowFallback !== false;

  console.log('[Replicate] Using model:', model.name);
  console.log('[Replicate] Generating tattoo design with prompt:', finalPrompt);

  // DEMO MODE: Return mock data without API calls
  if (DEMO_MODE) {
    console.log('[Replicate] DEMO MODE - Using mock images');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    const demoImages = inputOverrides.num_outputs === 1
      ? [MOCK_IMAGES[0]]
      : MOCK_IMAGES;

    const output = {
      success: true,
      images: demoImages,
      metadata: {
        generatedAt: new Date().toISOString(),
        prompt: finalPrompt,
        negativePrompt: negativePrompt,
        demoMode: true,
        councilEnhanced: isCouncilEnhanced,
        mode: options.mode || 'standard',
        modelId: model.id,
        modelName: model.name,
        outputFormat,
        rgbaReady: rgbaEnabled,
        dpi: options.dpi || null,
        preview: options.mode === 'preview',
        parameters: {
          ...model.params,
          ...inputOverrides
        }
      },
      userInput
    };

    console.log('[Replicate] ✓ Demo generation complete');
    return output;
  }

  try {
    if (model.provider === 'vertex-ai') {
      if (!VERTEX_GENERATE_URL) {
        throw new FetchError(
          'Proxy URL not configured. This service requires Next.js API routes.',
          ErrorCodes.NETWORK_ERROR
        );
      }

      const resolvedOutputs = inputOverrides.num_outputs || model.params.num_outputs || 1;
      const resolvedWidth = inputOverrides.width || model.params.width;
      const resolvedHeight = inputOverrides.height || model.params.height;
      const vertexPayload = {
        prompt: finalPrompt,
        negativePrompt,
        style: userInput.style,
        bodyPart: userInput.bodyPart,
        size: userInput.size,
        width: resolvedWidth,
        height: resolvedHeight,
        sampleCount: resolvedOutputs,
        aspectRatio: inputOverrides.aspect_ratio || model.params.aspect_ratio || '1:1',
        outputFormat,
        safetyFilterLevel: model.params.safety_filter_level,
        personGeneration: model.params.person_generation,
        seed: inputOverrides.seed
      };

      const vertexResponse = await postJSON(VERTEX_GENERATE_URL, vertexPayload, { signal });

      const generationCost = vertexResponse?.cost?.total ?? model.cost * resolvedOutputs;
      trackAPIUsage(generationCost);

      return {
        success: true,
        images: vertexResponse.images || [],
        metadata: {
          generatedAt: new Date().toISOString(),
          prompt: finalPrompt,
          negativePrompt: negativePrompt,
          councilEnhanced: isCouncilEnhanced,
          mode: options.mode || 'standard',
          modelId: model.id,
          modelName: model.name,
          outputFormat,
          rgbaReady: rgbaEnabled,
          dpi: options.dpi || null,
          preview: options.mode === 'preview',
          parameters: vertexPayload,
          provider: 'vertex-ai',
          usage: vertexResponse.usage || null,
          cost: vertexResponse.cost || null
        },
        userInput
      };
    }

    // Check if proxy URL is configured
    if (!PROXY_URL) {
      throw new FetchError(
        'Proxy URL not configured. This service requires Next.js API routes.',
        ErrorCodes.NETWORK_ERROR
      );
    }

    // Step 1: Build the Flux/Krea input — prompt (negatives folded in),
    // per-model aspect ratio, output count, optional integer seed. The old
    // SDXL knobs (width/height, scheduler, guidance_scale, lora_scale) have
    // no equivalent on these models.
    const numOutputs = Math.min(Math.max(inputOverrides.num_outputs || 4, 1), 4);
    const predictionInput = {
      ...model.params,
      prompt: withAvoidClause(finalPrompt, negativePrompt),
      aspect_ratio: resolveAspectRatio(model, inputOverrides.aspect_ratio)
    };

    if (model.supportsNumOutputs) {
      predictionInput.num_outputs = numOutputs;
    }

    if (inputOverrides.seed !== undefined && inputOverrides.seed !== '') {
      const seed = Number(inputOverrides.seed);
      if (Number.isFinite(seed)) predictionInput.seed = Math.trunc(seed);
    }

    if (rgbaEnabled) {
      predictionInput.output_format = outputFormat;
    }

    const authHeaders = await getApiAuthHeaders();

    // Step 2: Create and poll via the proxy. Single-output models (Krea)
    // fan out: N parallel predictions merged in order, so callers asking
    // for 4 images get 4 regardless of model.
    const fanOut = model.supportsNumOutputs ? 1 : numOutputs;
    const results = await Promise.all(
      Array.from({ length: fanOut }, () => runProxyPrediction(model, predictionInput, authHeaders, signal))
    );

    const images = results
      .flatMap(result => (Array.isArray(result.output) ? result.output : [result.output]))
      .filter(Boolean);

    // Track API usage with actual model cost
    trackAPIUsage(model.cost * numOutputs);

    // Format response
    const output = {
      success: true,
      images,
      metadata: {
        generatedAt: new Date().toISOString(),
        prompt: finalPrompt,
        negativePrompt: negativePrompt,
        councilEnhanced: isCouncilEnhanced,
        mode: options.mode || 'standard',
        modelId: model.id,
        modelName: model.name,
        outputFormat,
        rgbaReady: rgbaEnabled,
        dpi: options.dpi || null,
        preview: options.mode === 'preview',
        parameters: predictionInput
      },
      userInput
    };

    console.log(`[Replicate] Successfully generated ${output.images.length} variations`);

    return output;

  } catch (error) {
    console.error('[Replicate] Generation error:', error);

    if (model.provider === 'vertex-ai' && allowFallback) {
      const shouldFallback = !(error instanceof FetchError) || [
        ErrorCodes.SERVER_ERROR,
        ErrorCodes.NETWORK_ERROR,
        ErrorCodes.TIMEOUT
      ].includes(error.code);

      if (shouldFallback) {
        // DEFAULT_MODEL is a Replicate model now, so it needs no imagen3
        // guard here — falling back to it can no longer re-enter Vertex.
        console.warn('[Replicate] Vertex generation failed, falling back to Replicate');
        return generateTattooDesign(userInput, DEFAULT_MODEL, signal, {
          ...options,
          allowFallback: false
        });
      }
    }

    // Handle FetchError instances with user-friendly messages
    if (error instanceof FetchError) {
      const userMessage = getUserErrorMessage(error);
      throw new Error(userMessage);
    }

    // Handle specific error types from Replicate API
    if (error.message.includes('authentication') || error.message.includes('401')) {
      throw new Error('Invalid Replicate API token. Please check your server configuration.');
    }

    if (error.message.includes('insufficient credits')) {
      throw new Error('Insufficient Replicate credits. Please add credits to your account.');
    }

    throw new Error(`Failed to generate design: ${error.message}`);
  }
}

/**
 * Retry logic for failed generations
 * Implements exponential backoff with retry budget cap
 *
 * @param {Object} userInput - Design parameters
 * @param {string} modelId - Optional model ID to use
 * @param {AbortSignal} signal - Optional abort signal
 * @param {number} maxAttempts - Maximum total attempts (default: 5)
 * @returns {Promise<Object>} Generated design data
 */
export async function generateWithRetry(userInput, modelId = null, signal = null, maxAttempts = 5, options = {}) {
  let lastError;
  const retryBudget = Math.max(1, Number(maxAttempts) || 5);

  for (let attempt = 1; attempt <= retryBudget; attempt++) {
    try {
      console.log(`[Replicate] Generation attempt ${attempt}/${retryBudget}`);
      return await generateTattooDesign(userInput, modelId, signal, options);
    } catch (error) {
      lastError = error;

      // Don't retry on cancellation
      if (error.message.includes('cancelled') || signal?.aborted) {
        console.log('[Replicate] Retry aborted by user');
        throw error;
      }

      // Don't retry on authentication or validation errors
      if (
        error.message.includes('authentication') ||
        error.message.includes('Invalid input') ||
        error.message.includes('not configured')
      ) {
        throw error;
      }

      // Check if retry budget exhausted
      if (attempt >= retryBudget) {
        console.error(`[Replicate] Retry budget exhausted (${retryBudget} attempts)`);
        throw new Error(`Failed after ${retryBudget} attempts: ${error.message}`);
      }

      // Wait before retrying (exponential backoff, capped).
      // Matches the Vertex/Imagen retry posture (fast first retry; cap to avoid runaway waits).
      const waitTime = Math.min(1000 * Math.pow(2, Math.max(0, attempt - 1)), 8000); // 1s, 2s, 4s, 8s...
      console.log(`[Replicate] Retrying in ${waitTime / 1000}s... (${retryBudget - attempt} retries left)`);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, waitTime);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Retry cancelled'));
        }, { once: true });
      });
    }
  }

  throw lastError;
}

/**
 * Health check result types
 */
export const HealthStatus = {
  HEALTHY: 'healthy',
  UNAVAILABLE: 'unavailable',
  AUTH_REQUIRED: 'auth_required',
  NOT_CONFIGURED: 'not_configured'
};

/**
 * Check if Replicate service is configured and accessible
 * Returns typed health status for UI banner display
 *
 * @returns {Promise<Object>} Health status with banner message
 */
export async function checkServiceHealth() {
  try {
    if (!PROXY_URL) {
      return {
        status: HealthStatus.NOT_CONFIGURED,
        healthy: false,
        error: 'Proxy URL not configured. This service requires Next.js API routes.',
        code: ErrorCodes.NETWORK_ERROR,
        banner: {
          type: 'error',
          message: 'Backend not configured. Please check your environment settings.',
          action: 'Check .env file'
        }
      };
    }

    // Check if proxy server is running (health endpoint doesn't require auth)
    const data = await fetchJSON(`${PROXY_URL}/health`, { includeAuth: false });

    if (!data.hasToken) {
      return {
        status: HealthStatus.AUTH_REQUIRED,
        healthy: false,
        error: 'API token not configured on server',
        code: ErrorCodes.AUTH_INVALID,
        banner: {
          type: 'warning',
          message: 'API credentials not configured on server.',
          action: 'Contact administrator'
        }
      };
    }

    return {
      status: HealthStatus.HEALTHY,
      healthy: true,
      message: 'Replicate service is ready',
      authRequired: data.authRequired
    };
  } catch (error) {
    if (error instanceof FetchError) {
      return {
        status: HealthStatus.UNAVAILABLE,
        healthy: false,
        error: getUserErrorMessage(error),
        code: error.code,
        banner: {
          type: 'error',
          message: error.code === ErrorCodes.AUTH_INVALID
            ? 'Authentication failed. Check your credentials.'
            : 'Cannot connect to server. Make sure the backend is running.',
          action: error.code === ErrorCodes.NETWORK_ERROR ? 'Start server' : 'Check auth'
        }
      };
    }

    return {
      status: HealthStatus.UNAVAILABLE,
      healthy: false,
      error: 'Cannot connect to proxy server. Make sure the backend is running.',
      code: ErrorCodes.NETWORK_ERROR,
      banner: {
        type: 'error',
        message: 'Backend server is offline.',
        action: 'Run npm run server'
      }
    };
  }
}

/**
 * Get estimated cost for a generation request
 */
export function getEstimatedCost(numVariations = 4) {
  const model = AI_MODELS[DEFAULT_MODEL] || AI_MODELS['flux-dev'];
  const costPerImage = model?.cost || 0.025;
  return {
    perImage: costPerImage,
    total: costPerImage * numVariations,
    formatted: `$${(costPerImage * numVariations).toFixed(4)}`
  };
}

/**
 * Rate limiter for budget control
 * Prevents too many requests in short time period
 */
const rateLimiter = {
  requests: [],
  maxRequestsPerMinute: 60, // Increased to 60 (Replicate's limit with billing)

  canMakeRequest() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old requests
    this.requests = this.requests.filter(timestamp => timestamp > oneMinuteAgo);

    return this.requests.length < this.maxRequestsPerMinute;
  },

  recordRequest() {
    this.requests.push(Date.now());
  },

  getTimeUntilNextRequest() {
    if (this.canMakeRequest()) return 0;

    const oldestRequest = Math.min(...this.requests);
    const timeUntilExpiry = 60000 - (Date.now() - oldestRequest);

    return Math.max(0, timeUntilExpiry);
  }
};

/**
 * Generate with rate limiting
 *
 * @param {Object} userInput - Design parameters
 * @param {string} modelId - Optional model ID to use
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<Object>} Generated design data
 */
export async function generateWithRateLimit(userInput, modelId = null, signal = null, options = {}) {
  if (!rateLimiter.canMakeRequest()) {
    const waitTime = rateLimiter.getTimeUntilNextRequest();
    throw new Error(`Rate limit reached. Please wait ${Math.ceil(waitTime / 1000)} seconds before generating again.`);
  }

  rateLimiter.recordRequest();
  if (options.fallbackChain && options.fallbackChain.length > 0) {
    return generateWithFallbackChain(userInput, modelId, signal, 5, options);
  }
  return generateWithRetry(userInput, modelId, signal, 5, options);
}

async function generateWithFallbackChain(userInput, modelId, signal, maxRetries, options) {
  const fallbackChain = options.fallbackChain || [];
  const modelsToTry = [modelId, ...fallbackChain].filter(Boolean);
  let lastError;

  for (let i = 0; i < modelsToTry.length; i += 1) {
    const candidate = modelsToTry[i];
    try {
      console.log(`[Replicate] Using model: ${candidate}`);
      return await generateWithRetry(userInput, candidate, signal, maxRetries, {
        ...options,
        fallbackChain: null
      });
    } catch (error) {
      lastError = error;
      const message = error?.message || '';

      if (message.includes('cancelled') || signal?.aborted) {
        throw error;
      }

      if (
        message.includes('authentication') ||
        message.includes('Invalid input') ||
        message.includes('not configured')
      ) {
        throw error;
      }

      if (i < modelsToTry.length - 1) {
        console.warn(`[Replicate] Model ${candidate} failed. Trying fallback...`);
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

/**
 * Generate a low-res preview using the turbo model
 * Returns a single image optimized for fast feedback.
 */
export async function generatePreviewDesign(userInput, options = {}) {
  const hasExplicitModel = Boolean(options.modelId || userInput.aiModel);
  const routing = hasExplicitModel ? null : routeGeneration({ ...userInput, mode: 'preview' });
  const resolvedModelId = options.modelId || userInput.aiModel || routing?.modelId || PREVIEW_MODEL;
  const resolvedInput = routing
    ? { ...userInput, negativePrompt: routing.negativePrompt }
    : userInput;

  const inputOverrides = {
    ...PREVIEW_OVERRIDES,
    ...(options.inputOverrides || {})
  };

  if (routing?.aspectRatio) {
    inputOverrides.aspect_ratio = routing.aspectRatio;
  }

  return generateWithRateLimit(resolvedInput, resolvedModelId, options.signal || null, {
    mode: 'preview',
    dpi: 72,
    outputFormat: 'png',
    enableRGBA: true,
    inputOverrides,
    fallbackChain: routing?.fallbackChain || null
  });
}

/**
 * Generate a high-res design with 300 DPI metadata
 * Supports RGBA output when the model allows it.
 */
export async function generateHighResDesign(userInput, options = {}) {
  const hasExplicitModel = Boolean(options.modelId || userInput.aiModel);
  const routing = hasExplicitModel ? null : routeGeneration({ ...userInput, mode: options.finalize ? 'final' : 'refine' });
  const modelId = options.modelId || userInput.aiModel || routing?.modelId || DEFAULT_MODEL;
  const resolvedInput = routing
    ? { ...userInput, negativePrompt: routing.negativePrompt }
    : userInput;
  // Step counts are baked into each model's params (Schnell and Krea take
  // none at all), so finalize no longer escalates num_inference_steps.
  const inputOverrides = {
    ...HIGH_RES_OVERRIDES,
    ...(options.inputOverrides || {})
  };

  if (routing?.aspectRatio) {
    inputOverrides.aspect_ratio = routing.aspectRatio;
  }

  return generateWithRateLimit(resolvedInput, modelId, options.signal || null, {
    mode: options.finalize ? 'final' : 'refine',
    dpi: 300,
    outputFormat: 'png',
    enableRGBA: options.enableRGBA !== false,
    inputOverrides,
    fallbackChain: routing?.fallbackChain || null
  });
}
