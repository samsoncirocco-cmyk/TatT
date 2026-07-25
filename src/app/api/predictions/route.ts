import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

// Official models are invoked by slug ("owner/name") with no version hash;
// validate the shape since the slug lands in the upstream URL path.
const MODEL_SLUG_PATTERN = /^[\w.-]+\/[\w.-]+$/;

export async function POST(req: NextRequest) {
    const authError = await verifyApiAuth(req);
    if (authError) return authError;

    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

    if (!REPLICATE_API_TOKEN) {
        return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 });
    }

    try {
        const body = await req.json();
        console.log('[Proxy] Creating prediction...');

        // Slug-based bodies ({ model, input }) hit the official-model endpoint;
        // legacy bodies ({ version, input }) keep the hash-pinned endpoint.
        const { model, ...rest } = body;
        let endpoint = `${REPLICATE_API_URL}/predictions`;
        if (typeof model === 'string') {
            if (!MODEL_SLUG_PATTERN.test(model)) {
                return NextResponse.json({ error: `Invalid model slug: ${model}` }, { status: 400 });
            }
            endpoint = `${REPLICATE_API_URL}/models/${model}/predictions`;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(rest)
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        console.log('[Proxy] Prediction created:', data.id);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Proxy] Prediction error:', error);
        return NextResponse.json({ error: 'Failed to create prediction', details: error.message }, { status: 500 });
    }
}
