// Model selection, ported from src/services/generationRouter.ts (deleted in the
// contract step). Pure logic — no I/O.
import {
  STYLE_MODEL_MAPPING,
  MODEL_FALLBACK_CHAIN
} from '@/config/modelRoutingRules.js';
import type { AspectRatio, GenerationRequest, ProviderName } from './provider';
import { getAnatomicalAspectRatio } from '@/lib/placement';

// Plain-language exclusion list — no SDXL "(…: 1.5)" weight dialect, since
// these tokens now reach Imagen's negativePrompt or get folded into a Flux
// prompt as an "Avoid:" clause, and neither speaks that syntax.
export const STENCIL_SHIELD_TOKENS = 'shading, gradients, shadows, blur, 3d, realistic, photorealistic, low contrast, grey, messy lines, sketch';

const MODEL_ID_MAP: Record<string, string> = {
  flux_dev: 'flux-dev',
  flux_schnell: 'flux-schnell',
  krea_2: 'krea2',
  imagen3: 'imagen3',
  // Retired SDXL-era config keys — kept so anything still passing an old
  // key (or a stored pinned route) resolves to the closest current model.
  dreamshaper_turbo: 'flux-schnell',
  anime_xl: 'krea2',
  tattoo_flash_art: 'flux-dev',
  blackwork_specialist: 'flux-dev'
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

// Style tags arrive as ontology ids ("new-school", "neo-traditional") but
// STYLE_MODEL_MAPPING is keyed camelCase ("newSchool", "neoTraditional").
// Lowercasing alone never bridged that, so those two fell through to the
// flux-dev default instead of reaching krea2 — the ADR-0023 routing table
// said one thing and the code did another. Compare on a form that strips
// the difference: lowercase, no separators.
const styleKey = (style: string): string => style.toLowerCase().replace(/[\s_-]/g, '');

const STYLE_MAPPING_BY_KEY: Record<string, StyleModelMapping> = Object.fromEntries(
  Object.entries(STYLE_MODEL_MAPPING as Record<string, StyleModelMapping>).map(
    ([name, mapping]) => [styleKey(name), mapping]
  )
);

const lookupStyleMapping = (style?: string | string[]): StyleModelMapping | undefined => {
  const candidates = Array.isArray(style) ? style : [style];
  for (const candidate of candidates) {
    const mapping = STYLE_MAPPING_BY_KEY[styleKey(candidate || '')];
    if (mapping) return mapping;
  }
  return undefined;
};

const resolveModelId = (modelId: string): string => MODEL_ID_MAP[modelId] || modelId;

const resolveFallbackChain = (modelId: string): string[] => {
  const chain = (MODEL_FALLBACK_CHAIN as Record<string, string[]>)[modelId] || [];
  // Dedupe AFTER alias resolution: two config keys can map to the same
  // catalog id, and a chain that repeats the failed model isn't a fallback.
  return [...new Set(chain.map(resolveModelId).filter(Boolean))];
};

/**
 * Placement → aspect ratio (ADR-0023) now lives in `@/lib/placement`, which
 * is the one resolver the council prompt builders read too. It moved because
 * this matcher was the only one of three that worked: the council's two
 * exact-match lookups silently returned placeholder text for every
 * conversational placement. Re-exported so existing importers of
 * `@/services/generation/internal/routing` are unaffected.
 */
export { getAnatomicalAspectRatio };

const buildNegativePrompt = (baseNegativePrompt: string | undefined, isStencilMode: boolean | undefined): string => {
  if (!isStencilMode) return baseNegativePrompt || '';
  if (!baseNegativePrompt) return STENCIL_SHIELD_TOKENS;
  return `${baseNegativePrompt}, ${STENCIL_SHIELD_TOKENS}`;
};

export const inferProvider = (modelId: string): ProviderName =>
  modelId === 'imagen3' ? 'vertex-ai' : 'replicate';

export function routeGeneration(request: GenerationRequest): GenerationRoute {
  const mode = request.mode || 'standard';

  const styleMapping: StyleModelMapping | undefined =
    lookupStyleMapping(request.style) || lookupStyleMapping('default');
  let modelKey = styleMapping?.primary || 'flux_dev';

  if (mode === 'preview') {
    modelKey = 'flux_schnell';
  }

  if (request.isStencilMode) {
    modelKey = 'flux_dev';
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
