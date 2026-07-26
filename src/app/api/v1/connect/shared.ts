/**
 * Shared guards for the Connect onboarding routes.
 *
 * Both the onboarding-link and status routes act on ONE artist's Stripe
 * connected account, so both need the same two things: where to send the artist
 * back to, and proof that the caller actually owns the profile they're asking
 * about. Minting a KYC link for somebody else's connected account would let an
 * attacker attach their own identity and bank details to another artist's
 * payouts, so ownership is enforced, not assumed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { getArtistStripe, type ArtistStripeInfo } from '@/lib/artist-stripe';

/** Absolute origin for Stripe redirect URLs. Mirrors src/app/api/checkout/route.ts. */
export function getBaseUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.replace(/\/$/, '');
  const origin = req.headers.get('origin');
  if (origin) return origin.replace(/\/$/, '');
  return 'http://localhost:3000';
}

/**
 * Resolve the artist and assert the signed-in caller claimed them.
 * Returns either the artist record or the NextResponse to send back.
 */
export async function requireOwnedArtist(
  req: NextRequest,
  artistId: string
): Promise<{ artist: ArtistStripeInfo } | { response: NextResponse }> {
  const user = await verifyFirebaseToken(req);
  if (!user) {
    return {
      response: NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    };
  }

  const artist = await getArtistStripe(artistId);
  if (!artist) {
    return { response: NextResponse.json({ error: 'Artist not found.' }, { status: 404 }) };
  }

  if (artist.claimedByUid !== user.uid) {
    return {
      response: NextResponse.json(
        { error: 'This profile is not claimed by your account.', code: 'NOT_CLAIMED_BY_YOU' },
        { status: 403 }
      ),
    };
  }

  return { artist };
}
