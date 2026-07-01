import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { generateWithRetry } from '@/services/generationService';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkBudget, recordSpend } from '@/lib/budget-tracker';
import { createRequestLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── Replicate Fallback ──────────────────────────────────────────────────
// If Vertex AI (Imagen 3) fails or isn't configured, fall back to Replicate
// SDXL for image generation. Uses REPLICATE_API_TOKEN env var.

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

const REPLICATE_MODELS: Record<string, { version: string; params: Record<string, unknown> }> = {
  sdxl: {
    version: 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    params: { num_outputs: 4, width: 1024, height: 1024, scheduler: 'K_EULER', num_inference_steps: 30, guidance_scale: 7.5 }
  },
  dreamshaper: {
    version: 'lucataco/dreamshaper-xl-turbo:0a1710e0187b01a255302738ca0158ff02a22f4638679533e111082f9dd1b615',
    params: { num_outputs: 4, width: 1024, height: 1024, scheduler: 'K_EULER', num_inference_steps: 6, guidance_scale: 2 }
  },
};

async function generateWithReplicate({ prompt, negativePrompt, numImages, model = 'sdxl' }: {
  prompt: string; negativePrompt?: string; numImages: number; model?: string;
}): Promise<{ success: boolean; images: string[]; metadata: Record<string, unknown> }> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured');

  const modelConfig = REPLICATE_MODELS[model] || REPLICATE_MODELS.sdxl;

  // Create prediction
  const createRes = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: 'POST',
    headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json', 'Prefer': 'wait' },
    body: JSON.stringify({
      input: {
        prompt,
        negative_prompt: negativePrompt || '',
        num_outputs: Math.min(numImages, 4),
        ...modelConfig.params,
      },
      version: modelConfig.version,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Replicate API Error: ${createRes.status} - ${errText}`);
  }

  let prediction = await createRes.json();

  // If not using Prefer: wait, poll for completion
  if (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
    const maxPolls = 60;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`${REPLICATE_API_URL}/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Token ${token}` },
      });
      prediction = await pollRes.json();
      if (prediction.status === 'succeeded' || prediction.status === 'failed') break;
    }
  }

  if (prediction.status === 'failed') {
    throw new Error(`Replicate prediction failed: ${prediction.error || 'unknown error'}`);
  }

  const images: string[] = prediction.output || [];
  return { success: true, images, metadata: { model, provider: 'replicate' } };
}
// ─────────────────────────────────────────────────────────────────────────

const SIZE_MAP: Record<string, number> = {
    small: 512,
    medium: 768,
    large: 1024
};

function resolveDimensions(size: any) {
    if (!size) return { width: 1024, height: 1024 };
    const normalized = String(size).toLowerCase();
    const dimension = SIZE_MAP[normalized] || 1024;
    return { width: dimension, height: dimension };
}

// Demo-mode mock images (Unsplash tattoo photos, no API cost)
const DEMO_MOCK_IMAGES = [
    'https://images.unsplash.com/photo-1565058379802-bbe93b2f703f?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1590246814883-57c511e76729?w=1024&h=1024&fit=crop',
];

export async function POST(req: NextRequest) {
    const reqLogger = createRequestLogger('generate');

    // Auth check
    const authError = verifyApiAuth(req);
    if (authError) return authError;

    // ─── DEMO MODE ─────────────────────────────────────────────────────────
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        const body = await req.json().catch(() => ({}));
        const sampleCount = Math.min(Number(body.sampleCount || body.num_outputs || 4), 4);
        await new Promise(r => setTimeout(r, 1500));
        return NextResponse.json({
            success: true,
            images: DEMO_MOCK_IMAGES.slice(0, sampleCount),
            metadata: {
                generatedAt: new Date().toISOString(),
                prompt: body.prompt || 'demo',
                model: 'demo-mode',
                provider: 'demo',
                demoMode: true,
            }
        });
    }

    const rateResult = await rateLimit(req, 'generation');
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

    // Parse body once — used by both Vertex AI path and Replicate fallback
    const body = await req.json().catch(() => ({}));
    const { prompt: requestPrompt, negativePrompt: requestNegativePrompt } = body;

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
        } = body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
            return NextResponse.json({ error: 'Prompt is required', code: 'INVALID_PROMPT' }, { status: 400 });
        }

        const requestedCount = Number(sampleCount || num_outputs || 1);
        if (Number.isNaN(requestedCount) || requestedCount < 1 || requestedCount > 4) {
            return NextResponse.json({ error: 'sampleCount must be between 1 and 4', code: 'INVALID_SAMPLE_COUNT' }, { status: 400 });
        }

        const widthValue = Number(width);
        const heightValue = Number(height);
        const dimensions = Number.isFinite(widthValue) && Number.isFinite(heightValue)
            ? { width: widthValue, height: heightValue }
            : resolveDimensions(size);

        const result = await generateWithRetry({
            prompt: prompt.trim(),
            negativePrompt: negativePrompt?.trim(),
            numImages: requestedCount,
            aspectRatio: aspectRatio || '1:1',
            safetyFilterLevel,
            personGeneration,
            outputFormat,
            seed,
            retry: {
                attempts: 2,
                baseDelayMs: 400
            },
            fallback: {
                safetyFilterLevel: 'block_only_high'
            }
        });

        return NextResponse.json({
            success: true,
            images: result.images,
            metadata: {
                generatedAt: new Date().toISOString(),
                prompt: prompt.trim(),
                negativePrompt: negativePrompt?.trim() || null,
                model: 'imagen-3.0-generate-001',
                provider: 'vertex-ai',
                style: style || null,
                bodyPart: bodyPart || null,
                size: size || null,
                aspectRatio: aspectRatio || '1:1',
                outputFormat: 'png',
                durationMs: result.metadata.durationMs,
                attempts: result.metadata.attempts,
                safetyFilterLevel: result.metadata.safetyFilterLevel,
                personGeneration: result.metadata.personGeneration,
                seed: result.metadata.seed ?? null,
                fallbackUsed: result.metadata.fallbackUsed
            }
        });

    } catch (error: any) {
        // Log generation failure
        reqLogger.error('generation.failed', error, {
            model: 'imagen-3.0-generate-001',
            error_code: error.code || 'GENERATION_FAILED',
        });

        // ─── Replicate Fallback ───────────────────────────────────────────
        // If Vertex AI fails for any reason (credentials, quota, etc.),
        // fall back to Replicate SDXL if a token is configured.
        if (process.env.REPLICATE_API_TOKEN) {
            try {
                reqLogger.start('generation.fallback.replicate', {
                    reason: error.code || error.message || 'VERTEX_FAILED',
                });

                const replicateResult = await generateWithReplicate({
                    prompt: requestPrompt || '',
                    negativePrompt: requestNegativePrompt,
                    numImages: 1,
                    model: 'sdxl',
                });

                const fallbackCostCents = 1;
                await recordSpend(fallbackCostCents);

                reqLogger.complete('generation.fallback.replicate.success', {
                    model: 'sdxl',
                    image_count: replicateResult.images.length,
                });

                return NextResponse.json({
                    success: true,
                    images: replicateResult.images,
                    metadata: {
                        generatedAt: new Date().toISOString(),
                        prompt: requestPrompt || '',
                        model: 'sdxl',
                        provider: 'replicate',
                        fallback: true,
                        fallbackReason: error.code || error.message || 'VERTEX_FAILED',
                    }
                });
            } catch (replicateError: any) {
                reqLogger.error('generation.fallback.replicate.failed', replicateError, {});
            }
        }

        if (error.code === 'VERTEX_QUOTA_EXCEEDED') {
            return NextResponse.json({
                error: 'Vertex AI quota exceeded',
                code: 'VERTEX_QUOTA_EXCEEDED',
                details: error.details || null
            }, { status: 429 });
        }

        if (error.code === 'VERTEX_NOT_CONFIGURED' || error.code === 'GCS_NOT_CONFIGURED') {
            return NextResponse.json({
                error: 'Generation service not configured',
                code: error.code,
                message: error.message
            }, { status: 500 });
        }

        if (error.code === 'INVALID_PROMPT') {
            return NextResponse.json({
                error: error.message,
                code: error.code
            }, { status: 400 });
        }

        return NextResponse.json({
            error: 'Generation failed',
            code: error.code || 'GENERATION_FAILED',
            message: error.message
        }, { status: 500 });
    }
}
