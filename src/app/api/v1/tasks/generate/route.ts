import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import '../../../../../lib/auth-dal';
import { generate, type AspectRatio } from '@/services/generation';
import {
  recoverGeneratedImage,
  uploadGeneratedImage,
} from '../../../../../services/storage/imageStorageService';
import { verifyCloudTaskRequest } from '../../../../../lib/cloud-tasks-auth';
import {
  reconcileReservedSpend,
  releaseReservedSpend,
  reserveSpend,
  VERTEX_IMAGEN_COST_CENTS,
} from '../../../../../lib/budget-tracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_GENERATION_LEASE_MS = 15 * 60 * 1000;

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
  const retryCount = req.headers.get('x-cloudtasks-taskretrycount') || '0';

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

  const reservationKey = `async-imagen:${userId}:${designId}:${versionId}`;
  const reservationOwner = `${taskName || reservationKey}:retry-${retryCount}`;
  const configuredLeaseMs = Number(process.env.ASYNC_GENERATION_LEASE_MS);
  const leaseMs = Math.max(
    DEFAULT_GENERATION_LEASE_MS,
    Number.isFinite(configuredLeaseMs) && configuredLeaseMs > 0
      ? configuredLeaseMs
      : DEFAULT_GENERATION_LEASE_MS
  );
  let reservationAcquired = false;
  let providerSucceeded = false;
  let reservationFinalized = false;
  let actualSpendCents = 0;
  let takeover = false;
  let recoveryProbeCompleted = false;

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

    const requestedSpendCents = VERTEX_IMAGEN_COST_CENTS * sampleCount;
    const reservation = await reserveSpend(
      reservationKey,
      requestedSpendCents,
      { ownerId: reservationOwner, leaseMs }
    );
    if (!reservation.allowed) {
      return NextResponse.json(
        { error: 'Budget limit reached', spentCents: reservation.spentCents },
        { status: 402 }
      );
    }

    if (!reservation.acquired) {
      if (reservation.status === 'billed') {
        // The provider already succeeded on an earlier delivery. Recover a
        // deterministic upload if it made it to GCS, but never buy it again.
        const recovered = await recoverGeneratedImage(userId, designId, versionId);
        if (recovered) {
          await versionRef.set(
            {
              imageUrl: recovered.imageUrl,
              updatedAt: FieldValue.serverTimestamp(),
              generation: {
                taskName,
                provider: 'vertex-ai',
                recoveredFromRetry: true,
              },
            },
            { merge: true }
          );
          return NextResponse.json({ success: true, imageUrl: recovered.imageUrl });
        }
        return NextResponse.json(
          { error: 'Generation already billed; stored image is unavailable' },
          { status: 500 }
        );
      }

      // Another delivery owns the reservation and may still be generating.
      // Retrying is safe: followers cannot acquire the same reservation.
      return NextResponse.json({ error: 'Generation already in progress' }, { status: 409 });
    }
    reservationAcquired = true;
    takeover = reservation.takeover;

    // A worker may have crashed after staging the provider result but before
    // reconciling/persisting it. Every fresh owner and lease takeover probes
    // the deterministic object first; recovery also repairs a private object.
    const recovered = await recoverGeneratedImage(userId, designId, versionId);
    recoveryProbeCompleted = true;
    if (recovered) {
      providerSucceeded = true;
      actualSpendCents =
        VERTEX_IMAGEN_COST_CENTS *
        (recovered.actualImageCount ?? Math.max(1, sampleCount));
      await reconcileReservedSpend(reservationKey, actualSpendCents);
      reservationFinalized = true;
      await versionRef.set(
        {
          imageUrl: recovered.imageUrl,
          updatedAt: FieldValue.serverTimestamp(),
          generation: {
            taskName,
            provider: 'vertex-ai',
            recoveredFromRetry: true,
          },
        },
        { merge: true }
      );
      return NextResponse.json({ success: true, imageUrl: recovered.imageUrl });
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

    providerSucceeded = true;
    actualSpendCents = VERTEX_IMAGEN_COST_CENTS * result.images.length;

    // Stage the paid result at its deterministic path before the terminal
    // billed marker. The storage service retries both save and publication,
    // and a later lease owner can recover/repair a partially public object.
    const { bytes } = decodeDataUrl(firstImage);
    const imageUrl = await uploadGeneratedImage(
      userId,
      designId,
      versionId,
      bytes,
      { actualImageCount: result.images.length }
    );

    await reconcileReservedSpend(reservationKey, actualSpendCents);
    reservationFinalized = true;

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
    if (reservationAcquired && providerSucceeded && !reservationFinalized) {
      try {
        // If staging ultimately failed, terminal billing intentionally prevents
        // a retry from purchasing a replacement. If staging partially worked,
        // the billed retry repairs and recovers that object.
        await reconcileReservedSpend(
          reservationKey,
          actualSpendCents || VERTEX_IMAGEN_COST_CENTS
        );
        reservationFinalized = true;
      } catch (reconcileError) {
        console.error('[TaskHandler] Failed to finalize billed reservation:', reconcileError);
      }
    } else if (
      reservationAcquired &&
      !providerSucceeded &&
      (!takeover || recoveryProbeCompleted)
    ) {
      try {
        await releaseReservedSpend(reservationKey, reservationOwner);
      } catch (releaseError) {
        // Keeping a reservation is safer than accidentally allowing a second
        // paid attempt when Firestore is unavailable.
        console.error('[TaskHandler] Failed to release unused budget reservation:', releaseError);
      }
    }
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
