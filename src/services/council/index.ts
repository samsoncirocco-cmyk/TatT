// Public entry point of the council module (ADR-0002).
// Everything under internal/ is implementation detail — import only from here.
//
// Council (prompt enhancement) has consumers beyond the generation pipeline
// (its own API route, health probe, UI), so it lives as its own module rather
// than as a generation internal. The only operation callers need is
// "enhance this prompt" — everything else (provider selection, caching,
// character detection, stencil-mode detection) is private.
import { enhancePrompt, CouncilProviderError } from './internal/councilService';

export { CouncilProviderError };

export interface CouncilEnhanceRequest {
  /** The user's rough tattoo idea, in their own words. */
  userIdea: string;
  /** Tattoo style (e.g. 'traditional', 'japanese'). Defaults to 'traditional'. */
  style?: string;
  /** Body placement (e.g. 'forearm'). Defaults to 'forearm'. */
  bodyPart?: string;
  /** Optional callback receiving simulated council discussion updates. */
  onDiscussionUpdate?: ((update: unknown) => void) | null;
  /** Force stencil mode on/off; null lets the module auto-detect from the idea. */
  isStencilMode?: boolean | null;
}

export interface CouncilEnhanceResult {
  prompts: { simple?: string; detailed?: string; ultra?: string };
  negativePrompt?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Enhance a rough tattoo idea into generation-ready prompts via the AI
 * Council (Vertex AI Gemini, with OpenRouter and external-API fallbacks).
 * Throws CouncilProviderError when every provider is exhausted.
 */
export async function enhance(request: CouncilEnhanceRequest): Promise<CouncilEnhanceResult> {
  return enhancePrompt(request) as Promise<CouncilEnhanceResult>;
}
