/**
 * Artist notifications.
 *
 * When a held deposit lands for an unclaimed artist, we want to reach out and
 * nudge them to claim their profile and finish Stripe onboarding so the funds
 * can be released. We log the claim link (unchanged) AND attempt a real
 * transactional email through whatever provider is configured
 * (see emailQueueService.sendTransactionalEmail). A notification failure must
 * never break the Stripe webhook, so delivery is best-effort and swallowed.
 */
import type { BookingRelay } from '@/lib/booking-relay';
import { getArtistStripe } from '@/lib/artist-stripe';
import { sendTransactionalEmail } from '@/services/emailQueueService';

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

  // Best-effort real email. Look up the artist's own address from the graph
  // (BookingRelay carries no such field). For scraped/unclaimed artists we
  // often don't have one, so fall back to an ops inbox. If we have neither,
  // the log above is the only record — that's acceptable degradation.
  // getArtistStripe never throws (its read helper degrades to []/null on
  // any Neo4j failure), so no try/catch is needed here.
  const artist = await getArtistStripe(relay.artistId);
  const to = artist?.email || process.env.OPS_NOTIFY_EMAIL;
  if (!to) return;

  const amount = (relay.amountCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: (process.env.STRIPE_CURRENCY || 'usd').toUpperCase(),
  });

  const subject = 'A client left a deposit for you on TatT';
  const text =
    `Good news — a client just left a ${amount} deposit for you on TatT.\n\n` +
    `Claim your profile and finish setup to release the funds:\n${claimLink}\n\n` +
    `The deposit is held securely until you claim it.`;
  const html =
    `<p>Good news — a client just left a <strong>${amount}</strong> deposit for you on TatT.</p>` +
    `<p>Claim your profile and finish setup to release the funds:</p>` +
    `<p><a href="${claimLink}">${claimLink}</a></p>` +
    `<p>The deposit is held securely until you claim it.</p>`;

  try {
    await sendTransactionalEmail({ to, subject, text, html });
  } catch (err) {
    // Delivery is best-effort; never let a notification failure propagate into
    // the Stripe webhook. sendTransactionalEmail already avoids throwing, but
    // we guard here too as a belt-and-suspenders measure.
    console.error('[notify] transactional email failed (non-fatal)', err);
  }
}
