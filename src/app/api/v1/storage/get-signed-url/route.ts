import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { getSignedUrl } from '@/services/gcs-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const authError = verifyApiAuth(req);
    if (authError) return authError;

    try {
        const { filePath, expirySeconds, action = 'read' } = await req.json();

        if (!filePath) {
            return NextResponse.json({ error: 'Missing filePath' }, { status: 400 });
        }

        const url = await getSignedUrl(filePath, expirySeconds, action);

        return NextResponse.json({
            success: true,
            url,
            filePath,
            action
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Storage] Signed URL failed:', message);
        return NextResponse.json({ error: 'Signed URL failed', message }, { status: 500 });
    }
}
