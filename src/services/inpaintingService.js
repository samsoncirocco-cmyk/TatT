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

const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001/api';

// Inpainting model configuration
export const INPAINTING_MODEL = {
  version: 'stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3',
  cost: 0.0014 // per second, varies based on complexity
};

/**
 * Convert canvas to blob for upload
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}

/**
 * Convert blob to data URL for API
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Perform inpainting on a tattoo design
 *
 * @param {Object} params - Inpainting parameters
 * @param {string} params.imageUrl - Original design image URL or data URL
 * @param {HTMLCanvasElement} params.maskCanvas - Canvas with white painted mask
 * @param {string} params.prompt - Description of what to generate in masked area
 * @param {string} params.negativePrompt - What to avoid in generation
 * @param {number} params.guidanceScale - How closely to follow prompt (1-20)
 * @param {number} params.numInferenceSteps - Quality vs speed (1-500)
 * @returns {Promise<string>} Data URL of inpainted image
 */
export async function inpaintTattooDesign({
  imageUrl,
  maskCanvas,
  prompt,
  negativePrompt = 'blurry, low quality, distorted, deformed, ugly, bad anatomy',
  guidanceScale = 7.5,
  numInferenceSteps = 50
}) {
  try {
    console.log('[Inpainting] Starting inpainting process');

    // Convert mask canvas to blob then to data URL
    const maskBlob = await canvasToBlob(maskCanvas);
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

    const prediction = await createResponse.json();
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

      result = await statusResponse.json();
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

    console.log('[Inpainting] ✓ Inpainting completed successfully');

    return outputImage;

  } catch (error) {
    console.error('[Inpainting] Error:', error);
    throw new Error(`Inpainting failed: ${error.message}`);
  }
}

/**
 * Create a blank mask canvas from an image
 * @param {number} width
 * @param {number} height
 * @returns {HTMLCanvasElement}
 */
export function createMaskCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  // Fill with black (areas to preserve)
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  return canvas;
}

/**
 * Get estimated cost for inpainting
 * @param {number} numInferenceSteps
 * @returns {Object}
 */
export function getInpaintingCost(numInferenceSteps = 50) {
  // Rough estimate: ~10 seconds for 50 steps
  const estimatedSeconds = (numInferenceSteps / 50) * 10;
  const estimatedCost = estimatedSeconds * INPAINTING_MODEL.cost;

  return {
    perSecond: INPAINTING_MODEL.cost,
    estimated: estimatedCost,
    formatted: `~$${estimatedCost.toFixed(4)}`
  };
}
