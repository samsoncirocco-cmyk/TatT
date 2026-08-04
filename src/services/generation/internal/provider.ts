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
  safetyFilterLevel?: SafetyFilterLevel;
  personGeneration?: string;
  outputFormat?: string;
  seed?: number | string;
  // Routing inputs — when modelId is not set explicitly, these decide the model.
  /** One style or the full ordered intake tag set. Routing uses the first mapped style. */
  style?: string | string[];
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
