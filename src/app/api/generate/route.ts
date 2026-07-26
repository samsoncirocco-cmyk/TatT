import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { generate } from '@/services/generation';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkBudget, recordSpend, VERTEX_IMAGEN_COST_CENTS } from '@/lib/budget-tracker';
import {
  enforceQuota,
  getUsageSnapshot,
  recordUsage,
  uploadGeneratedImages
} from './imagen-upload';

export const runtime = 'nodejs';

// Thin adapter: the generation module produces images; this route composes
// generation + GCS upload (upload is deliberately NOT the module's job —
// spec: generation-module).
//
// Cost controls (issue #181): this route is auth-gated but was missing the
// shared rate limit and monthly budget cap that /api/v1/generate enforces —
// any signed-in user could generate real, billable Vertex AI images with
// neither. imagen-upload's own enforceQuota() is a route-local daily-request
// guard (off by default unless VERTEX_DAILY_REQUEST_LIMIT is set) — it stays
// as a secondary check, not a replacement for the shared limiter/tracker.

export async function POST(request: NextRequest) {
  const authError = await verifyApiAuth(request);
  if (authError) return authError;

  const rateResult = await rateLimit(request, 'generation');
  if (!rateResult.allowed) {
    return rateLimitResponse(rateResult);
  }

  const budgetResult = await checkBudget();
  if (!budgetResult.allowed) {
    return NextResponse.json(
      { error: 'Budget limit reached', spentCents: budgetResult.spentCents },
      { status: 402 }
    );
  }

  try {
    const body = await request.json();
    const {
      prompt,
      negativePrompt,
      style,
      bodyPart,
      size,
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

    enforceQuota();

    const result = await generate({
      prompt: prompt.trim(),
      negativePrompt: negativePrompt?.trim(),
      numImages: requestedCount,
      aspectRatio: aspectRatio || '1:1',
      safetyFilterLevel,
      personGeneration,
      outputFormat,
      seed,
      modelId: 'imagen3',
      allowProviderFallback: false
    });

    recordUsage(result.images.length);

    // Real Vertex AI spend, on the same shared tracker /api/v1/generate uses
    // — this route only ever calls Vertex/imagen3 (allowProviderFallback:
    // false above), so there's no replicate-fallback cost branch to handle.
    await recordSpend(VERTEX_IMAGEN_COST_CENTS * result.images.length);

    const uploaded = await uploadGeneratedImages(result.images, {
      style: style || '',
      bodyPart: bodyPart || '',
      size: size || ''
    });

    const usage = getUsageSnapshot();
    const costPerImage = Number(usage.costPerImage) || 0;
    const totalCost = Number((costPerImage * requestedCount).toFixed(4));

    return NextResponse.json({
      success: true,
      images: uploaded.urls,
      uploads: uploaded.uploads,
      metadata: {
        generatedAt: new Date().toISOString(),
        prompt: prompt.trim(),
        negativePrompt: negativePrompt?.trim() || null,
        model: result.metadata.model,
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
