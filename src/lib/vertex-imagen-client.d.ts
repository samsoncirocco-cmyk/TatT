export type ImagenGenerationOptions = {
  prompt: string;
  negativePrompt?: string;
  sampleCount?: number;
  aspectRatio?: string;
  imageSize?: { width: number; height: number };
  safetyFilterLevel?: string;
  personGeneration?: string;
  outputFormat?: string;
  seed?: number;
  retries?: number;
  metadata?: Record<string, string>;
};

export type ImagenGenerationResult = {
  images: { base64: string; mimeType: string }[];
  usage?: {
    requests?: number;
    images?: number;
    cost?: number;
  };
  metadata?: Record<string, unknown>;
};

export declare function generateImagenImages(
  options: ImagenGenerationOptions
): Promise<ImagenGenerationResult>;

export declare function uploadGeneratedImage(options: {
  base64: string;
  mimeType?: string;
  prefix?: string;
  metadata?: Record<string, string>;
}): Promise<{ url: string; gcsPath: string }>;

export declare function generateAndUploadImages(
  options: ImagenGenerationOptions
): Promise<{
  uploads: { url: string; gcsPath: string }[];
  urls: string[];
}>;

export declare function getUsageSnapshot(): {
  totalRequests: number;
  totalImages: number;
  totalCost: number;
  lastRequestAt: string | null;
  daily: {
    date: string | null;
    requests: number;
    images: number;
    cost: number;
  };
  costPerImage: number;
};
