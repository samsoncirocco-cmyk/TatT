/**
 * Live onboarding status for an artist's connected account — and the release
 * that depends on it.
 *
 * The claim page calls this on load and again when Stripe redirects the artist
 * back. It reads the account STRAIGHT FROM STRIPE rather than trusting the
 * cached `stripeChargesEnabled` flag or assuming the return redirect means
 * success: an artist can abandon the form halfway, or land in
 * pending_verification, and must be told so.
 *
 * Two side effects, both idempotent:
 *  1. Re-sync `stripeChargesEnabled` onto the Artist node, so the cached gate
 *     the checkout path reads is corrected even if the `account.updated`
 *     webhook is delayed or (in a fresh environment) not wired up at all.
 *  2. When charges are enabled, flush held deposits. This duplicates what the
 *     webhook does on purpose — the money release should not have a single
 *     point of failure, and `transferHeldDeposits` only ever touches pending
 *     relays with a per-relay idempotency key, so running both is safe.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { stripe, stripeConfigured, STRIPE_NOT_CONFIGURED } from '@/lib/stripe';
import { setArtistChargesEnabled } from '@/lib/artist-stripe';
import { listPendingByArtist, transferHeldDeposits } from '@/lib/booking-relay';
import { deriveOnboardingStatus, noAccountStatus } from '@/lib/connect-status';
import { requireOwnedArtist } from '../shared';

export const runtime = 'nodejs';

async function pendingSummary(artistId: string) {
  const pending = await listPendingByArtist(artistId);
  return {
    count: pending.length,
    amountCents: pending.reduce((sum, p) => sum + p.amountCents, 0),
  };
}

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  if (!stripeConfigured) {
    return NextResponse.json(STRIPE_NOT_CONFIGURED, { status: 503 });
  }

  let artistId: string | undefined;
  try {
    ({ artistId } = (await req.json()) as { artistId?: string });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!artistId) {
    return NextResponse.json({ error: 'artistId is required.' }, { status: 400 });
  }

  const owned = await requireOwnedArtist(req, artistId);
  if ('response' in owned) return owned.response;
  const { artist } = owned;

  if (!artist.stripeAccountId) {
    return NextResponse.json({
      ...noAccountStatus(),
      artistName: artist.name,
      heldDeposit: await pendingSummary(artistId),
      released: { count: 0, amountCents: 0 },
    });
  }

  let status;
  try {
    const account = await stripe.accounts.retrieve(artist.stripeAccountId);
    status = deriveOnboardingStatus(account, artist.stripeAccountId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not read the connected account.';
    console.error('[Connect] account retrieve failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Correct the cached gate first — transferHeldDeposits reads it back.
  try {
    await setArtistChargesEnabled(artist.stripeAccountId, status.chargesEnabled);
  } catch (err) {
    console.error('[Connect] could not cache chargesEnabled (best-effort):', err);
  }

  let released = { count: 0, amountCents: 0 };
  if (status.chargesEnabled) {
    try {
      const result = await transferHeldDeposits(artistId);
      released = { count: result.count, amountCents: result.totalTransferredCents };
      if (result.count > 0) {
        console.log('[Connect] released held deposits on status check', { artistId, ...result });
      }
    } catch (err) {
      // A failed transfer must not blank out the artist's status page; the
      // webhook and the daily cron both still have a shot at this relay.
      console.error('[Connect] transferHeldDeposits failed (best-effort):', err);
    }
  }

  return NextResponse.json({
    ...status,
    artistName: artist.name,
    heldDeposit: await pendingSummary(artistId),
    released,
  });
}
