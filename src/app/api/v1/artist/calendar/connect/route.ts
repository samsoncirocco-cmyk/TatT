/**
 * Start (or inspect) an artist's Google Calendar connection.
 *
 * GET  — what is connected for this artist, if anything. No secrets.
 * POST — mint a single-use OAuth `state` and return the Google consent URL.
 *
 * The artist must have claimed the profile: connecting a calendar publishes
 * bookable time on someone's behalf, and nobody but the owner may do that.
 *
 * `state` is the CSRF defence for the callback, which Google reaches by browser
 * redirect and which therefore carries no Authorization header. We store the
 * state server-side, bound to the artist and the verified uid, single-use and
 * short-lived; the callback trusts nothing else in the query string.
 */
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { isArtistOwner } from '@/lib/artist-ownership';
import { buildAuthorizeUrl } from '@/lib/artist-calendar';
import {
  getCalendarConnection,
  googleOAuthConfig,
} from '@/lib/artist-calendar-connection';

export const runtime = 'nodejs';

export const OAUTH_STATE_COLLECTION = 'calendar_oauth_states';

/** Long enough to read a consent screen, short enough to be worthless if leaked. */
const STATE_TTL_MS = 10 * 60 * 1000;

function baseUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, '');
  return (req.headers.get('origin') ?? 'http://localhost:3000').replace(/\/$/, '');
}

export async function GET(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  const artistId = req.nextUrl.searchParams.get('artistId') ?? '';
  const user = await verifyFirebaseToken(req);
  if (!(await isArtistOwner(user?.uid, artistId))) {
    return NextResponse.json({ error: 'Not your artist profile.' }, { status: 403 });
  }

  const connection = await getCalendarConnection(artistId);
  return NextResponse.json({
    // A revoked connection reads as no connection — that is what disconnect means.
    connected: Boolean(connection && !connection.revokedAt),
    connection,
    configured: Boolean(googleOAuthConfig(baseUrl(req))),
  });
}

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  const user = await verifyFirebaseToken(req);
  let body: { artistId?: string; includeWrite?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const artistId = body.artistId ?? '';
  if (!(await isArtistOwner(user?.uid, artistId))) {
    return NextResponse.json({ error: 'Not your artist profile.' }, { status: 403 });
  }

  const config = googleOAuthConfig(baseUrl(req));
  if (!config) {
    return NextResponse.json(
      { error: 'Google Calendar is not configured on this deployment.' },
      { status: 503 }
    );
  }
  if (!ensureAdminApp()) {
    // No state store means no CSRF defence for the callback. Refuse rather than
    // run the flow without one.
    return NextResponse.json(
      { error: 'Calendar connection is temporarily unavailable.' },
      { status: 503 }
    );
  }

  const state = randomUUID();
  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    await getFirestore().collection(OAUTH_STATE_COLLECTION).doc(state).set({
      artistId,
      uid: user?.uid ?? null,
      includeWrite: Boolean(body.includeWrite),
      redirectUri: config.redirectUri,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + STATE_TTL_MS).toISOString(),
      used: false,
    });
  } catch (err) {
    console.error('[calendar/connect] could not persist OAuth state:', err);
    return NextResponse.json(
      { error: 'Calendar connection is temporarily unavailable.' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    authorizeUrl: buildAuthorizeUrl({
      ...config,
      state,
      includeWrite: Boolean(body.includeWrite),
    }),
  });
}
