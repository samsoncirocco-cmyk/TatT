import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
    const { filename } = await params;

    // Security check: filename should be safe
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
        return new NextResponse('Invalid filename', { status: 400 });
    }

    const UPLOAD_DIR = path.join(os.tmpdir(), 'manama-uploads');
    const filepath = path.join(UPLOAD_DIR, filename);

    try {
        const fileBuffer = await fs.readFile(filepath);

        const ext = path.extname(filename).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.webp') contentType = 'image/webp';

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600'
            }
        });
    } catch (error) {
        return new NextResponse('File not found', { status: 404 });
    }
}
