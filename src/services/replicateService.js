/**
 * Replicate API Service for Tattoo Design Generation
 *
 * This service handles all interactions with Replicate's SDXL model
 * to generate custom tattoo designs based on user input.
 *
 * Budget Considerations:
 * - SDXL costs ~$0.0055 per generation
 * - Generating 4 variations = ~$0.022 per request
 * - With $500 budget, that's ~22,700 variations or ~5,675 requests
 * - Implement caching and rate limiting to control costs
 */

import { buildPrompt, validateInput } from '../config/promptTemplates.js';
import {
  fetchJSON,
  postJSON,
  FetchError,
  ErrorCodes,
  getUserErrorMessage,
  isErrorCode
} from './fetchWithAbort.js';
import { routeGeneration } from './generationRouter.js';

// Proxy server configuration (injected via env)
const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://127.0.0.1:3002/api';
const VERTEX_GENERATE_URL = PROXY_URL ? `${PROXY_URL}/v1/generate` : null;

if (!PROXY_URL) {
  console.error('[Replicate] VITE_PROXY_URL not configured. Set it in your .env file.');
}

// Demo mode for testing without API calls
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// Mock tattoo images for demo mode (using placeholder service)
const MOCK_IMAGES = [
  'https://images.unsplash.com/photo-1565058379802-bbe93b2f703f?w=1024&h=1024&fit=crop', // Tattoo 1
  'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=1024&h=1024&fit=crop', // Tattoo 2
  'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=1024&h=1024&fit=crop', // Tattoo 3
  'https://images.unsplash.com/photo-1590246814883-57c511e76729?w=1024&h=1024&fit=crop'  // Tattoo 4
];

// Model configuration
export const AI_MODELS = {
  tattoo: {
    id: 'tattoo',
    name: 'Classic Flash',
    version: 'anotherjesse/amy-tattoo-test-1:0e345aaf74965ae98fb83ca9c65376ee42da5c7837d88c648ddc5d3cba1f35dc',
    description: 'Old-school bold lines and solid colors.',
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
    description: 'Bright, vibrant, and energetic character styles.',
    cost: 0.03, // ~$0.12 / 4 images (based on p50 estimate)
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
    description: 'The fastest way to see your ideas come to life.',
    cost: 0.001, // ~$0.0039 / 4 images (extremely cheap!)
    supportsRGBA: true,
    params: {
      num_outputs: 4,
      width: 1024,
      height: 1024,
      scheduler: 'K_EULER',
      num_inference_steps: 6, // Turbo optimized
      guidance_scale: 2
    }
  },
  sdxl: {
    id: 'sdxl',
    name: 'Studio Grade',
    version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    description: 'Our most versatile engine for any custom idea.',
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

// Default model
const DEFAULT_MODEL = 'imagen3';
const PREVIEW_MODEL = 'dreamshaper';

const PREVIEW_OVERRIDES = {
  num_outputs: 1,
  width: 512,
  height: 512,
  num_inference_steps: 4,
  guidance_scale: 2
};

const HIGH_RES_OVERRIDES = {
  num_outputs: 1,
  width: 1024,
  height: 1024
};

// Budget tracking (stored in localStorage for MVP)
const BUDGET_STORAGE_KEY = 'tattester_api_usage';

/**
 * Estimate token count for a prompt string
 * Uses simple approximation: ~1.3 tokens per word (GPT-2 tokenizer)
 * More accurate than character count for prompt validation
 * 
 * @param {string} text - Text to estimate tokens for
 * @returns {number} Estimated token count
 */
export function estimateTokenCount(text) {
  if (!text || typeof text !== 'string') return 0;
  // Split on whitespace and estimate 1.3 tokens per word
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.3);
}

/**
 * Validate prompt length doesn't exceed model capabilities
 * SDXL can handle 500 tokens, but 450+ starts affecting quality
 * 
 * @param {string} prompt - Prompt to validate
 * @param {number} maxTokens - Maximum allowed tokens (default: 450)
 * @throws {Error} If prompt exceeds max tokens
 */
export function validatePromptLength(prompt, maxTokens = 450) {
  const tokens = estimateTokenCount(prompt);
  
  if (tokens > maxTokens) {
    throw new Error(
      `Prompt too long (${tokens} tokens, max ${maxTokens}). ` +
      `Try removing details or using a simpler subject. ` +
      `(Council enhancement may have added ${tokens - 100} tokens.)`
    );
  }
  
  if (tokens > 400) {
    console.warn(`[Replicate] Prompt is getting long (${tokens} tokens). Quality may decrease.`);
  }
}

/**
 * Get aspect ratio guidance for prompt based on body placement
 * Helps SDXL generate images in correct proportions
 * 
 * @param {string} bodyPart - Body part for placement
 * @param {number} aspectRatio - Optional explicit aspect ratio
 * @returns {string} Prompt guidance text
 */
export function getAspectRatioGuidance(bodyPart, aspectRatio = null) {
  const ratioGuide = {
    forearm: 'tall vertical composition, portrait aspect ratio (1:3), optimized for forearm placement',
    calf: 'tall vertical composition, portrait aspect ratio (1:2.5), optimized for calf placement',
    thigh: 'tall vertical composition, portrait aspect ratio (1:2), optimized for thigh placement',
    bicep: 'medium vertical composition, portrait aspect ratio (1:1.5), circular flow for arm',
    chest: 'square composition, centered design, portrait aspect ratio (1:1), focal point in center',
    back: 'large full composition, wide landscape orientation (2:3), flowing design for back',
    shoulder: 'square to slightly vertical, portrait aspect ratio (1:1.2), shoulder-focused placement',
    spine: 'tall vertical composition, portrait aspect ratio (1:4), line-based design for spine',
    ankle: 'compact vertical composition, portrait aspect ratio (1:1.5), small focused design',
    wrist: 'very compact horizontal composition, landscape aspect ratio (3:1), delicate fine work',
    neck: 'small focused composition, square aspect ratio (1:1), placement above chest',
    hand: 'small detailed composition, square aspect ratio (1:1), intricate fine line work'
  };

  let guidance = ratioGuide[bodyPart] || 'balanced composition, square aspect ratio (1:1)';
  
  // Override with explicit aspect ratio if provided
  if (aspectRatio) {
    const width = 1024;
    const height = Math.round(width / aspectRatio);
    guidance += ` (${width}x${height}px)`;
  }
  
  return guidance;
}

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
  const selectedModelId = modelId || userInput.aiModel || DEFAULT_MODEL;
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
    
    // CRITICAL: Validate token count for council-enhanced prompts
    try {
      validatePromptLength(finalPrompt);
    } catch (validationError) {
      console.error('[Replicate] Prompt validation failed:', validationError.message);
      throw validationError;
    }
  } else {
    // Build optimized prompt using templates
    const promptConfig = buildPrompt(userInput);
    finalPrompt = promptConfig.prompt;
    negativePrompt = promptConfig.negativePrompt;

    // Add model-specific prompt prefix if needed
    if (model.promptPrefix) {
      finalPrompt = `${model.promptPrefix} ${finalPrompt}`;
    }
    
    // Add aspect ratio guidance to prompt
    const bodyPart = userInput.bodyPart || 'chest';
    const aspectRatioGuidance = getAspectRatioGuidance(bodyPart, userInput.placement?.aspectRatio);
    finalPrompt += ` [${aspectRatioGuidance}]`;
    
    // Validate token count
    try {
      validatePromptLength(finalPrompt);
    } catch (validationError) {
      console.error('[Replicate] Prompt validation failed:', validationError.message);
      throw validationError;
    }
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
          'Proxy URL not configured. Set VITE_PROXY_URL in your .env file.',
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
        'Proxy URL not configured. Set VITE_PROXY_URL in your .env file.',
        ErrorCodes.NETWORK_ERROR
      );
    }

    // Step 1: Create prediction via proxy server
    const predictionInput = {
      ...model.params,
      ...inputOverrides,
      prompt: finalPrompt,
      negative_prompt: negativePrompt
    };

    if (rgbaEnabled) {
      predictionInput.output_format = outputFormat;
      predictionInput.output_quality = 100;
    }

    const prediction = await postJSON(`${PROXY_URL}/predictions`, {
      version: model.version,
      input: predictionInput
    });

    console.log('[Replicate] Prediction created:', prediction.id);

    // Step 2: Poll for completion with abort support
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

      result = await fetchJSON(`${PROXY_URL}/predictions/${prediction.id}`, { signal });
      attempts++;

      console.log(`[Replicate] Status: ${result.status} (attempt ${attempts}/${maxAttempts})`);
    }

    if (result.status === 'failed') {
      throw new Error(result.error || 'Prediction failed');
    }

    if (result.status !== 'succeeded') {
      throw new Error('Prediction timed out');
    }

    // Track API usage with actual model cost
    const resolvedOutputs = predictionInput.num_outputs || model.params.num_outputs || 1;
    const generationCost = model.cost * resolvedOutputs;
    trackAPIUsage(generationCost);

    // Format response
    const output = {
      success: true,
      images: Array.isArray(result.output) ? result.output : [result.output],
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
        console.warn('[Replicate] Vertex generation failed, falling back to Replicate');
        return generateTattooDesign(userInput, DEFAULT_MODEL === 'imagen3' ? 'sdxl' : DEFAULT_MODEL, signal, {
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
 * Implements intelligent retry strategy:
 * - Retries ONLY on transient/network errors
 * - Fails immediately on permanent errors (auth, validation, etc.)
 * - Uses exponential backoff: 2s, 4s, 8s, 16s, 16s...
 *
 * @param {Object} userInput - Design parameters
 * @param {string} modelId - Optional model ID to use
 * @param {AbortSignal} signal - Optional abort signal
 * @param {number} maxRetries - Maximum retry attempts (default: 5)
 * @returns {Promise<Object>} Generated design data
 */
export async function generateWithRetry(userInput, modelId = null, signal = null, maxRetries = 5, options = {}) {
  let lastError;
  
  // Determine if an error is transient (should retry) or permanent (should fail immediately)
  function isTransientError(error) {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') ||
           msg.includes('503') ||
           msg.includes('429') || // rate limit
           msg.includes('rate limit') ||
           msg.includes('connection') ||
           msg.includes('econnreset') ||
           msg.includes('enotfound') ||
           msg.includes('temporarily unavailable');
  }
  
  function isPermanentError(error) {
    const msg = error.message.toLowerCase();
    return msg.includes('invalid input') ||
           msg.includes('invalid model') ||
           msg.includes('insufficient credits') ||
           msg.includes('not configured') ||
           msg.includes('400'); // Bad request
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Replicate] Generation attempt ${attempt}/${maxRetries}`);
      return await generateTattooDesign(userInput, modelId, signal, options);
    } catch (error) {
      lastError = error;

      // Always fail on user cancellation
      if (error.message.includes('cancelled') || signal?.aborted) {
        console.log('[Replicate] Generation cancelled by user');
        throw error;
      }

      // Fail immediately on permanent errors (don't waste retries)
      if (isPermanentError(error)) {
        console.error('[Replicate] Permanent error - will not retry:', error.message);
        throw error;
      }

      // Special handling for authentication errors:
      // First attempt: likely missing/wrong token config
      // Subsequent attempts: might be temporary auth service issue
      if (error.message.includes('authentication') || error.message.includes('auth')) {
        if (attempt === 1) {
          console.error('[Replicate] Authentication error on first attempt - configuration issue');
          throw new Error(
            'Authentication failed: Check VITE_FRONTEND_AUTH_TOKEN in .env.local and restart dev server. ' +
            'Make sure both client and server have the same token configured.'
          );
        } else {
          console.log('[Replicate] Retrying after transient auth error...');
          // Fall through to retry logic
        }
      }

      // Check if retry budget exhausted
      if (attempt >= maxRetries) {
        console.error(`[Replicate] Retry budget exhausted (${maxRetries} attempts)`);
        
        // Provide context-specific error messages
        let finalMessage = `Failed to generate design after ${maxRetries} attempts: ${error.message}`;
        
        if (lastError.message.includes('token') || lastError.message.includes('auth')) {
          finalMessage += '\n\nAuth error: Verify VITE_FRONTEND_AUTH_TOKEN configuration and server status.';
        }
        if (lastError.message.includes('timeout') || lastError.message.includes('429')) {
          finalMessage += '\n\nServer is busy. Please wait a moment and try again.';
        }
        
        throw new Error(finalMessage);
      }

      // Transient error - retry with exponential backoff
      if (!isTransientError(error)) {
        console.log('[Replicate] Error may be transient, will retry:', error.message);
      }
      
      const waitTime = Math.min(Math.pow(2, attempt) * 1000, 16000); // 2s, 4s, 8s, 16s, 16s...
      console.log(`[Replicate] Retrying in ${waitTime / 1000}s... (${maxRetries - attempt} retries left)`);

      // Wait with abort support
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
        error: 'Proxy URL not configured. Set VITE_PROXY_URL in your .env file.',
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
  const model = AI_MODELS[DEFAULT_MODEL] || AI_MODELS.sdxl;
  const costPerImage = model?.cost || 0.0055;
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
    return generateWithFallbackChain(userInput, modelId, signal, 3, options);
  }
  return generateWithRetry(userInput, modelId, signal, 3, options);
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
  const routing = hasExplicitModel ? null : routeGeneration(userInput, { mode: 'preview' });
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
  const routing = hasExplicitModel ? null : routeGeneration(userInput, { mode: options.finalize ? 'final' : 'refine' });
  const modelId = options.modelId || userInput.aiModel || routing?.modelId || DEFAULT_MODEL;
  const resolvedInput = routing
    ? { ...userInput, negativePrompt: routing.negativePrompt }
    : userInput;
  const model = AI_MODELS[modelId] || AI_MODELS[DEFAULT_MODEL];
  const baseSteps = model?.params?.num_inference_steps || 50;
  const targetSteps = options.finalize ? Math.max(baseSteps, 60) : baseSteps;
  const inputOverrides = {
    ...HIGH_RES_OVERRIDES,
    num_inference_steps: targetSteps,
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
