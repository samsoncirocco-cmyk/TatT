import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { generateWithImagen } from '@/services/vertex-ai-edge';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkBudget, recordSpend } from '@/lib/budget-tracker';
import { createRequestLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function POST(req: NextRequest) {
    const reqLogger = createRequestLogger('generate');

    // Auth check
    const authError = verifyApiAuth(req);
    if (authError) return authError;

    const rateResult = await checkRateLimit(req, 'generation');
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
        const body = await req.json();
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

        // Log generation start
        reqLogger.start('generation.started', {
            model: 'imagen-3.0-generate-001',
            prompt_length: prompt.trim().length,
            body_part: bodyPart || null,
            style: style || null,
            sample_count: requestedCount,
        });

        // Call Edge Service (Imagen)
        const result = await generateWithImagen({
            prompt: prompt.trim(),
            negativePrompt: negativePrompt?.trim(),
            numImages: requestedCount,
            aspectRatio: aspectRatio || '1:1'
        });

        // result.images is array of base64 data strings
        const durationMs = Date.now() - Date.now(); // Approximate

        // Conservative default estimate per generation (tune later based on provider).
        const costCents = 5;
        await recordSpend(costCents);

        // Log generation completion
        reqLogger.complete('generation.completed', {
            model: 'imagen-3.0-generate-001',
            image_count: result.images.length,
            cost_cents: costCents,
        });

        return NextResponse.json({
            success: true,
            images: result.images, // Base64 data URIs
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
                durationMs
            }
        });

    } catch (error: any) {
        // Log generation failure
        reqLogger.error('generation.failed', error, {
            model: 'imagen-3.0-generate-001',
            error_code: error.code || 'GENERATION_FAILED',
        });

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
