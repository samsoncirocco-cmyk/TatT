// Model selection, ported from src/services/generationRouter.ts (deleted in the
// contract step). Pure logic — no I/O.
import {
  STYLE_MODEL_MAPPING,
  MODEL_FALLBACK_CHAIN
} from '@/config/modelRoutingRules.js';
import type { AspectRatio, GenerationRequest, ProviderName } from './provider';

const STENCIL_SHIELD_TOKENS = '(shading, gradients, shadows, blur, 3d, realistic, photorealistic, low contrast, grey, messy lines, sketch: 1.5)';

const MODEL_ID_MAP: Record<string, string> = {
  dreamshaper_turbo: 'dreamshaper',
  anime_xl: 'animeXL',
  tattoo_flash_art: 'tattoo',
  blackwork_specialist: 'sdxl',
  imagen3: 'imagen3'
};

interface StyleModelMapping {
  primary: string;
  fallback?: string;
  reasoning: string;
}

export interface GenerationRoute {
  modelId: string;
  provider: ProviderName;
  aspectRatio: AspectRatio;
  negativePrompt: string;
  fallbackChain: string[];
  reasoning: string;
}

const normalizeStyle = (style?: string): string => (style || '').toLowerCase();

const resolveModelId = (modelId: string): string => MODEL_ID_MAP[modelId] || modelId;

const resolveFallbackChain = (modelId: string): string[] => {
  const chain = (MODEL_FALLBACK_CHAIN as Record<string, string[]>)[modelId] || [];
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

export const inferProvider = (modelId: string): ProviderName =>
  modelId === 'imagen3' ? 'vertex-ai' : 'replicate';

export function routeGeneration(request: GenerationRequest): GenerationRoute {
  const style = normalizeStyle(request.style) || 'default';
  const mode = request.mode || 'standard';

  const styleMapping: StyleModelMapping | undefined =
    (STYLE_MODEL_MAPPING as Record<string, StyleModelMapping>)[style] ||
    (STYLE_MODEL_MAPPING as Record<string, StyleModelMapping>).default;
  let modelKey = styleMapping?.primary || 'blackwork_specialist';

  if (mode === 'preview') {
    modelKey = 'dreamshaper_turbo';
  }

  if (request.isStencilMode) {
    modelKey = 'blackwork_specialist';
  }

  const modelId = resolveModelId(modelKey);
  const fallbackChain = resolveFallbackChain(modelKey).filter((id) => id !== modelId);

  return {
    modelId,
    provider: inferProvider(modelId),
    aspectRatio: getAnatomicalAspectRatio(request.bodyPart),
    negativePrompt: buildNegativePrompt(request.negativePrompt, request.isStencilMode),
    fallbackChain,
    reasoning: styleMapping?.reasoning || 'Default model routing'
  };
}
