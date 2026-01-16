import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.VITE_REPLICATE_API_TOKEN;
    // Await params in Next.js 15+ (if using recent version, param/searchParams are promises)
    // Assuming Next.js 14/15 here based on "manama-next"
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!REPLICATE_API_TOKEN) {
        return NextResponse.json({ error: 'REPLICATE_API_TOKEN not configured' }, { status: 500 });
    }

    try {
        const response = await fetch(`${REPLICATE_API_URL}/predictions/${id}`, {
            headers: { 'Authorization': `Token ${REPLICATE_API_TOKEN}` }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Proxy] Prediction status error:', error);
        return NextResponse.json({ error: 'Failed to get prediction status', details: error.message }, { status: 500 });
    }
}
