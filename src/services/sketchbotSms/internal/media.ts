/**
 * Inbound MMS media (TAT-50): parse Twilio's NumMedia / MediaUrl{N} /
 * MediaContentType{N} form fields, fetch the bytes server-side, and run
 * them through the shared vision analyzer.
 *
 * Twilio media URLs are public by default but require HTTP basic auth with
 * the account credentials when the account's media-privacy setting is on —
 * so credentials are always presented when configured. The URL 302s to an
 * S3-backed location; undici follows the redirect and (correctly) strips
 * the Authorization header on the cross-origin hop, so authenticated and
 * public configurations both land on the same code path.
 *
 * Caps (REQUIRED guardrails): images only (ANALYZABLE_IMAGE_TYPES — GIF is
 * fine, Gemini reads the first frame), at most
 * MAX_REFERENCE_IMAGES_PER_MESSAGE analyzed per message (the rest are
 * politely acknowledged, never silently dropped), and
 * MAX_REFERENCE_IMAGE_BYTES per image. Every analysis is budget-gated
 * inside the vision service itself.
 */
import { logger } from '@/lib/logger';
import {
  analyzeReferenceImage,
  ANALYZABLE_IMAGE_TYPES,
  MAX_REFERENCE_IMAGE_BYTES,
  MAX_REFERENCE_IMAGES_PER_MESSAGE,
  type ReferenceAnalysis,
  type ReferenceImage,
} from '@/services/vision';
import type { InboundMediaItem } from '../types';

/** Twilio caps MMS at 10 attachments; a bad NumMedia never loops further. */
const TWILIO_MAX_ATTACHMENTS = 10;

/** Parse the webhook's media fields into an ordered list. */
export function parseInboundMedia(params: Record<string, string>): InboundMediaItem[] {
  const declared = Number(params.NumMedia);
  if (!Number.isFinite(declared) || declared <= 0) return [];
  const count = Math.min(declared, TWILIO_MAX_ATTACHMENTS);

  const media: InboundMediaItem[] = [];
  for (let i = 0; i < count; i += 1) {
    const url = (params[`MediaUrl${i}`] ?? '').trim();
    if (!url) continue;
    media.push({
      url,
      contentType: (params[`MediaContentType${i}`] ?? '').trim().toLowerCase(),
    });
  }
  return media;
}

/** Normalize a Content-Type header to its bare MIME type. */
function bareMimeType(contentType: string): string {
  return contentType.split(';')[0].trim().toLowerCase();
}

/**
 * Fetch one media item from Twilio. Returns null (never throws) on
 * anything unusable: non-image type, over-size, HTTP failure.
 */
export async function fetchTwilioMedia(item: InboundMediaItem): Promise<ReferenceImage | null> {
  const declaredType = bareMimeType(item.contentType);
  // Non-image attachments (vCards, audio, video) are skipped outright —
  // no fetch, no spend.
  if (declaredType && !ANALYZABLE_IMAGE_TYPES.has(declaredType)) return null;

  try {
    const sid = process.env.TWILIO_ACCOUNT_SID || '';
    const token = process.env.TWILIO_AUTH_TOKEN || '';
    const headers: Record<string, string> = {};
    if (sid && token) {
      headers.Authorization = `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`;
    }

    const response = await fetch(item.url, { headers });
    if (!response.ok) {
      logger.warn({
        event_type: 'sketchbot_sms.media_fetch_failed',
        status: response.status,
      });
      return null;
    }

    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REFERENCE_IMAGE_BYTES) {
      logger.warn({
        event_type: 'sketchbot_sms.media_too_large',
        bytes: declaredLength,
      });
      return null;
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_REFERENCE_IMAGE_BYTES) {
      logger.warn({
        event_type: 'sketchbot_sms.media_too_large',
        bytes: bytes.byteLength,
      });
      return null;
    }

    // Trust the response's type when it says image (the S3 hop is
    // authoritative), fall back to the webhook's declared type.
    const responseType = bareMimeType(response.headers.get('content-type') ?? '');
    const mimeType = ANALYZABLE_IMAGE_TYPES.has(responseType) ? responseType : declaredType;
    if (!ANALYZABLE_IMAGE_TYPES.has(mimeType)) return null;

    return { data: bytes.toString('base64'), mimeType };
  } catch (error) {
    logger.warn({
      event_type: 'sketchbot_sms.media_fetch_failed',
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** What one message's media boiled down to, ready for the adapter's reply. */
export interface MediaIngest {
  analyses: ReferenceAnalysis[];
  /** Items that could not be fetched or read. */
  unreadable: number;
  /** Items beyond the per-message analysis cap. */
  ignored: number;
  /** The vision budget gate refused — the honest capacity line applies. */
  budgetExhausted: boolean;
}

/**
 * Fetch + analyze a message's media, first MAX_REFERENCE_IMAGES_PER_MESSAGE
 * items only. Budget exhaustion stops the batch — one honest sentence, not
 * three failed attempts.
 */
export async function analyzeInboundMedia(media: InboundMediaItem[]): Promise<MediaIngest> {
  const ingest: MediaIngest = {
    analyses: [],
    unreadable: 0,
    ignored: Math.max(0, media.length - MAX_REFERENCE_IMAGES_PER_MESSAGE),
    budgetExhausted: false,
  };

  for (const item of media.slice(0, MAX_REFERENCE_IMAGES_PER_MESSAGE)) {
    const image = await fetchTwilioMedia(item);
    if (!image) {
      ingest.unreadable += 1;
      continue;
    }
    const outcome = await analyzeReferenceImage(image);
    if (outcome.status === 'budget_exhausted') {
      ingest.budgetExhausted = true;
      break;
    }
    if (outcome.status === 'failed') {
      ingest.unreadable += 1;
      continue;
    }
    ingest.analyses.push(outcome.analysis);
  }

  return ingest;
}
