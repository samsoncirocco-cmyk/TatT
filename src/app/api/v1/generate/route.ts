import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { generate } from '@/services/generation';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkBudget, recordSpend, VERTEX_IMAGEN_COST_CENTS } from '@/lib/budget-tracker';
import { createRequestLogger } from '@/lib/logger';
import { DEMO_MOCK_IMAGES } from '@/lib/demo-images';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Thin adapter over the generation module (ADR-0001). Vertex retry, the
// relaxed-safety fallback, and the vertex → replicate-sdxl fallback (gated on
// REPLICATE_API_TOKEN) all live INSIDE generate() now — this route only does
// auth/rate/budget policy, spend recording, and response-shape mapping.

// Spend on a replicate-sdxl fallback result (~1 cent), matching the old
// route's flat fallback cost.
const REPLICATE_FALLBACK_COST_CENTS = 1;
// Primary Replicate (style-routed Flux/Krea) — per image, same rate the
// design-session ledger uses for Replicate purchases.
const REPLICATE_COST_CENTS = 1;

/** Derive outputFormat from a data-URL mime type (Gemini may return jpeg/png/…). */
function outputFormatFromImages(images: string[] | undefined): string {
    const match = images?.[0]?.match(/^data:image\/([^;]+);/i);
    return match?.[1]?.toLowerCase() || 'png';
}

export async function POST(req: NextRequest) {
    const reqLogger = createRequestLogger('generate');

    // Auth check
    const authError = await verifyApiAuth(req);
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

    const body = await req.json().catch(() => ({}));

    try {
        const {
            prompt,
            negativePrompt,
            style,
            bodyPart,
            size,
            sampleCount,
            num_outputs,
            aspectRatio,
            safetyFilterLevel,
            personGeneration,
            outputFormat,
            seed,
            modelId
        } = body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
            return NextResponse.json({ error: 'Prompt is required', code: 'INVALID_PROMPT' }, { status: 400 });
        }

        const requestedCount = Number(sampleCount || num_outputs || 1);
        if (Number.isNaN(requestedCount) || requestedCount < 1 || requestedCount > 4) {
            return NextResponse.json({ error: 'sampleCount must be between 1 and 4', code: 'INVALID_SAMPLE_COUNT' }, { status: 400 });
        }

        const result = await generate({
            prompt: prompt.trim(),
            negativePrompt: negativePrompt?.trim(),
            numImages: requestedCount,
            aspectRatio: aspectRatio || '1:1',
            safetyFilterLevel,
            personGeneration,
            outputFormat,
            seed,
            // Route by style when the caller does not pin a model. This used
            // to hardcode modelId 'imagen3', which made every call here go to
            // Google no matter what modelRoutingRules.js said. Explicit picks
            // (Studio Hyper-Realism → imagen3) still forward modelId so the
            // user's choice is not overwritten by style routing.
            ...(typeof modelId === 'string' && modelId.trim() ? { modelId: modelId.trim() } : {}),
            style,
            bodyPart,
            retry: {
                maxRetries: 2,
                baseDelayMs: 400
            },
            fallback: {
                safetyFilterLevel: 'block_only_high'
            }
        });

        // ─── Cross-provider fallback result ───────────────────────────────
        // The module fell back to Replicate after a Vertex failure.
        // Primary Replicate (style-routed Flux/Krea) also has
        // provider === 'replicate' but fallbackUsed === false — that path
        // must keep the full success shape and per-image spend below.
        if (result.metadata.provider === 'replicate' && result.metadata.fallbackUsed) {
            await recordSpend(REPLICATE_FALLBACK_COST_CENTS);

            reqLogger.complete('generation.fallback.replicate.success', {
                model: result.metadata.model,
                image_count: result.images.length,
            });

            return NextResponse.json({
                success: true,
                images: result.images,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    prompt: prompt.trim(),
                    model: result.metadata.model,
                    provider: 'replicate',
                    fallback: true,
                    fallbackReason: result.metadata.fallbackReason || 'VERTEX_FAILED',
                }
            });
        }

        // Primary success — Vertex or style-routed Replicate.
        const imagesGenerated = result.images?.length || requestedCount;
        const spendCents =
            result.metadata.provider === 'replicate'
                ? REPLICATE_COST_CENTS * imagesGenerated
                : VERTEX_IMAGEN_COST_CENTS * imagesGenerated;
        await recordSpend(spendCents);

        return NextResponse.json({
            success: true,
            images: result.images,
            metadata: {
                generatedAt: new Date().toISOString(),
                prompt: prompt.trim(),
                negativePrompt: negativePrompt?.trim() || null,
                model: result.metadata.model,
                provider: result.metadata.provider,
                style: style || null,
                bodyPart: bodyPart || null,
                size: size || null,
                aspectRatio: aspectRatio || '1:1',
                outputFormat: outputFormatFromImages(result.images),
                durationMs: result.metadata.durationMs,
                attempts: result.metadata.attempts,
                safetyFilterLevel: result.metadata.safetyFilterLevel,
                personGeneration: result.metadata.personGeneration,
                seed: result.metadata.seed ?? null,
                fallbackUsed: result.metadata.fallbackUsed
            }
        });

    } catch (error: any) {
        // Log generation failure. The routing key, not a Google model name —
        // the generation module owns which model 'imagen3' resolves to, and a
        // literal here goes stale the moment that changes (as it did when
        // Imagen 3 was retired).
        reqLogger.error('generation.failed', error, {
            model: 'imagen3',
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
