/**
 * Release held deposits to an artist who has just finished Stripe onboarding.
 *
 * When a customer books an UNCLAIMED artist, TatT holds the deposit on the
 * platform (see src/lib/booking-relay.ts). Once the artist onboards and their
 * connected account can accept charges, this route flushes every still-pending
 * held deposit to them via separate charges & transfers.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { stripeConfigured, STRIPE_NOT_CONFIGURED } from '@/lib/stripe';
import { getArtistStripe } from '@/lib/artist-stripe';
import { transferHeldDeposits } from '@/lib/booking-relay';

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
  if (!artist) {
    return NextResponse.json({ error: 'Artist not found.' }, { status: 404 });
  }

  // This triggers a real money movement — only the artist who claimed this
  // profile may release deposits held for it.
  if (artist.claimedByUid !== user.uid) {
    return NextResponse.json(
      { error: 'This profile has not been claimed by your account.', code: 'NOT_OWNER' },
      { status: 403 }
    );
  }
  if (!artist.claimVerified) {
    return NextResponse.json(
      { error: 'Identity review must finish before deposits can move.', code: 'CLAIM_NOT_VERIFIED' },
      { status: 403 },
    );
  }

  try {
    const { count, totalTransferredCents } = await transferHeldDeposits(artistId);
    return NextResponse.json({ transferred: count, total: totalTransferredCents });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Held-deposit transfer failed.';
    console.error('[Connect] claim-complete transfer failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
