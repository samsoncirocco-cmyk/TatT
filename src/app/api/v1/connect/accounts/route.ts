/**
 * Create (or return the existing) Stripe Connect account for a tattoo artist.
 *
 * Marketplace model (see src/lib/stripe.ts):
 *  - controller.stripe_dashboard.type = 'express'  → artist gets the Express dashboard
 *  - controller.fees.payer            = 'application' → TatT owns pricing
 *  - controller.losses.payments       = 'application' → TatT owns loss liability
 *  - requested capabilities: card_payments + transfers (receive destination charges)
 *
 * We use CONTROLLER PROPERTIES, not the legacy `type: 'express'` param (deprecated).
 * The returned `acct_...` id is persisted on the artist's Neo4j node and is the
 * join key for every future payment routed to this artist.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { stripe, stripeConfigured, STRIPE_NOT_CONFIGURED } from '@/lib/stripe';
import { getArtistStripe, setArtistStripeAccount } from '@/lib/artist-stripe';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  if (!stripeConfigured) {
    return NextResponse.json(STRIPE_NOT_CONFIGURED, { status: 503 });
  }

  const user = await verifyFirebaseToken(req);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  let artistId: string | undefined;
  let email: string | undefined;
  try {
    const body = (await req.json()) as { artistId?: string; email?: string };
    artistId = body.artistId;
    email = body.email;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!artistId) {
    return NextResponse.json({ error: 'artistId is required.' }, { status: 400 });
  }

  const artist = await getArtistStripe(artistId);
  if (!artist) {
    return NextResponse.json({ error: 'Artist not found.' }, { status: 404 });
  }

  // Only the artist who claimed this profile may create its Connect account —
  // otherwise any signed-in user could attach their own contact details to
  // someone else's payout profile.
  if (artist.claimedByUid !== user.uid) {
    return NextResponse.json(
      { error: 'This profile has not been claimed by your account.', code: 'NOT_OWNER' },
      { status: 403 }
    );
  }
  if (!artist.claimVerified) {
    return NextResponse.json(
      { error: 'Identity review must finish before payout setup.', code: 'CLAIM_NOT_VERIFIED' },
      { status: 403 },
    );
  }

  // Idempotent: never create a second account for an artist that already has one.
  if (artist.stripeAccountId) {
    return NextResponse.json({
      accountId: artist.stripeAccountId,
      created: false,
      chargesEnabled: artist.chargesEnabled,
    });
  }

  try {
    const account = await stripe.accounts.create({
      controller: {
        stripe_dashboard: { type: 'express' },
        fees: { payer: 'application' },
        losses: { payments: 'application' },
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      email: email || artist.email || undefined,
      business_profile: { name: artist.name || undefined },
      metadata: { tattArtistId: artistId },
    });

    await setArtistStripeAccount(artistId, account.id);

    return NextResponse.json({ accountId: account.id, created: true, chargesEnabled: false }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe account creation failed.';
    console.error('[Connect] account creation failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
