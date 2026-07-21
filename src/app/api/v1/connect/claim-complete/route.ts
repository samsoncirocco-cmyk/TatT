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
import { stripeConfigured, STRIPE_NOT_CONFIGURED } from '@/lib/stripe';
import { transferHeldDeposits } from '@/lib/booking-relay';

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

  try {
    const { count, totalTransferredCents } = await transferHeldDeposits(artistId);
    return NextResponse.json({ transferred: count, total: totalTransferredCents });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Held-deposit transfer failed.';
    console.error('[Connect] claim-complete transfer failed:', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
