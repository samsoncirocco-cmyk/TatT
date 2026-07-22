/**
 * Artist notifications.
 *
 * Interface-only stub for now: when a held deposit lands for an unclaimed
 * artist, we want to reach out and nudge them to claim their profile and
 * finish Stripe onboarding so the funds can be released. Real email/SMS
 * delivery lands later — for now we log the claim link.
 */
import type { BookingRelay } from '@/lib/booking-relay';

/** Notify an artist that a deposit is being held for them, with a claim link. */
export async function notifyArtistOfBooking(relay: BookingRelay): Promise<void> {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const claimLink = `${base}/claim/${relay.artistId}`;
  console.log('[notify] held deposit awaiting claim', {
    relayId: relay.id,
    artistId: relay.artistId,
    customerEmail: relay.customerEmail,
    amountCents: relay.amountCents,
    claimLink,
  });
}
