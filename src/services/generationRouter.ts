/**
 * Generation Router
 *
 * Selects the best model for a generation request based on style, mode, and body part.
 * Returns provider-specific routing metadata without mutating the original input.
 */

import {
  STYLE_MODEL_MAPPING,
  MODEL_FALLBACK_CHAIN
} from '../config/modelRoutingRules.js';

// ============================================================================
// Constants
// ============================================================================

const STENCIL_SHIELD_TOKENS = '(shading, gradients, shadows, blur, 3d, realistic, photorealistic, low contrast, grey, messy lines, sketch: 1.5)';

const MODEL_ID_MAP: Record<string, string> = {
  dreamshaper_turbo: 'dreamshaper',
  anime_xl: 'animeXL',
  tattoo_flash_art: 'tattoo',
  blackwork_specialist: 'sdxl',
  imagen3: 'imagen3'
};

// ============================================================================
// Types
// ============================================================================

export type GenerationMode = 'standard' | 'preview' | 'high-quality';
export type Provider = 'replicate' | 'vertex-ai';
export type AspectRatio = '1:1' | '9:16' | '4:3';

export interface StyleModelMapping {
  primary: string;
  fallback?: string;
  reasoning: string;
}

export interface GenerationUserInput {
  style?: string;
  mode?: GenerationMode;
  bodyPart?: string;
  isStencilMode?: boolean;
  negativePrompt?: string;
  [key: string]: unknown; // Allow additional properties
}

export interface GenerationOptions {
  mode?: GenerationMode;
  [key: string]: unknown; // Allow additional options
}

export interface GenerationRoute {
  modelId: string;
  provider: Provider;
  aspectRatio: AspectRatio;
  negativePrompt: string;
  fallbackChain: string[];
  reasoning: string;
}

// ============================================================================
// Internal Functions
// ============================================================================

const normalizeStyle = (style?: string): string => (style || '').toLowerCase();

const resolveModelId = (modelId: string): string => MODEL_ID_MAP[modelId] || modelId;

const resolveFallbackChain = (modelId: string): string[] => {
  const chain = MODEL_FALLBACK_CHAIN[modelId] || [];
  return chain.map(resolveModelId).filter(Boolean);
};

const getAnatomicalAspectRatio = (bodyPart?: string): AspectRatio => {
  const verticalParts = ['forearm', 'shin', 'calf', 'arm', 'lowerarm', 'upperarm'];
  const wideParts = ['back', 'chest', 'stomach'];
  const normalized = (bodyPart || '').toLowerCase();

  if (verticalParts.includes(normalized)) return '9:16';
  if (wideParts.includes(normalized)) return '4:3';
  return '1:1';
};

const buildNegativePrompt = (baseNegativePrompt: string | undefined, isStencilMode: boolean | undefined): string => {
  if (!isStencilMode) return baseNegativePrompt || '';
  if (!baseNegativePrompt) return STENCIL_SHIELD_TOKENS;
  return `${baseNegativePrompt}, ${STENCIL_SHIELD_TOKENS}`;
};

const inferProvider = (modelId: string): Provider => (modelId === 'imagen3' ? 'vertex-ai' : 'replicate');

// ============================================================================
// Public API
// ============================================================================

/**
 * Route a generation request to the best model
 *
 * @param userInput - User's generation input (style, bodyPart, etc.)
 * @param options - Additional routing options
 * @returns Generation routing metadata
 */
export function routeGeneration(
  userInput: GenerationUserInput = {},
  options: GenerationOptions = {}
): GenerationRoute {
  const style = normalizeStyle(userInput.style) || 'default';
  const mode = options.mode || userInput.mode || 'standard';

  const styleMapping: StyleModelMapping | undefined = STYLE_MODEL_MAPPING[style] || STYLE_MODEL_MAPPING.default;
  let modelKey = styleMapping?.primary || 'blackwork_specialist';

  if (mode === 'preview') {
    modelKey = 'dreamshaper_turbo';
  }

  if (userInput.isStencilMode) {
    modelKey = 'blackwork_specialist';
  }

  const modelId = resolveModelId(modelKey);
  const fallbackChain = resolveFallbackChain(modelKey).filter((id) => id !== modelId);

  return {
    modelId,
    provider: inferProvider(modelId),
    aspectRatio: getAnatomicalAspectRatio(userInput.bodyPart),
    negativePrompt: buildNegativePrompt(userInput.negativePrompt, userInput.isStencilMode),
    fallbackChain,
    reasoning: styleMapping?.reasoning || 'Default model routing'
  };
}
