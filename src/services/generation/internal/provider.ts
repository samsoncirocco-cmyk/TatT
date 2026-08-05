export type GenerationMode = 'standard' | 'preview' | 'high-quality' | 'refine' | 'final';
export type ProviderName = 'replicate' | 'vertex-ai';
export type AspectRatio = '1:1' | '9:16' | '4:3' | '3:4' | '16:9';
export type SafetyFilterLevel =
  | 'block_none'
  | 'block_only_high'
  | 'block_medium_and_above'
  | 'block_low_and_above'
  | 'block_most'
  | 'block_some'
  | 'block_few'
  | 'block_fewest';

export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  numImages?: number;
  aspectRatio?: AspectRatio;
  /**
   * Source image for image-to-image, as a URL the provider can fetch.
   *
   * Set this when the output must keep the SOURCE's composition and change
   * only its rendering — deriving a line-art stencil from an approved
   * colour design is the motivating case. Re-prompting from text instead
   * produces a different tattoo, which is worse than none.
   *
   * Support is per-model and NOT universal: only `flux-dev` accepts it
   * today (`flux-schnell` has no image input; `krea2` offers style
   * reference, which transfers style rather than preserving layout).
   * Providers reject a request they cannot honour rather than silently
   * dropping the field — a silent drop is how you ship a "stencil" of a
   * design the customer never approved.
   *
   * NOTE: on flux-dev the output's aspect ratio follows this image, so
   * `aspectRatio` is ignored whenever it is set.
   */
  sourceImage?: string;
  /**
   * How far the prompt may pull away from `sourceImage`, 0–1. Higher keeps
   * less of the source; 1.0 discards it entirely. Ignored without a
   * `sourceImage`. Defaults to the model's own default when unset.
   */
  sourceStrength?: number;
  /**
   * Customer reference photos, as URLs the provider can fetch, delivered to
   * the image model AS IMAGES (ADR-0050, #296 17a). Distinct from
   * `sourceImage`: that one preserves a source's composition (image-to-image
   * on the same design); these carry likeness/subject reference for a fresh
   * composition. Only models with a real multi-image reference input accept
   * them — a provider that cannot honor them refuses loudly, because a
   * likeness silently dropped is a stranger's face in a memorial tattoo.
   */
  referenceImages?: string[];
  safetyFilterLevel?: SafetyFilterLevel;
  personGeneration?: string;
  outputFormat?: string;
  seed?: number | string;
  // Routing inputs — when modelId is not set explicitly, these decide the model.
  /** One style or the full ordered intake tag set. Routing uses the first mapped style. */
  style?: string | string[];
  /**
   * Number of distinct characters the customer named
   * (`IntakeRecord.requestedCharacters`). 3+ routes to the Gemini lane,
   * which held full cast completeness where Flux dropped identities (#293).
   */
  castSize?: number;
  mode?: GenerationMode;
  bodyPart?: string;
  isStencilMode?: boolean;
  modelId?: string;
  allowProviderFallback?: boolean;
  retry?: {
    // Retries after the first try: maxRetries 4 => 5 total attempts.
    maxRetries?: number;
    baseDelayMs?: number;
  };
  fallback?: {
    safetyFilterLevel?: SafetyFilterLevel;
  };
  /**
   * Screen the render for lettering the request did not ask for (#297), and
   * re-roll a bounded number of times if found. Opt-in: it costs one vision
   * call per image, so paths that never reach a customer (stencil derivation,
   * internal previews) should leave it off.
   */
  screenText?: {
    /** Re-rolls AFTER the first render. Default 1 — two paid renders at most. */
    maxRerolls?: number;
  };
}

export interface GenerationResult {
  images: string[];
  metadata: {
    model: string;
    provider: ProviderName;
    generatedAt: string;
    durationMs: number;
    attempts: number;
    safetyFilterLevel?: string;
    personGeneration?: string;
    seed?: number | string;
    fallbackUsed: boolean;
    fallbackReason?: string;
    /**
     * Set when the text guard ran. `false` means screened and clean; `true`
     * means the re-roll budget was spent and lettering is STILL present — the
     * caller decides whether to show it, and the words say what it says.
     * Absent means the guard did not run at all.
     */
    textIntrusion?: boolean;
    textIntrusionWords?: string[];
    textGuardRerolls?: number;
    /** Present when the guard was asked for but could not run. */
    textGuardSkipped?: string;
  };
}

export interface Provider {
  readonly name: ProviderName;
  generate(request: GenerationRequest): Promise<GenerationResult>;
}

// Errors thrown by providers carry the upstream HTTP status and a stable code.
export interface GenerationError extends Error {
  status?: number;
  code?: string;
  details?: string;
}

export function asGenerationError(error: unknown): GenerationError {
  return (error instanceof Error ? error : new Error(String(error))) as GenerationError;
}

export function makeGenerationError(
  message: string,
  fields: Pick<GenerationError, 'status' | 'code' | 'details'>
): GenerationError {
  const error = new Error(message) as GenerationError;
  Object.assign(error, fields);
  return error;
}
