import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import '../../../../../lib/auth-dal';
import { generate, type AspectRatio } from '@/services/generation';
import { uploadGeneratedImage } from '../../../../../services/storage/imageStorageService';
import { verifyCloudTaskRequest } from '../../../../../lib/cloud-tasks-auth';
import {
  checkBudget,
  recordSpend,
  VERTEX_IMAGEN_COST_CENTS,
} from '../../../../../lib/budget-tracker';

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
    const sampleCountRaw = parameters?.sampleCount ?? parameters?.num_outputs ?? 1;
    const sampleCount = Math.min(4, Math.max(1, Number(sampleCountRaw) || 1));
    const db = getFirestore();
    const versionRef = db
      .collection('users')
      .doc(userId)
      .collection('designs')
      .doc(designId)
      .collection('versions')
      .doc(versionId);

    // Cloud Tasks retries non-2xx deliveries. Once this version has an image,
    // returning the completed result avoids the obvious duplicate Vertex call.
    // This cannot close the smaller crash window between Vertex success and the
    // final Firestore write because those external systems share no transaction.
    const existingVersion = await versionRef.get();
    const existingImageUrl = existingVersion.data()?.imageUrl;
    if (typeof existingImageUrl === 'string' && existingImageUrl.length > 0) {
      return NextResponse.json({ success: true, imageUrl: existingImageUrl });
    }

    const budgetResult = await checkBudget(userId);
    const requestedSpendCents = VERTEX_IMAGEN_COST_CENTS * sampleCount;
    if (!budgetResult.allowed) {
      return NextResponse.json(
        { error: 'Budget limit reached', spentCents: budgetResult.spentCents },
        { status: 402 }
      );
    }
    // checkBudget uses remainingCents: -1 when its backing store is unavailable.
    // Paid async work must fail closed so a temporary tracker outage cannot
    // become an unbounded Cloud Tasks generation path.
    if (budgetResult.remainingCents < 0) {
      return NextResponse.json({ error: 'Budget verification unavailable' }, { status: 503 });
    }
    if (budgetResult.remainingCents < requestedSpendCents) {
      return NextResponse.json(
        { error: 'Budget limit reached', spentCents: budgetResult.spentCents },
        { status: 402 }
      );
    }

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

    // Vertex has completed billable work at this point. Charge the number of
    // images actually returned, not the requested count.
    await recordSpend(VERTEX_IMAGEN_COST_CENTS * result.images.length);

    const { bytes } = decodeDataUrl(firstImage);
    const imageUrl = await uploadGeneratedImage(userId, designId, versionId, bytes);

    await versionRef.set(
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
  } catch (error: unknown) {
    console.error('[TaskHandler] Generation task failed:', error);
    return NextResponse.json(
      {
        error: 'Task failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
