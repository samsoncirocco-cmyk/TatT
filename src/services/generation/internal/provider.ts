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
  style?: string;
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
