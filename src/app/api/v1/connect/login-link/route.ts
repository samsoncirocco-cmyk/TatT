/**
 * Generate a one-time Express dashboard login link for an artist.
 *
 * Artists on the Express dashboard reach their payouts/balance via a login link
 * minted here (they don't have a Stripe password). The URL is single-use and
 * short-lived — never cache or persist it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { stripe, stripeConfigured, STRIPE_NOT_CONFIGURED } from '@/lib/stripe';
import { getArtistStripe } from '@/lib/artist-stripe';

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
  try {
    ({ artistId } = (await req.json()) as { artistId?: string });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!artistId) {
    return NextResponse.json({ error: 'artistId is required.' }, { status: 400 });
  }

  const artist = await getArtistStripe(artistId);
  if (!artist?.stripeAccountId) {
    return NextResponse.json({ error: 'Artist has no connected account.' }, { status: 409 });
  }

  // A login link drops straight into the artist's Express dashboard (balance,
  // payouts, bank details) — only the artist who claimed this profile may mint one.
  if (artist.claimedByUid !== user.uid) {
    return NextResponse.json(
      { error: 'This profile has not been claimed by your account.', code: 'NOT_OWNER' },
      { status: 403 }
    );
  }
  if (!artist.claimVerified) {
    return NextResponse.json(
      { error: 'Identity review must finish before payout access.', code: 'CLAIM_NOT_VERIFIED' },
      { status: 403 },
    );
  }

  try {
    const link = await stripe.accounts.createLoginLink(artist.stripeAccountId);
    return NextResponse.json({ url: link.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login link creation failed.';
    console.error('[Connect] login link failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
