import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import '../../../../../lib/auth-dal';
import { generateWithImagen } from '../../../../../services/vertex-ai-edge';
import { uploadGeneratedImage } from '../../../../../services/storage/imageStorageService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TaskBody = {
  userId: string;
  prompt: string;
  parameters?: Record<string, unknown>;
  designId: string;
  versionId: string;
};

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) {
    // Fall back: assume base64
    return { bytes: Uint8Array.from(Buffer.from(dataUrl, 'base64')), mimeType: 'image/png' };
  }
  const mimeType = match[1] || 'image/png';
  const base64 = match[2] || '';
  return { bytes: Uint8Array.from(Buffer.from(base64, 'base64')), mimeType };
}

export async function POST(req: NextRequest) {
  const taskName = req.headers.get('x-cloudtasks-taskname');
  if (!taskName) {
    return NextResponse.json({ error: 'Missing Cloud Tasks headers' }, { status: 401 });
  }

  let body: TaskBody;
  try {
    body = (await req.json()) as TaskBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, prompt, parameters, designId, versionId } = body;
  if (!userId || !prompt || !designId || !versionId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const startedAt = Date.now();
    const negativePrompt = typeof parameters?.negativePrompt === 'string' ? parameters.negativePrompt : undefined;
    const aspectRatio = typeof parameters?.aspectRatio === 'string' ? parameters.aspectRatio : '1:1';
    const sampleCountRaw = (parameters as any)?.sampleCount ?? (parameters as any)?.num_outputs ?? 1;
    const sampleCount = Math.min(4, Math.max(1, Number(sampleCountRaw) || 1));

    const result = await generateWithImagen({
      prompt: String(prompt).trim(),
      negativePrompt,
      numImages: sampleCount,
      aspectRatio,
    });

    const firstImage = result.images?.[0];
    if (!firstImage) {
      throw new Error('Generation returned no images');
    }

    const { bytes } = decodeDataUrl(firstImage);
    const imageUrl = await uploadGeneratedImage(userId, designId, versionId, bytes);

    const db = getFirestore();
    await db
      .collection('users')
      .doc(userId)
      .collection('designs')
      .doc(designId)
      .collection('versions')
      .doc(versionId)
      .set(
        {
          imageUrl,
          updatedAt: FieldValue.serverTimestamp(),
          generation: {
            taskName,
            provider: 'vertex-ai',
            model: 'imagen-3.0-generate-001',
            durationMs: Date.now() - startedAt,
          },
        },
        { merge: true }
      );

    return NextResponse.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error('[TaskHandler] Generation task failed:', error);
    return NextResponse.json(
      { error: 'Task failed', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
