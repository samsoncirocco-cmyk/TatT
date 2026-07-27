import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { getArtistByClaimedUid } from '@/lib/artist-stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/artist/me — the artist profile the signed-in user has claimed.
 *
 * The console page's entry question: "which artist am I?" Resolved strictly
 * from the VERIFIED Firebase uid via `claimedByUid` on the :Artist node —
 * a client-supplied artistId is never accepted (TAT-25 territory).
 *
 * `artist: null` (200) means the caller is a real signed-in user who has not
 * claimed a profile — the console shows them the /claim pointer. An infra
 * failure is a 503, NOT null: telling a real artist "you have no profile"
 * during a Neo4j blip would misdirect them into the claim flow.
 */
export async function GET(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  const user = await verifyFirebaseToken(req);
  if (!user?.uid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const artist = await getArtistByClaimedUid(user.uid);
    return NextResponse.json({
      success: true,
      artist: artist
        ? {
            id: artist.id,
            name: artist.name,
            hasConnectedAccount: Boolean(artist.stripeAccountId),
            chargesEnabled: artist.chargesEnabled,
          }
        : null,
    });
  } catch (err) {
    console.error(
      '[artist/me] claimed-artist lookup failed:',
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { success: false, error: 'Could not resolve your artist profile.' },
      { status: 503 }
    );
  }
}
