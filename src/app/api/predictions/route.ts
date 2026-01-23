import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

export async function POST(req: NextRequest) {
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

    if (!REPLICATE_API_TOKEN) {
        return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 });
    }

    try {
        const body = await req.json();
        console.log('[Proxy] Creating prediction...');

        const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${REPLICATE_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
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
