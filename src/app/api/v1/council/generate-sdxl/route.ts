/**
 * POST /api/v1/council/generate-sdxl
 *
 * Runs the SDXL/Illustrious pipeline (parallel route to the existing Flux
 * council). Long-running: relies on Vercel Pro extended maxDuration (120s).
 *
 * Body: { prompt: string }
 * Response: { success, compositeUrl, subprompts, generationUrls, totalMs }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { runSdxlPipeline } from '@/lib/sdxl-pipeline/runPipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Vercel Pro: extended timeout (Hobby tier caps at 60s; this route needs Pro).
export const maxDuration = 120;

const REQUIRED_ENV = [
    'REPLICATE_API_TOKEN',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
];

export async function POST(req: NextRequest) {
    const authError = verifyApiAuth(req);
    if (authError) return authError;

    const missing = REQUIRED_ENV.filter((k) => !process.env[k] || process.env[k]?.trim() === '');
    if (missing.length > 0) {
        return NextResponse.json(
            {
                error: 'SDXL pipeline misconfigured',
                code: 'PIPELINE_NOT_CONFIGURED',
                missing,
            },
            { status: 503 }
        );
    }

    let body: { prompt?: unknown };
    try {
        body = (await req.json()) as { prompt?: unknown };
    } catch {
        return NextResponse.json(
            { error: 'Invalid JSON body', code: 'BAD_REQUEST' },
            { status: 400 }
        );
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
        return NextResponse.json(
            { error: 'Missing required field: prompt', code: 'BAD_REQUEST' },
            { status: 400 }
        );
    }

    try {
        const result = await runSdxlPipeline(prompt);
        return NextResponse.json({
            success: true,
            compositeUrl: result.compositeUrl,
            subprompts: result.subprompts,
            generationUrls: result.generationUrls,
            totalMs: result.totalMs,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown pipeline error';
        // Do NOT log full error in case it contains tokens.
        console.error('[generate-sdxl] pipeline failed:', message);
        return NextResponse.json(
            { error: 'Pipeline failed', code: 'PIPELINE_ERROR', message },
            { status: 500 }
        );
    }
}
