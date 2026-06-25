import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import crypto from 'crypto';
import { uploadToGCS } from '@/services/gcs-service';

export const runtime = 'nodejs';

function sanitizeFilename(name: string) {
  const trimmed = (name || '').trim() || 'layer.png';
  // Keep it boring: ascii, no slashes.
  return trimmed
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.+/g, '.')
    .replace(/_+/g, '_')
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  const authError = verifyApiAuth(req);
  if (authError) return authError;

  try {
    const { imageData, filename } = await req.json();

    if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
    }

    const match = imageData.match(/^data:(.+?);base64,(.*)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid data URL' }, { status: 400 });
    }

    const contentType = match[1] || 'image/png';
    const buffer = Buffer.from(match[2], 'base64');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);

    const safeName = sanitizeFilename(filename || 'layer.png');
    const destinationPath = `layers/${Date.now()}_${hash}_${safeName}`;

    const result = await uploadToGCS(buffer, destinationPath, {
      contentType
    });

    return NextResponse.json({
      url: result.url,
      gcsPath: result.gcsPath
    });
  } catch (error: any) {
    console.error('[UploadLayer] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

