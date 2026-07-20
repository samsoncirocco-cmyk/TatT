export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  numImages?: number;
  aspectRatio?: string;
  safetyFilterLevel?: string;
  personGeneration?: string;
  outputFormat?: string;
  seed?: number | string;
  retry?: {
    attempts?: number;
    baseDelayMs?: number;
  };
  fallback?: {
    safetyFilterLevel?: string;
  };
}

export interface GenerationResult {
  images: string[];
  metadata: {
    model: string;
    provider: string;
    generatedAt: string;
    durationMs: number;
    attempts: number;
    safetyFilterLevel: string;
    personGeneration: string;
    seed?: number | string;
    fallbackUsed: boolean;
  };
}

export interface Provider {
  readonly name: string;
  generate(request: GenerationRequest): Promise<GenerationResult>;
}
