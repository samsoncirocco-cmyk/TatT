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
import type { TakedownRequest } from '@/lib/takedown';
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

/** Outcome of a notification that the caller is expected to act on. */
export type NotifyResult = { delivered: true } | { delivered: false; reason: string };

/**
 * Tell a human that an artist has asked to be removed. See docs/adr/0025.
 *
 * Unlike notifyArtistOfBooking, this is NOT best-effort and does NOT swallow.
 * A booking notification can fail quietly because the money still moved and the
 * record still exists. A takedown notification failing quietly means nobody
 * learns that an artist asked us to stop using their photographs, while the
 * artist is shown a confirmation. That is worse than having no takedown button
 * at all, so the caller gets the truth and surfaces it.
 *
 * Never throws — a thrown provider error is reported as an undelivered result.
 */
export async function notifyOpsOfTakedownRequest(
  request: TakedownRequest,
  requestId: string,
): Promise<NotifyResult> {
  const to = process.env.OPS_NOTIFY_EMAIL;
  if (!to) {
    const reason =
      'OPS_NOTIFY_EMAIL is not configured — a takedown request would reach nobody.';
    console.error(`[notify] takedown request ${requestId} undeliverable: ${reason}`);
    return { delivered: false, reason };
  }

  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const scopeLine =
    request.scope === 'images'
      ? 'IMAGES ONLY — remove the re-hosted photos, keep the listing.'
      : 'ALL — remove the photos and suppress the profile.';

  const subject = `[Takedown] ${request.artistId} — artist requested removal`;
  const text =
    `A takedown request was submitted.\n\n` +
    `Request id:   ${requestId}\n` +
    `Artist id:    ${request.artistId}\n` +
    `Profile:      ${base}/artists\n` +
    `Contact:      ${request.contactEmail}\n` +
    `Relationship: ${request.relationship} (self-declared — NOT verified)\n` +
    `Scope:        ${scopeLine}\n\n` +
    `Message:\n${request.message || '(none provided)'}\n\n` +
    `--- Before you remove anything ---\n` +
    `Nothing has been removed. This request changed no data.\n` +
    `Verify the requester controls the artist's Instagram handle (ask them to post\n` +
    `a one-time code, or message you from it). The handle is the identity anchor\n` +
    `for this dataset — see docs/adr/0025 for what that does and does not prove.\n\n` +
    `--- Dry run (reports what WOULD be removed, changes nothing) ---\n` +
    `node scripts/execute-takedown.mjs --artist-id ${request.artistId}\n\n` +
    `--- Execute for real (only after verification) ---\n` +
    `node scripts/execute-takedown.mjs --artist-id ${request.artistId} ` +
    `--scope ${request.scope} --execute --confirm ${request.artistId}\n`;

  try {
    const result = await sendTransactionalEmail({
      to,
      subject,
      text,
      // So an ops reply lands with the person who asked, not in a void.
      replyTo: request.contactEmail,
    });
    if (!result?.sent) {
      const reason = result?.reason || 'email provider reported the send as unsent';
      console.error(`[notify] takedown request ${requestId} not delivered: ${reason}`);
      return { delivered: false, reason };
    }
    console.log(`[notify] takedown request ${requestId} delivered to ops`, {
      artistId: request.artistId,
      scope: request.scope,
    });
    return { delivered: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[notify] takedown request ${requestId} threw during send: ${reason}`);
    return { delivered: false, reason };
  }
}
