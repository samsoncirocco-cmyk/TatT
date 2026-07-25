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

const normalizeStyle = (style?: string): string => (style || '').toLowerCase();

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
 * Two placements can both match. Most specific wins (longest phrase), and on
 * a tie the limb beats the torso: "back of the calf" is a calf piece, not a
 * back piece. Word boundaries keep "forearm" from matching the "arm" rule.
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

const getAnatomicalAspectRatio = (bodyPart?: string): AspectRatio => {
  const text = (bodyPart || '').toLowerCase();
  if (!text) return DEFAULT_ASPECT_RATIO;

  let best: PlacementRule | undefined;
  for (const rule of PLACEMENT_RULES) {
    if (!new RegExp(`\\b${rule.phrase}\\b`).test(text)) continue;
    if (!best) {
      best = rule;
    } else if (rule.phrase.length > best.phrase.length) {
      best = rule;
    } else if (
      rule.phrase.length === best.phrase.length &&
      rule.region === 'limb' &&
      best.region === 'torso'
    ) {
      best = rule;
    }
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
  const style = normalizeStyle(request.style) || 'default';
  const mode = request.mode || 'standard';

  const styleMapping: StyleModelMapping | undefined =
    (STYLE_MODEL_MAPPING as Record<string, StyleModelMapping>)[style] ||
    (STYLE_MODEL_MAPPING as Record<string, StyleModelMapping>).default;
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
