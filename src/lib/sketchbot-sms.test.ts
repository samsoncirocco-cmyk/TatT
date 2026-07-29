import { describe, it, expect, afterEach, vi } from 'vitest';
import { formatSmsNumberForDisplay, getSketchBotSmsContact } from './sketchbot-sms';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('formatSmsNumberForDisplay', () => {
  it('formats a +1 E.164 number as (AAA) BBB-CCCC', () => {
    expect(formatSmsNumberForDisplay('+16029051867')).toBe('(602) 905-1867');
  });

  it('returns anything non-US unchanged rather than mangling it', () => {
    expect(formatSmsNumberForDisplay('+447700900123')).toBe('+447700900123');
    expect(formatSmsNumberForDisplay('not-a-number')).toBe('not-a-number');
  });
});

describe('getSketchBotSmsContact', () => {
  it('is null when NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER is unset (the gate)', () => {
    vi.stubEnv('NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER', '');
    expect(getSketchBotSmsContact()).toBeNull();
  });

  it('is null when the value is not a usable US number (fail closed)', () => {
    vi.stubEnv('NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER', 'soon');
    expect(getSketchBotSmsContact()).toBeNull();
  });

  it('builds e164, display, and sms: href from an E.164 value', () => {
    vi.stubEnv('NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER', '+16029051867');
    expect(getSketchBotSmsContact()).toEqual({
      e164: '+16029051867',
      display: '(602) 905-1867',
      href: 'sms:+16029051867',
    });
  });

  it('normalizes human-formatted and 10-digit values', () => {
    vi.stubEnv('NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER', '(602) 905-1867');
    expect(getSketchBotSmsContact()?.e164).toBe('+16029051867');

    vi.stubEnv('NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER', '6029051867');
    expect(getSketchBotSmsContact()?.href).toBe('sms:+16029051867');
  });
});
