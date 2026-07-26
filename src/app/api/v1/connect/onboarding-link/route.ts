/**
 * Mint a Stripe-HOSTED onboarding link (Account Link) for an artist.
 *
 * This is the step that was missing: TatT created connected accounts but never
 * gave the artist anywhere to complete KYC, so `charges_enabled` stayed false,
 * `transferHeldDeposits` refused, and every held deposit auto-refunded when the
 * hold window lapsed. Stripe hosts and maintains the form; we only supply where
 * to come back to.
 *
 * `collection_options.fields = 'eventually_due'` asks for everything up front
 * rather than the bare minimum, so the artist isn't bounced back into KYC later
 * while a client's deposit is sitting on the clock.
 *
 * Account Links are single-use and short-lived — never cache or persist the URL.
 *   return_url  → artist finished (or thinks they did); the claim page re-checks
 *                 the live account rather than assuming success.
 *   refresh_url → the link expired or was already used; the claim page offers a
 *                 fresh one instead of auto-redirecting (no redirect loop).
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { stripe, stripeConfigured, STRIPE_NOT_CONFIGURED } from '@/lib/stripe';
import { getBaseUrl, requireOwnedArtist } from '../shared';

export const runtime = 'nodejs';

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
    return NextResponse.json(
      { error: 'Artist has no connected account yet. Create one via /api/v1/connect/accounts first.' },
      { status: 409 }
    );
  }

  const baseUrl = getBaseUrl(req);
  const claimUrl = `${baseUrl}/claim/${encodeURIComponent(artistId)}`;

  try {
    const link = await stripe.accountLinks.create({
      account: artist.stripeAccountId,
      type: 'account_onboarding',
      refresh_url: `${claimUrl}?onboarding=refresh`,
      return_url: `${claimUrl}?onboarding=return`,
      collection_options: { fields: 'eventually_due' },
    });

    return NextResponse.json({ url: link.url, expiresAt: link.expires_at });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onboarding link creation failed.';
    console.error('[Connect] account link failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
