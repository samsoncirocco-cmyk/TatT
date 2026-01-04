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

// Proxy server configuration (injected via env)
const PROXY_URL = import.meta.env.VITE_PROXY_URL;

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
    name: 'Tattoo Flash Art',
    version: 'anotherjesse/amy-tattoo-test-1:0e345aaf74965ae98fb83ca9c65376ee42da5c7837d88c648ddc5d3cba1f35dc',
    description: 'Fine-tuned for traditional tattoo flash art',
    cost: 0.003,
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
    name: 'Anime XL (Niji SE)',
    version: 'lucataco/sdxl-niji-se:9e0521b45e1774fc3288ec9ffa964d064c9d905e1ca50f37549084b021d7449c',
    description: 'Vibrant anime style, perfect for DBZ-inspired tattoos',
    cost: 0.03, // ~$0.12 / 4 images (based on p50 estimate)
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
    name: 'DreamShaper XL Turbo',
    version: 'lucataco/dreamshaper-xl-turbo:0a1710e0187b01a255302738ca0158ff02a22f4638679533e111082f9dd1b615',
    description: 'Fast anime/manga generation, versatile style',
    cost: 0.001, // ~$0.0039 / 4 images (extremely cheap!)
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
    name: 'SDXL (General Purpose)',
    version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    description: 'General-purpose, versatile for any subject',
    cost: 0.0055,
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
    name: 'Imagen 3 (Google)',
    version: 'google/imagen-3',
    description: 'Google\'s latest model, photorealistic quality',
    cost: 0.02, // Approximate Vertex AI pricing
    provider: 'vertex-ai', // Special flag for Vertex AI models
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
const DEFAULT_MODEL = 'sdxl';

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
 * Generate tattoo designs using Replicate AI models
 *
 * @param {Object} userInput - User's design parameters
 * @param {string} userInput.style - Tattoo style (traditional, neoTraditional, etc.)
 * @param {string} userInput.subject - Subject description (e.g., "wolf and moon")
 * @param {string} userInput.bodyPart - Body part placement
 * @param {string} userInput.size - Design size (small, medium, large)
 * @param {string} userInput.aiModel - AI model to use ('sdxl' or 'tattoo')
 * @param {AbortSignal} signal - Optional abort signal to cancel polling
 * @returns {Promise<Object>} Generated design data with image URLs
 */
export async function generateTattooDesign(userInput, signal = null) {
  // Validate input
  const validation = validateInput(userInput);
  if (!validation.isValid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
  }

  // Get selected model or use default
  const modelId = userInput.aiModel || DEFAULT_MODEL;
  const model = AI_MODELS[modelId];

  if (!model) {
    throw new Error(`Invalid model: ${modelId}`);
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

    // Add model-specific prompt prefix if needed
    if (model.promptPrefix) {
      finalPrompt = `${model.promptPrefix} ${finalPrompt}`;
    }
  }

  console.log('[Replicate] Using model:', model.name);
  console.log('[Replicate] Generating tattoo design with prompt:', finalPrompt);

  // DEMO MODE: Return mock data without API calls
  if (DEMO_MODE) {
    console.log('[Replicate] 🎨 DEMO MODE - Using mock images');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    const output = {
      success: true,
      images: MOCK_IMAGES,
      metadata: {
        generatedAt: new Date().toISOString(),
        prompt: finalPrompt,
        negativePrompt: negativePrompt,
        demoMode: true,
        councilEnhanced: isCouncilEnhanced
      },
      userInput
    };

    console.log('[Replicate] ✓ Demo generation complete');
    return output;
  }

  try {
    // Check if proxy URL is configured
    if (!PROXY_URL) {
      throw new FetchError(
        'Proxy URL not configured. Set VITE_PROXY_URL in your .env file.',
        ErrorCodes.NETWORK_ERROR
      );
    }

    // Step 1: Create prediction via proxy server
    const prediction = await postJSON(`${PROXY_URL}/predictions`, {
      version: model.version,
      input: {
        ...model.params,
        prompt: finalPrompt,
        negative_prompt: negativePrompt
      }
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
    const generationCost = model.cost * model.params.num_outputs;
    trackAPIUsage(generationCost);

    // Format response
    const output = {
      success: true,
      images: Array.isArray(result.output) ? result.output : [result.output],
      metadata: {
        generatedAt: new Date().toISOString(),
        prompt: finalPrompt,
        negativePrompt: negativePrompt,
        councilEnhanced: isCouncilEnhanced
      },
      userInput
    };

    console.log(`[Replicate] Successfully generated ${output.images.length} variations`);

    return output;

  } catch (error) {
    console.error('[Replicate] Generation error:', error);

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
 * @param {AbortSignal} signal - Optional abort signal
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<Object>} Generated design data
 */
export async function generateWithRetry(userInput, signal = null, maxRetries = 3) {
  let lastError;
  let retryBudget = maxRetries;

  for (let attempt = 1; attempt <= retryBudget; attempt++) {
    try {
      console.log(`[Replicate] Generation attempt ${attempt}/${retryBudget}`);
      return await generateTattooDesign(userInput, signal);
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

      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
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
  const costPerImage = 0.0055;
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
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<Object>} Generated design data
 */
export async function generateWithRateLimit(userInput, signal = null) {
  if (!rateLimiter.canMakeRequest()) {
    const waitTime = rateLimiter.getTimeUntilNextRequest();
    throw new Error(`Rate limit reached. Please wait ${Math.ceil(waitTime / 1000)} seconds before generating again.`);
  }

  rateLimiter.recordRequest();
  return generateWithRetry(userInput, signal);
}
