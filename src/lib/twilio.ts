/**
 * Shared Twilio config + outbound sender (TAT-49, SketchBot SMS).
 *
 * Mirrors src/lib/stripe.ts: one server-side module owns the credentials,
 * the configured/fail-closed gates, and the SDK calls, so routes never
 * hand-roll fetch/HMAC. Signature validation uses the official SDK's
 * `validateRequest` — the same discipline as the Stripe webhook's
 * `stripe.webhooks.constructEvent` (never a hand-rolled HMAC).
 *
 * Never import this in client components — it reads TWILIO_AUTH_TOKEN.
 */
import twilio from 'twilio';
import { logger } from './logger';

// Env read per call, never captured at module load — the webhook is a
// serverless entry point and tests stub these per case.
/**
 * Usable credentials only: present and not the repo's placeholder sentinels.
 * Routes gate on this so a misconfigured deploy fails closed (503) instead
 * of accepting unverifiable webhooks or throwing at import time.
 *
 * TWILIO_AUTH_TOKEN is required unconditionally — inbound signature
 * validation is HMAC-SHA1 keyed on the AUTH TOKEN specifically (per
 * twilio.com/docs/usage/security), an API key secret cannot substitute.
 * The sender is either a phone number or a Messaging Service.
 */
export function twilioConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID || '';
  const token = process.env.TWILIO_AUTH_TOKEN || '';
  const sender =
    process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_PHONE_NUMBER || '';
  return (
    !!sid &&
    !!token &&
    !!sender &&
    !sid.includes('PLACEHOLDER') &&
    !token.includes('PLACEHOLDER')
  );
}

/** The whole SMS channel ships dark: SKETCHBOT_SMS_ENABLED defaults to false. */
export function sketchbotSmsEnabled(): boolean {
  return process.env.SKETCHBOT_SMS_ENABLED === 'true';
}

/** Standard "not configured" body for the webhook when Twilio is off. */
export const TWILIO_NOT_CONFIGURED = {
  error: 'SMS is not configured.',
  code: 'TWILIO_NOT_CONFIGURED',
} as const;

/**
 * Verify X-Twilio-Signature against the auth token, the exact public URL
 * Twilio requested, and the POST params. Fail closed: any missing piece is
 * an invalid signature, never a pass.
 */
export function validateTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN || '';
  if (!signature || !token || !url) return false;
  try {
    return twilio.validateRequest(token, signature, url, params);
  } catch {
    return false;
  }
}

export interface SendMessageResult {
  ok: boolean;
  sid?: string;
  error?: string;
}

/**
 * Lazily-created SDK client — constructed per send, only after the
 * configured gate passed, so module-load never throws on a creds-less dev
 * machine (same reason stripe.ts constructs with a placeholder key).
 *
 * Outbound auth prefers a standard API key pair
 * (TWILIO_API_KEY_SID/TWILIO_API_KEY_SECRET — revocable, least-privilege)
 * when both are set, falling back to the account auth token. Inbound
 * signature validation always uses the auth token regardless (see above).
 */
function twilioClient() {
  const apiKeySid = process.env.TWILIO_API_KEY_SID || '';
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET || '';
  if (apiKeySid && apiKeySecret) {
    return twilio(apiKeySid, apiKeySecret, {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
    });
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * Send one outbound SMS (or MMS when mediaUrls are given — each must be a
 * publicly fetchable URL at send time; Twilio fetches then re-hosts on its
 * CDN, so time-limited signed GCS URLs are fine).
 *
 * Never throws: an SMS the channel failed to send is logged and reported in
 * the result, and the caller decides what recovery (if any) makes sense.
 * Twilio itself refuses sends to opted-out numbers (error 21610) — that
 * refusal is honored, logged, and never retried.
 */
export async function sendSms(
  to: string,
  body: string,
  mediaUrls?: string[]
): Promise<SendMessageResult> {
  if (!twilioConfigured()) {
    logger.warn({ event_type: 'twilio.send_skipped', reason: 'not_configured' });
    return { ok: false, error: 'not_configured' };
  }
  try {
    const client = twilioClient();
    // A Messaging Service is the cleaner A2P 10DLC integration point (the
    // campaign, sender pool, and Advanced Opt-Out all live on it) — when
    // its SID is configured it replaces `from` and Twilio picks the sender.
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || '';
    const message = await client.messages.create({
      to,
      ...(messagingServiceSid
        ? { messagingServiceSid }
        : { from: process.env.TWILIO_PHONE_NUMBER }),
      body,
      ...(mediaUrls && mediaUrls.length > 0 ? { mediaUrl: mediaUrls } : {}),
    });
    return { ok: true, sid: message.sid };
  } catch (error) {
    const err = error as { code?: number; message?: string };
    logger.warn({
      event_type: 'twilio.send_failed',
      twilio_code: err.code,
      error: err.message || String(error),
      // Last 4 digits only — enough to correlate, never a full number in logs.
      to_last4: to.slice(-4),
    });
    return { ok: false, error: err.message || 'send_failed' };
  }
}

/** MMS convenience wrapper — same semantics as sendSms with media attached. */
export async function sendMms(
  to: string,
  body: string,
  mediaUrls: string[]
): Promise<SendMessageResult> {
  return sendSms(to, body, mediaUrls);
}
