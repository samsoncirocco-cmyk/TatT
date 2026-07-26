/**
 * Disconnect an artist's Google Calendar.
 *
 * Disconnecting must always work. It revokes the grant at Google, deletes the
 * stored refresh token, and stamps `revokedAt` — and it reports success even
 * when Google is unreachable, because the credential is gone from our side
 * either way and an artist who asked to be disconnected must not stay connected
 * because a third party timed out.
 *
 * The artist degrades to the request model immediately: `resolveBookingMode`
 * treats a revoked connection as no connection, so their profile keeps working
 * and simply stops offering concrete times.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { isArtistOwner } from '@/lib/artist-ownership';
import { revokeCalendarConnection } from '@/lib/artist-calendar-connection';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  const user = await verifyFirebaseToken(req);
  let body: { artistId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const artistId = body.artistId ?? '';
  if (!(await isArtistOwner(user?.uid, artistId))) {
    return NextResponse.json({ error: 'Not your artist profile.' }, { status: 403 });
  }

  const result = await revokeCalendarConnection(artistId);
  if (!result.ok) {
    return NextResponse.json(
      { error: 'Could not disconnect right now. Try again shortly.' },
      { status: 503 }
    );
  }
  return NextResponse.json({
    disconnected: true,
    // Surfaced so the UI can tell the artist to also remove TatT from their
    // Google account permissions page if we could not do it for them.
    revokedAtGoogle: result.revokedAtGoogle,
  });
}
