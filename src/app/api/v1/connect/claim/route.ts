/**
 * Request ownership of an Artist profile.
 *
 * A Firebase login proves a TatT account, not control of the Instagram handle
 * that anchors a scraped artist profile. This public-facing route therefore
 * cannot write `claimedByUid`. It records a pending request, issues a code for
 * the artist to publish, and notifies an operator. Only the dry-run-first
 * approval CLI can create the trusted ownership binding.
 */
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import {
  CLAIM_VERIFICATION_TTL_MS,
  formatClaimVerificationCode,
} from '@/lib/artist-claim';
import { requestArtistClaim } from '@/lib/artist-claim-graph';
import { listPendingByArtist } from '@/lib/booking-relay';
import { notifyOpsOfArtistClaim } from '@/lib/notify';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  const user = await verifyFirebaseToken(req);
  if (!user?.uid) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 },
    );
  }
  const limit = await rateLimit(req, 'artist-claim', user.uid);
  if (!limit.allowed) return rateLimitResponse(limit);

  let artistId: string | undefined;
  try {
    ({ artistId } = (await req.json()) as { artistId?: string });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  if (!artistId) {
    return NextResponse.json({ error: 'artistId is required.' }, { status: 400 });
  }

  const requestId = `CL-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  const verificationCode = formatClaimVerificationCode(randomUUID());

  let recorded;
  try {
    recorded = await requestArtistClaim({
      id: requestId,
      artistId,
      uid: user.uid,
      contactEmail: typeof user.email === 'string' ? user.email : null,
      verificationCode,
    });
  } catch (err) {
    console.error('[claim] could not record ownership request:', err);
    return NextResponse.json(
      { error: 'Could not record your claim request. Nothing changed.' },
      { status: 503 },
    );
  }

  if (!recorded.artist) {
    return NextResponse.json({ error: 'Artist not found.' }, { status: 404 });
  }
  if (recorded.artist.claimedByUid) {
    if (
      recorded.artist.claimedByUid === user.uid &&
      recorded.artist.claimVerificationStatus === 'verified'
    ) {
      const pending = await listPendingByArtist(artistId);
      return NextResponse.json({
        claimed: true,
        verificationStatus: 'verified',
        artistId,
        name: recorded.artist.name,
        hasConnectedAccount: Boolean(recorded.artist.stripeAccountId),
        chargesEnabled: recorded.artist.chargesEnabled,
        pendingDeposit: {
          count: pending.length,
          amountCents: pending.reduce((sum, relay) => sum + relay.amountCents, 0),
        },
      });
    }
    return NextResponse.json(
      { error: 'This profile already has an owner.', code: 'ALREADY_CLAIMED' },
      { status: 409 },
    );
  }
  if (!recorded.request) {
    return NextResponse.json(
      { error: 'This claim request is no longer pending.', code: 'CLAIM_NOT_PENDING' },
      { status: 409 },
    );
  }
  const delivery = await notifyOpsOfArtistClaim(recorded.request, recorded.artist.name);
  if (!delivery.delivered) {
    console.error(`[claim] request ${recorded.request.id} not delivered: ${delivery.reason}`);
    return NextResponse.json(
      {
        claimed: false,
        verificationStatus: 'pending_verification',
        requestId: recorded.request.id,
        error:
          'We recorded the request but could not deliver it to our review team. ' +
          'Nothing was claimed and no money can move.',
        fallbackEmail: process.env.OPS_NOTIFY_EMAIL || 'support@tatttester.com',
      },
      { status: 502 },
    );
  }

  const handle = recorded.request.instagram?.replace(/^@/, '') || null;
  const expiresAt = new Date(
    recorded.request.issuedAtEpochMs + CLAIM_VERIFICATION_TTL_MS,
  ).toISOString();
  return NextResponse.json(
    {
      claimed: false,
      verificationStatus: 'pending_verification',
      requestId: recorded.request.id,
      artistId,
      name: recorded.artist.name,
      instagram: handle,
      verificationCode: handle ? recorded.request.verificationCode : null,
      expiresAt,
      nextStep: handle
        ? `Post ${recorded.request.verificationCode} on @${handle} in your bio, a post, or a story. ` +
          'A person will verify it before the profile or payouts become yours.'
        : 'This profile has no reachable Instagram handle. Our team must verify you manually before the profile or payouts become yours.',
    },
    { status: 202 },
  );
}
