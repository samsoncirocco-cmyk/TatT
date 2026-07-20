import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import '../../../../../lib/auth-dal';
import { generate, type AspectRatio } from '@/services/generation';
import { uploadGeneratedImage } from '../../../../../services/storage/imageStorageService';
import { verifyCloudTaskRequest } from '../../../../../lib/cloud-tasks-auth';

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
  // Centralized OIDC verify (hardening) with main's fail-closed / local bypass.
  if (!(await verifyCloudTaskRequest(req))) {
    return NextResponse.json({ error: 'Invalid Cloud Tasks identity' }, { status: 401 });
  }

  // For logging/traceability only — not trusted for authentication.
  const taskName = req.headers.get('x-cloudtasks-taskname') || null;

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

    // Explicit model choice + no cross-provider fallback: this task handler
    // decodes data-URL output for its own GCS upload, and Replicate returns
    // hosted URLs instead — the fallback shape would break the upload step.
    const result = await generate({
      prompt: String(prompt).trim(),
      negativePrompt,
      numImages: sampleCount,
      aspectRatio: aspectRatio as AspectRatio,
      modelId: 'imagen3',
      allowProviderFallback: false,
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
            model: result.metadata.model,
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
