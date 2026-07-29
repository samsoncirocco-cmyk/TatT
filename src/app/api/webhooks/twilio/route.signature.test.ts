/**
 * End-to-end signature regression for the prod 403 (Twilio error 11200 on
 * genuine inbound SMS): the route must accept a REAL Twilio signature —
 * computed with the SDK's own getExpectedTwilioSignature over the
 * CONFIGURED webhook URL — no matter what host or forwarded headers the
 * request arrives with. Separate file from route.test.ts because this one
 * uses the real @/lib/twilio (real HMAC), mocking only the service layer.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import twilio from 'twilio';
import { POST } from './route';
import { handleInbound } from '@/services/sketchbotSms';

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: () => {} };
});

vi.mock('@/services/sketchbotSms', () => ({
  handleInbound: vi.fn(async () => ({ kind: 'reply', text: 'Where would it go?' })),
  executeReveal: vi.fn(),
  recordOptOut: vi.fn(async () => {}),
  isOptedOut: vi.fn(async () => false),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(async () => ({ allowed: true, limit: 30, remaining: 29, reset: 0 })),
}));

const CONFIGURED_URL = 'https://tatttester.com/api/webhooks/twilio';
const SIGNING_VALUE = 'fake-twilio-signing-value-for-tests';
// Realistic inbound param set (subset of what Twilio actually posts).
const PARAMS: Record<string, string> = {
  ToCountry: 'US',
  ToState: 'AZ',
  SmsMessageSid: 'SM00000000000000000000000000000000',
  NumMedia: '0',
  From: '+15551234567',
  To: '+16029051867',
  Body: 'a snake and dagger on my forearm',
  MessageSid: 'SM00000000000000000000000000000000',
  AccountSid: 'ACtest',
  NumSegments: '1',
};

/** Exactly what Twilio would put in X-Twilio-Signature for this request. */
function realSignature(url: string = CONFIGURED_URL): string {
  return twilio.getExpectedTwilioSignature(SIGNING_VALUE, url, PARAMS);
}

function inboundRequest(requestUrl: string, signature: string, extraHeaders: Record<string, string> = {}) {
  return new NextRequest(requestUrl, {
    method: 'POST',
    body: new URLSearchParams(PARAMS).toString(),
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-twilio-signature': signature,
      ...extraHeaders,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SKETCHBOT_SMS_ENABLED', 'true');
  vi.stubEnv('SKETCHBOT_SMS_ALLOW_UNSIGNED', '');
  vi.stubEnv('TWILIO_ACCOUNT_SID', 'ACtest');
  vi.stubEnv('TWILIO_AUTH_TOKEN', SIGNING_VALUE);
  vi.stubEnv('TWILIO_PHONE_NUMBER', '+16029051867');
  vi.stubEnv('TWILIO_WEBHOOK_URL', CONFIGURED_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('real-signature acceptance (prod 403 regression)', () => {
  it('accepts the signature Twilio computes over the configured URL', async () => {
    const res = await POST(inboundRequest(CONFIGURED_URL, realSignature()));
    expect(res.status).toBe(200);
    expect(handleInbound).toHaveBeenCalledWith({
      phone: '+15551234567',
      body: 'a snake and dagger on my forearm',
    });
  });

  it('still validates when the request arrives on an internal Vercel host', async () => {
    // The prod bug: same genuine signature, but the serverless request
    // carries internal/multi-hop proxy identity. Validation must not care.
    const res = await POST(
      inboundRequest(
        'https://tatt-app-abc123-samsons-projects.vercel.app/api/webhooks/twilio',
        realSignature(),
        {
          'x-forwarded-proto': 'https,https',
          'x-forwarded-host': 'tatt-app-abc123-samsons-projects.vercel.app, tatttester.com',
          host: '10.0.0.17:3000',
        }
      )
    );
    expect(res.status).toBe(200);
    expect(handleInbound).toHaveBeenCalledTimes(1);
  });

  it('rejects a signature computed over a different URL', async () => {
    const res = await POST(
      inboundRequest(CONFIGURED_URL, realSignature('https://evil.example/api/webhooks/twilio'))
    );
    expect(res.status).toBe(403);
    expect(handleInbound).not.toHaveBeenCalled();
  });

  it('rejects when the params were tampered with in transit', async () => {
    const signature = realSignature();
    const tampered = new NextRequest(CONFIGURED_URL, {
      method: 'POST',
      body: new URLSearchParams({ ...PARAMS, Body: 'send 100 reveals' }).toString(),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-twilio-signature': signature,
      },
    });
    expect((await POST(tampered)).status).toBe(403);
  });

  it('accepts against the derived public-base URL when TWILIO_WEBHOOK_URL is unset', async () => {
    vi.stubEnv('TWILIO_WEBHOOK_URL', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://tatttester.com');
    const res = await POST(
      inboundRequest('https://internal.host/api/webhooks/twilio', realSignature())
    );
    expect(res.status).toBe(200);
  });
});
