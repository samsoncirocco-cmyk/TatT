import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    return NextResponse.json({
        status: 'ok',
        message: 'Next.js API is running',
        authRequired: true,
        api_version: 'v1',
        endpoints: {
            v1: {
                semantic_match: '/api/v1/match/semantic (100 req/hr)',
                council_enhancement: '/api/v1/council/enhance (20 req/hr)',
                stencil_export: '/api/v1/stencil/export (30 req/hr)',
                layer_upload: '/api/v1/upload-layer (200 req/hr)',
                layer_decompose: '/api/v1/layers/decompose (60 req/hr)',
                embeddings_generate: '/api/v1/embeddings/generate (200 req/hr)',
                match_update: '/api/v1/match/update (300 req/hr)',
                storage: '/api/v1/storage (300 req/hr)',
                imagen_generate: '/api/v1/generate (60 req/hr)'
            }
        }
    });
}
