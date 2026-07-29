/**
 * Outbound sender credential and sender-selection behavior. Separate file
 * from twilio.test.ts because this one mocks the twilio SDK wholesale
 * (capturing constructor args and create payloads), while the signature
 * tests need the real SDK's HMAC.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sendSms, sendMms } from './twilio';

const created: Array<Record<string, unknown>> = [];
const constructorArgs: unknown[][] = [];

vi.mock('twilio', () => ({
  default: (...args: unknown[]) => {
    constructorArgs.push(args);
    return {
      messages: {
        create: async (payload: Record<string, unknown>) => {
          created.push(payload);
          return { sid: 'SM_test' };
        },
      },
    };
  },
}));

beforeEach(() => {
  created.length = 0;
  constructorArgs.length = 0;
  vi.stubEnv('TWILIO_ACCOUNT_SID', 'ACtest');
  vi.stubEnv('TWILIO_AUTH_TOKEN', 'auth-token');
  vi.stubEnv('TWILIO_PHONE_NUMBER', '+15550001111');
  vi.stubEnv('TWILIO_API_KEY_SID', '');
  vi.stubEnv('TWILIO_API_KEY_SECRET', '');
  vi.stubEnv('TWILIO_MESSAGING_SERVICE_SID', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('outbound credentials', () => {
  it('falls back to account SID + auth token when no API key is set', async () => {
    await sendSms('+15551234567', 'hi');
    expect(constructorArgs[0]).toEqual(['ACtest', 'auth-token']);
  });

  it('prefers an API key pair when both halves are present', async () => {
    vi.stubEnv('TWILIO_API_KEY_SID', 'SKtest');
    vi.stubEnv('TWILIO_API_KEY_SECRET', 'sk-secret');
    await sendSms('+15551234567', 'hi');
    expect(constructorArgs[0]).toEqual(['SKtest', 'sk-secret', { accountSid: 'ACtest' }]);
  });

  it('ignores a half-configured API key pair', async () => {
    vi.stubEnv('TWILIO_API_KEY_SID', 'SKtest'); // secret missing
    await sendSms('+15551234567', 'hi');
    expect(constructorArgs[0]).toEqual(['ACtest', 'auth-token']);
  });
});

describe('sender selection', () => {
  it('sends from the phone number by default', async () => {
    await sendSms('+15551234567', 'hi');
    expect(created[0]).toMatchObject({ to: '+15551234567', from: '+15550001111', body: 'hi' });
    expect(created[0]).not.toHaveProperty('messagingServiceSid');
  });

  it('sends via the Messaging Service when its SID is configured', async () => {
    vi.stubEnv('TWILIO_MESSAGING_SERVICE_SID', 'MGtest');
    await sendSms('+15551234567', 'hi');
    expect(created[0]).toMatchObject({ to: '+15551234567', messagingServiceSid: 'MGtest' });
    expect(created[0]).not.toHaveProperty('from');
  });

  it('a Messaging Service alone satisfies the sender requirement', async () => {
    vi.stubEnv('TWILIO_PHONE_NUMBER', '');
    vi.stubEnv('TWILIO_MESSAGING_SERVICE_SID', 'MGtest');
    const result = await sendSms('+15551234567', 'hi');
    expect(result.ok).toBe(true);
  });

  it('attaches media URLs on MMS', async () => {
    const result = await sendMms('+15551234567', 'Cut 1 of 4', ['https://img/1.png']);
    expect(result).toEqual({ ok: true, sid: 'SM_test' });
    expect(created[0]).toMatchObject({ mediaUrl: ['https://img/1.png'] });
  });
});
