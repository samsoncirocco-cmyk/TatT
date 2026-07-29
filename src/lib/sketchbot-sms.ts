/**
 * SketchBot's published SMS number (TAT-49).
 *
 * The number is a public marketing surface, not a secret — it renders on the
 * home page and /design, and the A2P 10DLC carrier registration asserts that
 * it is published on tatttester.com. Reading it from
 * NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER keeps those surfaces env-gated: where the
 * var is unset (local dev, environments without the channel) the sections do
 * not render at all, rather than showing a dead number.
 *
 * This module only formats the published number for display. The channel
 * itself — webhook, flags, spend guardrails — lives in src/lib/twilio.ts and
 * docs/sketchbot-sms-setup.md.
 */

export interface SketchBotSmsContact {
  /** E.164 form, e.g. "+16029051867". */
  e164: string;
  /** Human display form, e.g. "(602) 905-1867". */
  display: string;
  /** Anchor target, e.g. "sms:+16029051867". */
  href: string;
}

/**
 * Formats an E.164 US number for display as "(AAA) BBB-CCCC".
 * Anything that is not a +1 eleven-digit number is returned unchanged —
 * better to show a valid number plainly than to mangle it.
 */
export function formatSmsNumberForDisplay(e164: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (!match) return e164;
  return `(${match[1]}) ${match[2]}-${match[3]}`;
}

/**
 * The published SketchBot number, or null when unset/unusable (in which case
 * every SMS mention on the site stays hidden). Read at call time so the
 * env-gating is testable; the literal `process.env.NEXT_PUBLIC_…` access is
 * what Next.js inlines into client bundles.
 */
export function getSketchBotSmsContact(): SketchBotSmsContact | null {
  const raw = process.env.NEXT_PUBLIC_SKETCHBOT_SMS_NUMBER?.trim();
  if (!raw) return null;

  // Normalize whatever shape the env holds ("+16029051867",
  // "(602) 905-1867", "602-905-1867") down to digits.
  const digits = raw.replace(/\D/g, '');
  let e164: string;
  if (digits.length === 11 && digits.startsWith('1')) {
    e164 = `+${digits}`;
  } else if (digits.length === 10) {
    e164 = `+1${digits}`;
  } else {
    // Doesn't look like a US number; fail closed rather than publish junk
    // on a compliance-checked surface.
    return null;
  }

  return {
    e164,
    display: formatSmsNumberForDisplay(e164),
    href: `sms:${e164}`,
  };
}
