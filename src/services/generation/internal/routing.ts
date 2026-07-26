// Model selection, ported from src/services/generationRouter.ts (deleted in the
// contract step). Pure logic — no I/O.
import {
  STYLE_MODEL_MAPPING,
  MODEL_FALLBACK_CHAIN
} from '@/config/modelRoutingRules.js';
import type { AspectRatio, GenerationRequest, ProviderName } from './provider';

// Plain-language exclusion list — no SDXL "(…: 1.5)" weight dialect, since
// these tokens now reach Imagen's negativePrompt or get folded into a Flux
// prompt as an "Avoid:" clause, and neither speaks that syntax.
const STENCIL_SHIELD_TOKENS = 'shading, gradients, shadows, blur, 3d, realistic, photorealistic, low contrast, grey, messy lines, sketch';

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

const lookupStyleMapping = (style?: string): StyleModelMapping | undefined =>
  STYLE_MAPPING_BY_KEY[styleKey(style || '')];

const resolveModelId = (modelId: string): string => MODEL_ID_MAP[modelId] || modelId;

const resolveFallbackChain = (modelId: string): string[] => {
  const chain = (MODEL_FALLBACK_CHAIN as Record<string, string[]>)[modelId] || [];
  // Dedupe AFTER alias resolution: two config keys can map to the same
  // catalog id, and a chain that repeats the failed model isn't a fallback.
  return [...new Set(chain.map(resolveModelId).filter(Boolean))];
};

/**
 * Placement → aspect ratio (ADR-0023).
 *
 * Placement is free text from intake ("left forearm", "back of the upper
 * arm"), never a bare enum, so this matches phrases inside the string. The
 * previous whole-string equality check matched almost nothing real and every
 * conversational session fell through to 1:1 — square renders for placements
 * that are obviously portrait.
 *
 * Two placements can both match, and the limb ALWAYS wins over the torso —
 * "back of the arm" is an arm piece, "back of the calf" is a calf piece.
 * Region precedence is unconditional, not a length tiebreak: phrase length
 * is not a proxy for anatomical specificity, and using it as one silently
 * routed "back of the arm" and "back of the leg" to the torso because
 * "back" (4) outranks "arm" and "leg" (3).
 *
 * Within a region the longest phrase wins, so "upper arm" beats "arm".
 * Word boundaries keep "forearm" from matching the "arm" rule, and the
 * optional trailing "s" keeps plurals ("hands", "wrists") matching.
 */
type PlacementRegion = 'limb' | 'torso';

interface PlacementRule {
  phrase: string;
  region: PlacementRegion;
  ratio: AspectRatio;
}

const DEFAULT_ASPECT_RATIO: AspectRatio = '9:16';

const PLACEMENT_RULES: readonly PlacementRule[] = [
  // Limbs run portrait — the design follows the length of the limb.
  { phrase: 'upper arm', region: 'limb', ratio: '9:16' },
  { phrase: 'lower arm', region: 'limb', ratio: '9:16' },
  { phrase: 'forearm', region: 'limb', ratio: '9:16' },
  { phrase: 'upperarm', region: 'limb', ratio: '9:16' },
  { phrase: 'lowerarm', region: 'limb', ratio: '9:16' },
  { phrase: 'bicep', region: 'limb', ratio: '9:16' },
  { phrase: 'tricep', region: 'limb', ratio: '9:16' },
  { phrase: 'thigh', region: 'limb', ratio: '9:16' },
  { phrase: 'calf', region: 'limb', ratio: '9:16' },
  { phrase: 'shin', region: 'limb', ratio: '9:16' },
  { phrase: 'arm', region: 'limb', ratio: '9:16' },
  { phrase: 'leg', region: 'limb', ratio: '9:16' },
  // Extremities are small and banded — square holds them better than portrait.
  { phrase: 'wrist', region: 'limb', ratio: '1:1' },
  { phrase: 'ankle', region: 'limb', ratio: '1:1' },
  { phrase: 'hand', region: 'limb', ratio: '1:1' },
  // Torso stays portrait but wider.
  { phrase: 'chest', region: 'torso', ratio: '3:4' },
  { phrase: 'stomach', region: 'torso', ratio: '3:4' },
  { phrase: 'sternum', region: 'torso', ratio: '3:4' },
  { phrase: 'back', region: 'torso', ratio: '3:4' },
];

/** Limb outranks torso outright; ties inside a region go to the longer phrase. */
const outranks = (candidate: PlacementRule, incumbent: PlacementRule): boolean => {
  if (candidate.region !== incumbent.region) return candidate.region === 'limb';
  return candidate.phrase.length > incumbent.phrase.length;
};

export const getAnatomicalAspectRatio = (bodyPart?: string): AspectRatio => {
  const text = (bodyPart || '').toLowerCase();
  if (!text) return DEFAULT_ASPECT_RATIO;

  let best: PlacementRule | undefined;
  for (const rule of PLACEMENT_RULES) {
    if (!new RegExp(`\\b${rule.phrase}s?\\b`).test(text)) continue;
    if (!best || outranks(rule, best)) best = rule;
  }

  return best?.ratio ?? DEFAULT_ASPECT_RATIO;
};

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
