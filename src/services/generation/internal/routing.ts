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
  nano_banana_2: 'nano-banana-2',
  // No longer any route's key (ADR-0048 moved the cast lane to
  // nano-banana-2 on Replicate), but sessions pinned before the switch
  // stored this id and must keep resolving to the Vertex path they were
  // pinned on (ADR-0016).
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

// Resolved catalog id → the config key MODEL_FALLBACK_CHAIN is keyed by.
// Pinned sessions store the RESOLVED id (ADR-0016), so a caller asking for
// the fallback chain of a pinned model arrives with the catalog id.
const CONFIG_KEY_BY_MODEL_ID: Record<string, string> = {
  'flux-dev': 'flux_dev',
  'flux-schnell': 'flux_schnell',
  krea2: 'krea_2',
  'nano-banana-2': 'nano_banana_2',
  imagen3: 'imagen3'
};

/**
 * Fallback chain for an explicitly pinned model id (ADR-0048's loud
 * downgrade). Accepts either a resolved catalog id or a config key, returns
 * resolved ids with the model itself removed. Unknown ids get an empty
 * chain — no fallback is safer than a guessed one.
 */
export const fallbackChainForModelId = (modelId: string): string[] => {
  const configKey = CONFIG_KEY_BY_MODEL_ID[modelId] ?? modelId;
  return resolveFallbackChain(configKey).filter((id) => id !== resolveModelId(configKey));
};

export function routeGeneration(request: GenerationRequest): GenerationRoute {
  const mode = request.mode || 'standard';

  const styleMapping: StyleModelMapping | undefined =
    lookupStyleMapping(request.style) || lookupStyleMapping('default');
  let modelKey = styleMapping?.primary || 'flux_dev';
  let reasoning = styleMapping?.reasoning || 'Default model routing';

  // 3+ named characters route to the Gemini lane (#293): Flux holds 39–49%
  // cast completeness on those requests while the Gemini image model held
  // 100%. Served via Replicate as nano-banana-2 (ADR-0048) — one bill, no
  // Vertex quota exposure. Gemini's text-intrusion habit is the render text
  // guard's job (#297/#305) — every lane shares that risk and the gate
  // screens them all. Preview and stencil below still win: previews are
  // cheap drafts, and stencil derivation needs flux-dev's image input.
  if ((request.castSize ?? 0) >= 3) {
    modelKey = 'nano_banana_2';
    reasoning = 'Gemini holds full cast completeness on 3+ character requests (#293); Flux drops identities (ADR-0048: served via Replicate)';
  }

  // Attached reference photos force the strong lane regardless of cast size
  // (#296 18a): likeness needs the one model with a real multi-image
  // reference input. Placed after the cast rule (same lane either way) and
  // before the preview/stencil overrides — a preview draft does not spend
  // the strong lane, and stencil derivation transforms an already-approved
  // design, where the photo already did its work.
  if (request.referenceImages?.length) {
    modelKey = 'nano_banana_2';
    reasoning = 'Reference photos reach the model as images (ADR-0050); only the Gemini lane takes them';
  }

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
    reasoning
  };
}
