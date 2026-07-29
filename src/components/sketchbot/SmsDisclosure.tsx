import Link from 'next/link';

/**
 * Carrier-required SMS disclosure (TAT-49). This language sits next to every
 * published mention of the SketchBot number — the A2P 10DLC registration
 * tells carriers it appears on tatttester.com, and reviewers verify that.
 * Do not reword it without re-checking the registration.
 *
 * Register (ADR-0035): quiet small print, even on loud surfaces —
 * compliance copy never shouts.
 */
export default function SmsDisclosure({ className = '' }: { className?: string }) {
  return (
    <p className={`font-body text-[11px] leading-[1.6] text-white/40 ${className}`}>
      By texting SketchBot you agree to receive conversational replies. Msg &amp; data
      rates may apply. Message frequency varies. Reply STOP to opt out, HELP for help.
      See our{' '}
      <Link
        href="/legal/privacy"
        className="underline underline-offset-2 hover:text-white/70"
      >
        Privacy Policy
      </Link>{' '}
      and{' '}
      <Link
        href="/legal/terms"
        className="underline underline-offset-2 hover:text-white/70"
      >
        Terms
      </Link>
      .
    </p>
  );
}
