import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { generateWithImagen } from '@/services/vertex-ai-edge';

export const runtime = 'edge';

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
    // Auth check
    const authError = verifyApiAuth(req);
    if (authError) return authError;

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

        // Call Edge Service (Imagen)
        const result = await generateWithImagen({
            prompt: prompt.trim(),
            negativePrompt: negativePrompt?.trim(),
            numImages: requestedCount,
            aspectRatio: aspectRatio || '1:1'
        });

        // result.images is array of base64 data strings
        const durationMs = Date.now() - Date.now(); // Approximate

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
        console.error('[API] Imagen generation error:', error);

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
