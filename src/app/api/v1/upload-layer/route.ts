import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

export const runtime = 'nodejs';

// Use temp dir
const UPLOAD_DIR = path.join(os.tmpdir(), 'manama-uploads');

async function ensureUploadDir() {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function POST(req: NextRequest) {
    try {
        const { imageData } = await req.json();

        if (!imageData) {
            return NextResponse.json({ error: 'Missing imageData in request body' }, { status: 400 });
        }

        await ensureUploadDir();

        let base64Data;
        let mimeType = 'image/png';

        if (imageData.startsWith('data:')) {
            const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                return NextResponse.json({ error: 'Invalid data URL format' }, { status: 400 });
            }
            mimeType = matches[1];
            base64Data = matches[2];
        } else {
            base64Data = imageData;
        }

        const hash = crypto.createHash('sha256').update(base64Data).digest('hex');
        const fileId = `${hash.substring(0, 16)}_${Date.now()}`;
        const extension = mimeType.split('/')[1] || 'png';
        const allowedExtensions = new Set(['png', 'jpg', 'jpeg', 'webp']);
        const safeExtension = allowedExtensions.has(extension) ? extension : 'png';
        const generatedFilename = `layer_${fileId}.${safeExtension}`;

        const buffer = Buffer.from(base64Data, 'base64');
        const filepath = path.join(UPLOAD_DIR, generatedFilename);
        await fs.writeFile(filepath, buffer);

        const publicUrl = `/uploads/layers/${generatedFilename}`;

        console.log(`[LayerUpload] Saved layer: ${generatedFilename} (${buffer.length} bytes)`);

        return NextResponse.json({
            url: publicUrl,
            size: buffer.length,
            id: fileId
        });

    } catch (error: any) {
        console.error('[LayerUpload] Upload failed:', error);
        return NextResponse.json({ error: 'Failed to upload layer', details: error.message }, { status: 500 });
    }
}
