export {
  generateImagenImages,
  uploadGeneratedImage,
  generateAndUploadImages,
  getUsageSnapshot
} from './vertex-imagen-client.js';

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
