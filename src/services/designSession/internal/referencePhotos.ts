/**
 * Reference-photo storage (ADR-0050): the customer's photo, kept so it can
 * reach the image model as pixels, not just as vision-analysis text.
 *
 * PRIVATE on purpose. Generated designs live at public permanent URLs
 * (imageStorageService), but a customer's own photo is a different
 * category: the repo's placement-photo stance applies ("a channel that
 * quietly started keeping photographs of customers' bodies in a bucket
 * would be a materially different product"). Reference photos are stored
 * as private objects, and each render mints short-lived signed URLs the
 * provider fetches immediately — nothing world-readable, nothing
 * guessable.
 *
 * Upload is fail-soft: a reference whose photo could not be stored keeps
 * its analysis (yesterday's whole product) and simply cannot feed pixels.
 * Signing at render time is NOT fail-soft — by then the session promised
 * the photo informs the render, and a photo silently dropped is the exact
 * failure ADR-0050 forbids, so a signing error fails the render visibly.
 */

import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { uploadToGCS, getSignedUrl } from '@/services/gcs-service';

/** Mime types the intake paths accept, mapped to a storage extension. */
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Long enough for a full reveal (four renders, provider queue included),
 * short enough that a leaked URL goes stale the same hour.
 */
export const REFERENCE_URL_TTL_SECONDS = 15 * 60;

/**
 * Store one reference photo privately; returns the object path, or
 * undefined when the upload failed (the analysis-only reference remains).
 */
export async function storeReferencePhoto(
  sessionId: string,
  image: { data: string; mimeType: string }
): Promise<string | undefined> {
  const extension = EXTENSION_BY_MIME[image.mimeType.toLowerCase()] ?? 'png';
  const path = `design-sessions/${sessionId}/references/${randomUUID()}.${extension}`;
  try {
    await uploadToGCS(Buffer.from(image.data, 'base64'), path, {
      contentType: image.mimeType,
      public: false,
    });
    return path;
  } catch (error) {
    logger.warn({
      event_type: 'design_session.reference_photo_store_failed',
      session_id: sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}

/**
 * Mint fetchable signed URLs for stored reference photos, in order.
 * Throws on a signing failure — see the module doc for why loud is right
 * here and fail-soft is right at upload.
 */
export async function signedReferenceUrls(paths: string[]): Promise<string[]> {
  return Promise.all(paths.map((path) => getSignedUrl(path, REFERENCE_URL_TTL_SECONDS)));
}
