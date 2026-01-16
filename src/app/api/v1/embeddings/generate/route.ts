import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
// @ts-ignore
import { generateEmbedding } from '@/services/vertex-ai-service.js';
// @ts-ignore
import { storeEmbedding } from '@/services/vectorDbService.js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const authError = verifyApiAuth(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const { artistId, imageUrls } = body;

        if (!artistId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return NextResponse.json({ error: 'Missing required fields: artistId, imageUrls[]' }, { status: 400 });
        }

        const embedding = await generateEmbedding(imageUrls);
        const stored = await storeEmbedding(artistId, embedding, {
            source_images: imageUrls,
            model_version: 'vertex-multimodal-v1'
        });

        return NextResponse.json({
            success: true,
            artistId,
            embeddingLength: embedding.length,
            record: stored
        });

    } catch (error: any) {
        console.error('[Embeddings] Failed:', error);
        return NextResponse.json({ error: 'Embedding generation failed', message: error.message }, { status: 500 });
    }
}
