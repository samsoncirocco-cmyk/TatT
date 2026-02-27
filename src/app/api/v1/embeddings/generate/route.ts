import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
// @ts-ignore
import { generateEmbedding } from '@/services/vertex-ai-service.js';
// @ts-ignore
import { storeEmbedding } from '@/services/vectorDbService';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { createRequestLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const reqLogger = createRequestLogger('embeddings');

    const authError = verifyApiAuth(req);
    if (authError) return authError;

    const rateResult = await checkRateLimit(req, 'default');
    if (!rateResult.allowed) {
        return rateLimitResponse(rateResult);
    }

    try {
        const body = await req.json();
        const { artistId, imageUrls } = body;

        if (!artistId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return NextResponse.json({ error: 'Missing required fields: artistId, imageUrls[]' }, { status: 400 });
        }

        // Log embedding start
        reqLogger.start('embeddings.started', {
            input_type: 'image',
            input_count: imageUrls.length,
            artist_id: artistId,
        });

        const embedding = await generateEmbedding(imageUrls);
        const stored = await storeEmbedding(artistId, embedding, {
            source_images: imageUrls,
            model_version: 'vertex-multimodal-v1'
        });

        // Log embedding completion
        reqLogger.complete('embeddings.completed', {
            embedding_count: 1,
            dimension: embedding.length,
            artist_id: artistId,
        });

        return NextResponse.json({
            success: true,
            artistId,
            embeddingLength: embedding.length,
            record: stored
        });

    } catch (error: any) {
        // Log embedding failure
        reqLogger.error('embeddings.failed', error);
        return NextResponse.json({ error: 'Embedding generation failed', message: error.message }, { status: 500 });
    }
}
