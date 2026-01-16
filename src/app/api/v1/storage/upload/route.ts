import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import crypto from 'crypto';
// @ts-ignore
import { uploadToGCS } from '@/services/gcs-service.js';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const authError = verifyApiAuth(req);
    if (authError) return authError;

    try {
        const { fileData, contentType = 'image/png', destinationPath } = await req.json();

        if (!fileData) {
            return NextResponse.json({ error: 'Missing fileData' }, { status: 400 });
        }

        let buffer: Buffer;
        if (fileData.startsWith('data:')) {
            const match = fileData.match(/^data:(.+?);base64,(.*)$/);
            if (!match) {
                return NextResponse.json({ error: 'Invalid data URL' }, { status: 400 });
            }
            buffer = Buffer.from(match[2], 'base64');
        } else {
            buffer = Buffer.from(fileData, 'base64');
        }

        const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
        const path = destinationPath || `uploads/${Date.now()}_${hash}.png`;

        const result = await uploadToGCS(buffer, path, {
            contentType
        });

        return NextResponse.json({
            success: true,
            url: result.url,
            gcsPath: result.gcsPath,
            path: result.path
        });

    } catch (error: any) {
        console.error('[Storage] Upload failed:', error);
        return NextResponse.json({ error: 'Upload failed', message: error.message }, { status: 500 });
    }
}
