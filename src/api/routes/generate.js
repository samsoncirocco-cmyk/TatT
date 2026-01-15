/**
 * Vertex AI Imagen 3 generation route
 *
 * POST /api/v1/generate
 */

import { Router } from 'express';
import { generateAndUploadImages, getUsageSnapshot } from '../../lib/vertex-imagen-client.js';

const router = Router();

const SIZE_MAP = {
  small: 512,
  medium: 768,
  large: 1024
};

function resolveDimensions(size) {
  if (!size) return { width: 1024, height: 1024 };
  const normalized = String(size).toLowerCase();
  const dimension = SIZE_MAP[normalized] || 1024;
  return { width: dimension, height: dimension };
}

router.post('/', async (req, res) => {
  try {
    const {
      prompt,
      negativePrompt,
      style,
      bodyPart,
      size,
      width,
      height,
      sampleCount,
      num_outputs,
      aspectRatio,
      safetyFilterLevel,
      personGeneration,
      outputFormat,
      seed
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return res.status(400).json({
        error: 'Prompt is required',
        code: 'INVALID_PROMPT'
      });
    }

    const requestedCount = Number(sampleCount || num_outputs || 1);
    if (Number.isNaN(requestedCount) || requestedCount < 1 || requestedCount > 4) {
      return res.status(400).json({
        error: 'sampleCount must be between 1 and 4',
        code: 'INVALID_SAMPLE_COUNT'
      });
    }

    const widthValue = Number(width);
    const heightValue = Number(height);
    const dimensions = Number.isFinite(widthValue) && Number.isFinite(heightValue)
      ? { width: widthValue, height: heightValue }
      : resolveDimensions(size);
    const generationStart = Date.now();

    const result = await generateAndUploadImages({
      prompt: prompt.trim(),
      negativePrompt: negativePrompt?.trim(),
      sampleCount: requestedCount,
      aspectRatio: aspectRatio || '1:1',
      imageSize: dimensions,
      safetyFilterLevel,
      personGeneration,
      outputFormat,
      seed,
      metadata: {
        style: style || '',
        bodyPart: bodyPart || '',
        size: size || ''
      }
    });

    const durationMs = Date.now() - generationStart;
    const usage = getUsageSnapshot();
    const costPerImage = usage.costPerImage;
    const totalCost = Number((costPerImage * requestedCount).toFixed(4));

    return res.json({
      success: true,
      images: result.urls,
      uploads: result.uploads,
      metadata: {
        generatedAt: new Date().toISOString(),
        prompt: prompt.trim(),
        negativePrompt: negativePrompt?.trim() || null,
        model: 'imagegeneration@006',
        provider: 'vertex-ai',
        style: style || null,
        bodyPart: bodyPart || null,
        size: size || null,
        aspectRatio: aspectRatio || '1:1',
        outputFormat: outputFormat || 'png',
        durationMs
      },
      cost: {
        perImage: costPerImage,
        total: totalCost,
        currency: 'USD'
      },
      usage
    });
  } catch (error) {
    console.error('[API] Imagen generation error:', error);

    if (error.code === 'VERTEX_QUOTA_EXCEEDED') {
      return res.status(429).json({
        error: 'Vertex AI quota exceeded',
        code: 'VERTEX_QUOTA_EXCEEDED',
        details: error.details || null
      });
    }

    if (error.code === 'VERTEX_NOT_CONFIGURED' || error.code === 'GCS_NOT_CONFIGURED') {
      return res.status(500).json({
        error: 'Generation service not configured',
        code: error.code,
        message: error.message
      });
    }

    if (error.code === 'INVALID_PROMPT') {
      return res.status(400).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      error: 'Generation failed',
      code: error.code || 'GENERATION_FAILED',
      message: error.message
    });
  }
});

export default router;
