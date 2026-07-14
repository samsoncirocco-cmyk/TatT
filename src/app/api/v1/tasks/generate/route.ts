import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { OAuth2Client } from 'google-auth-library';
import '../../../../../lib/auth-dal';
import { generateWithImagen } from '../../../../../services/vertex-ai-edge';
import { uploadGeneratedImage } from '../../../../../services/storage/imageStorageService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const oidcClient = new OAuth2Client();

/**
 * Verify the Cloud Tasks OIDC bearer token. Cloud Tasks signs each dispatch
 * with a Google-issued ID token whose audience and service-account email we
 * control. Returns null on success, or a 401 NextResponse on failure.
 *
 * Fails closed: a bypass is allowed ONLY when ALLOW_UNAUTHENTICATED_TASKS=true
 * (local dev). NODE_ENV=production never honors the bypass.
 */
async function verifyCloudTasksAuth(req: NextRequest): Promise<NextResponse | null> {
  const bypassAllowed =
    process.env.ALLOW_UNAUTHENTICATED_TASKS === 'true' &&
    process.env.NODE_ENV !== 'production';
  if (bypassAllowed) return null;

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Missing OIDC bearer token' }, { status: 401 });
  }

  const audience = process.env.CLOUD_TASKS_OIDC_AUDIENCE;
  const serviceAccountEmail = process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;
  if (!audience || !serviceAccountEmail) {
    return NextResponse.json(
      { error: 'Cloud Tasks auth not configured' },
      { status: 401 }
    );
  }

  try {
    const ticket = await oidcClient.verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    if (!payload || payload.email !== serviceAccountEmail || payload.email_verified !== true) {
      return NextResponse.json({ error: 'Invalid OIDC token' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid OIDC token' }, { status: 401 });
  }

  return null;
}

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
  const authError = await verifyCloudTasksAuth(req);
  if (authError) return authError;

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
