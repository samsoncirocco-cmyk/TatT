/**
 * Inpainting Service for Tattoo Customization
 *
 * Allows users to edit specific parts of AI-generated tattoo designs by:
 * - Brush-painting areas to modify
 * - Providing new prompts for those areas
 * - Regenerating only the masked regions
 *
 * This enables professional-level customization without starting from scratch.
 */

const PROXY_URL = '/api';

// ===== Type Definitions =====

export interface InpaintingModel {
  version: string;
  cost: number;
}

export interface InpaintParams {
  imageUrl: string;
  maskCanvas: HTMLCanvasElement;
  prompt: string;
  negativePrompt?: string;
  guidanceScale?: number;
  numInferenceSteps?: number;
}

export interface PredictionResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed';
  output?: string | string[];
  error?: string;
}

export interface InpaintingCost {
  perSecond: number;
  estimated: number;
  formatted: string;
}

// ===== Constants =====

// Inpainting model configuration
export const INPAINTING_MODEL: InpaintingModel = {
  version: 'stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3',
  cost: 0.0014 // per second, varies based on complexity
};

// ===== Internal Helpers =====

/**
 * Convert canvas to blob for upload
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}

/**
 * Convert blob to data URL for API
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ===== Public API =====

/**
 * Perform inpainting on a tattoo design
 *
 * @param params - Inpainting parameters
 * @returns Data URL of inpainted image
 */
export async function inpaintTattooDesign({
  imageUrl,
  maskCanvas,
  prompt,
  negativePrompt = 'blurry, low quality, distorted, deformed, ugly, bad anatomy',
  guidanceScale = 7.5,
  numInferenceSteps = 50
}: InpaintParams): Promise<string> {
  try {
    console.log('[Inpainting] Starting inpainting process');

    // Convert mask canvas to blob then to data URL
    const maskBlob = await canvasToBlob(maskCanvas);
    if (!maskBlob) {
      throw new Error('Failed to convert mask canvas to blob');
    }
    const maskDataURL = await blobToDataURL(maskBlob);

    // If imageUrl is a URL (not data URL), we need to convert it to data URL
    let imageDataURL = imageUrl;
    if (!imageUrl.startsWith('data:')) {
      // Fetch and convert to data URL
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      imageDataURL = await blobToDataURL(blob);
    }

    console.log('[Inpainting] Sending request to API');

    // Create prediction via proxy
    const createResponse = await fetch(`${PROXY_URL}/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: INPAINTING_MODEL.version,
        input: {
          image: imageDataURL,
          mask: maskDataURL,
          prompt: prompt,
          negative_prompt: negativePrompt,
          guidance_scale: guidanceScale,
          num_inference_steps: numInferenceSteps,
          num_outputs: 1,
          width: 1024,
          height: 1024
        }
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(errorData.error || errorData.detail || 'Failed to start inpainting');
    }

    const prediction = await createResponse.json() as PredictionResponse;
    console.log('[Inpainting] Prediction created:', prediction.id);

    // Poll for completion
    let result = prediction;
    const maxAttempts = 60; // 60 attempts × 2 seconds = 2 minutes max
    let attempts = 0;

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(`${PROXY_URL}/predictions/${prediction.id}`);

      if (!statusResponse.ok) {
        throw new Error('Failed to check inpainting status');
      }

      result = await statusResponse.json() as PredictionResponse;
      attempts++;

      console.log(`[Inpainting] Status: ${result.status} (attempt ${attempts}/${maxAttempts})`);
    }

    if (result.status === 'failed') {
      throw new Error(result.error || 'Inpainting failed');
    }

    if (result.status !== 'succeeded') {
      throw new Error('Inpainting timed out');
    }

    // Get the output image URL
    const outputImage = Array.isArray(result.output) ? result.output[0] : result.output;

    if (!outputImage) {
      throw new Error('No output image received');
    }

    console.log('[Inpainting] ✓ Inpainting completed successfully');

    return outputImage;

  } catch (error) {
    const err = error as Error;
    console.error('[Inpainting] Error:', err);
    throw new Error(`Inpainting failed: ${err.message}`);
  }
}

/**
 * Create a blank mask canvas from an image
 */
export function createMaskCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Fill with black (areas to preserve)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
  }

  return canvas;
}

/**
 * Get estimated cost for inpainting
 */
export function getInpaintingCost(numInferenceSteps: number = 50): InpaintingCost {
  // Rough estimate: ~10 seconds for 50 steps
  const estimatedSeconds = (numInferenceSteps / 50) * 10;
  const estimatedCost = estimatedSeconds * INPAINTING_MODEL.cost;

  return {
    perSecond: INPAINTING_MODEL.cost,
    estimated: estimatedCost,
    formatted: `~$${estimatedCost.toFixed(4)}`
  };
}
