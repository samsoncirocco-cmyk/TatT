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

const STENCIL_SHIELD_TOKENS = '(shading, gradients, shadows, blur, 3d, realistic, photorealistic, low contrast, grey, messy lines, sketch: 1.5)';

const MODEL_ID_MAP = {
  dreamshaper_turbo: 'dreamshaper',
  anime_xl: 'animeXL',
  tattoo_flash_art: 'tattoo',
  blackwork_specialist: 'sdxl',
  imagen3: 'imagen3'
};

const normalizeStyle = (style) => (style || '').toLowerCase();

const resolveModelId = (modelId) => MODEL_ID_MAP[modelId] || modelId;

const resolveFallbackChain = (modelId) => {
  const chain = MODEL_FALLBACK_CHAIN[modelId] || [];
  return chain.map(resolveModelId).filter(Boolean);
};

const getAnatomicalAspectRatio = (bodyPart) => {
  const verticalParts = ['forearm', 'shin', 'calf', 'arm', 'lowerarm', 'upperarm'];
  const wideParts = ['back', 'chest', 'stomach'];
  const normalized = (bodyPart || '').toLowerCase();

  if (verticalParts.includes(normalized)) return '9:16';
  if (wideParts.includes(normalized)) return '4:3';
  return '1:1';
};

const buildNegativePrompt = (baseNegativePrompt, isStencilMode) => {
  if (!isStencilMode) return baseNegativePrompt || '';
  if (!baseNegativePrompt) return STENCIL_SHIELD_TOKENS;
  return `${baseNegativePrompt}, ${STENCIL_SHIELD_TOKENS}`;
};

const inferProvider = (modelId) => (modelId === 'imagen3' ? 'vertex-ai' : 'replicate');

export function routeGeneration(userInput = {}, options = {}) {
  const style = normalizeStyle(userInput.style) || 'default';
  const mode = options.mode || userInput.mode || 'standard';

  const styleMapping = STYLE_MODEL_MAPPING[style] || STYLE_MODEL_MAPPING.default;
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
