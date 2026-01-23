import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    const NEO4J_URI = process.env.NEO4J_URI;
    const NEO4J_USER = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
    const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

    return NextResponse.json({
        status: 'ok',
        message: 'Next.js API is running',
        hasReplicateToken: !!REPLICATE_API_TOKEN,
        hasVertexConfig: !!process.env.VERTEX_PROJECT_ID,
        hasGcsConfig: !!process.env.GCS_BUCKET,
        hasNeo4jConfig: !!(NEO4J_URI && NEO4J_USER && NEO4J_PASSWORD),
        authRequired: true,
        api_version: 'v1',
        endpoints: {
            v1: {
                semantic_match: '/api/v1/match/semantic (100 req/hr)',
                ar_visualization: '/api/v1/ar/visualize (50 req/hr)',
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
