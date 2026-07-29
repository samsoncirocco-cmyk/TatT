/**
 * src/lib/twilio.ts — config gates, signature validation, sender fail-safety.
 * No live Twilio calls anywhere: validation runs the SDK's real HMAC against
 * signatures we compute locally with the same SDK, and the only send
 * exercised is the unconfigured refusal (which never reaches the network).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import twilio from 'twilio';
import {
  twilioConfigured,
  sketchbotSmsEnabled,
  validateTwilioSignature,
  sendSms,
} from './twilio';

const URL_UNDER_TEST = 'https://tatttester.com/api/webhooks/twilio';
const PARAMS = { From: '+15551234567', Body: 'a snake wrapped around a dagger' };
const AUTH_TOKEN = 'test-auth-token-not-real';

beforeEach(() => {
  vi.stubEnv('TWILIO_ACCOUNT_SID', 'ACtest');
  vi.stubEnv('TWILIO_AUTH_TOKEN', AUTH_TOKEN);
  vi.stubEnv('TWILIO_PHONE_NUMBER', '+15550001111');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('twilioConfigured', () => {
  it('is true with a full set of real-looking credentials', () => {
    expect(twilioConfigured()).toBe(true);
  });

  it('fails closed when any credential is missing', () => {
    vi.stubEnv('TWILIO_AUTH_TOKEN', '');
    expect(twilioConfigured()).toBe(false);
  });

  it('treats placeholder sentinels as unconfigured', () => {
    vi.stubEnv('TWILIO_AUTH_TOKEN', 'PLACEHOLDER_token');
    expect(twilioConfigured()).toBe(false);
  });
});

describe('sketchbotSmsEnabled', () => {
  it('defaults to false — the channel ships dark', () => {
    vi.stubEnv('SKETCHBOT_SMS_ENABLED', '');
    expect(sketchbotSmsEnabled()).toBe(false);
  });

  it('is on only with the exact string "true"', () => {
    vi.stubEnv('SKETCHBOT_SMS_ENABLED', 'true');
    expect(sketchbotSmsEnabled()).toBe(true);
    vi.stubEnv('SKETCHBOT_SMS_ENABLED', '1');
    expect(sketchbotSmsEnabled()).toBe(false);
  });
});

describe('validateTwilioSignature', () => {
  const validSignature = () =>
    twilio.getExpectedTwilioSignature(AUTH_TOKEN, URL_UNDER_TEST, PARAMS);

  it('accepts the signature Twilio would send for these params', () => {
    expect(validateTwilioSignature(validSignature(), URL_UNDER_TEST, PARAMS)).toBe(true);
  });

  it('rejects a missing signature', () => {
    expect(validateTwilioSignature(null, URL_UNDER_TEST, PARAMS)).toBe(false);
  });

  it('rejects a wrong signature', () => {
    expect(validateTwilioSignature('bogus', URL_UNDER_TEST, PARAMS)).toBe(false);
  });

  it('rejects when the params were tampered with', () => {
    const signature = validSignature();
    expect(
      validateTwilioSignature(signature, URL_UNDER_TEST, {
        ...PARAMS,
        Body: 'tampered',
      })
    ).toBe(false);
  });

  it('rejects when the URL differs from the signed one', () => {
    const signature = validSignature();
    expect(
      validateTwilioSignature(signature, 'https://evil.example/api/webhooks/twilio', PARAMS)
    ).toBe(false);
  });

  it('fails closed with no auth token configured', () => {
    const signature = validSignature();
    vi.stubEnv('TWILIO_AUTH_TOKEN', '');
    expect(validateTwilioSignature(signature, URL_UNDER_TEST, PARAMS)).toBe(false);
  });
});

describe('sendSms', () => {
  it('refuses without touching the network when unconfigured', async () => {
    vi.stubEnv('TWILIO_AUTH_TOKEN', '');
    const result = await sendSms('+15551234567', 'hello');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('not_configured');
  });
});
