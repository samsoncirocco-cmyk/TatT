import { NextResponse } from 'next/server';
import {
  generateAndUploadImages,
  getUsageSnapshot,
  ImagenGenerationOptions
} from '../../../lib/vertex-imagen-client';

export const runtime = 'nodejs';

const SIZE_MAP: Record<string, number> = {
  small: 512,
  medium: 768,
  large: 1024
};

function resolveDimensions(size?: string) {
  if (!size) return { width: 1024, height: 1024 };
  const normalized = size.toLowerCase();
  const dimension = SIZE_MAP[normalized] || 1024;
  return { width: dimension, height: dimension };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      prompt,
      negativePrompt,
      style,
      bodyPart,
      size,
      width,
      height,
      sampleCount,
      aspectRatio,
      safetyFilterLevel,
      personGeneration,
      outputFormat,
      seed
    } = body || {};

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: 'Prompt is required', code: 'INVALID_PROMPT' },
        { status: 400 }
      );
    }

    const requestedCount = Number(sampleCount || 1);
    const widthValue = Number(width);
    const heightValue = Number(height);
    const dimensions = Number.isFinite(widthValue) && Number.isFinite(heightValue)
      ? { width: widthValue, height: heightValue }
      : resolveDimensions(size);

    const options: ImagenGenerationOptions = {
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
    };

    const result = await generateAndUploadImages(options);
    const usage = getUsageSnapshot();
    const costPerImage = usage.costPerImage;
    const totalCost = Number((costPerImage * requestedCount).toFixed(4));

    return NextResponse.json({
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
        outputFormat: outputFormat || 'png'
      },
      cost: {
        perImage: costPerImage,
        total: totalCost,
        currency: 'USD'
      },
      usage
    });
  } catch (error: any) {
    const code = error?.code || 'GENERATION_FAILED';
    const status = code === 'INVALID_PROMPT' ? 400 : code === 'VERTEX_QUOTA_EXCEEDED' ? 429 : 500;
    return NextResponse.json(
      {
        error: error?.message || 'Generation failed',
        code,
        details: error?.details || null
      },
      { status }
    );
  }
}
