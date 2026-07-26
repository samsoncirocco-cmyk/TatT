/**
 * Google's OAuth redirect lands here.
 *
 * Deliberately unauthenticated: Google sends the artist's BROWSER here, so
 * there is no Authorization header to check. Authentication is the `state`
 * parameter — an unguessable, server-issued, single-use token that we minted in
 * /connect while holding a verified Firebase uid and a proven ownership claim,
 * and that expires in ten minutes. Nothing else in this query string is
 * trusted: the artist id comes from the stored state, never from the URL.
 *
 * The `code` is consumed server-side and never reaches the browser. On success
 * we store an encrypted refresh token and redirect to the availability editor;
 * on any failure we redirect with an error code rather than rendering a stack
 * trace at a person who was just trying to connect their calendar.
 */
import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { exchangeCodeForTokens, SCOPE_APP_CREATED } from '@/lib/artist-calendar';
import {
  googleOAuthConfig,
  saveCalendarConnection,
} from '@/lib/artist-calendar-connection';
import { OAUTH_STATE_COLLECTION } from '../connect/route';

export const runtime = 'nodejs';

function baseUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv?.trim()) return fromEnv.replace(/\/$/, '');
  return req.nextUrl.origin.replace(/\/$/, '');
}

function back(
  req: NextRequest,
  params: Record<string, string>,
  artistId?: string
): NextResponse {
  // Land back on the editor for the artist who started the flow. Without an id
  // (a bad or expired state, where we never learned who they were) the roster
  // is the only honest place to send them.
  const url = new URL(
    artistId ? `/artist/${encodeURIComponent(artistId)}/availability` : '/artists',
    baseUrl(req)
  );
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const state = sp.get('state') ?? '';
  const code = sp.get('code') ?? '';

  // The artist pressed "cancel" on Google's consent screen. Not an error.
  const denied = sp.get('error');
  if (denied) return back(req, { calendar: 'cancelled' });
  if (!state || !code) return back(req, { calendar: 'error', reason: 'missing_params' });

  if (!ensureAdminApp()) return back(req, { calendar: 'error', reason: 'unavailable' });
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();
  const stateRef = db.collection(OAUTH_STATE_COLLECTION).doc(state);

  let stored: {
    artistId: string;
    includeWrite?: boolean;
    expiresAt?: string;
    used?: boolean;
  } | null = null;
  try {
    // Consume the state atomically. A replayed callback — the artist refreshing
    // the redirect, or someone else replaying a captured URL — finds it used.
    stored = await db.runTransaction(async (tx) => {
      const snap = await tx.get(stateRef);
      if (!snap.exists) return null;
      const doc = snap.data() as { used?: boolean; expiresAt?: string; artistId: string };
      if (doc.used) return null;
      if (doc.expiresAt && Date.parse(doc.expiresAt) < Date.now()) return null;
      tx.update(stateRef, { used: true, usedAt: new Date().toISOString() });
      return doc as typeof stored;
    });
  } catch (err) {
    console.error('[calendar/callback] state lookup failed:', err);
    return back(req, { calendar: 'error', reason: 'unavailable' });
  }
  if (!stored?.artistId) return back(req, { calendar: 'error', reason: 'bad_state' });

  const config = googleOAuthConfig(baseUrl(req));
  if (!config) return back(req, { calendar: 'error', reason: 'not_configured' }, stored.artistId);

  const exchanged = await exchangeCodeForTokens({ ...config, code });
  if (!exchanged.ok) {
    console.warn(
      `[calendar/callback] token exchange failed for ${stored.artistId}: ${exchanged.reason}`
    );
    return back(req, { calendar: 'error', reason: exchanged.reason }, stored.artistId);
  }

  // Trust the scopes GOOGLE granted, not the ones we asked for: an artist can
  // untick write access on the consent screen, and we must not later believe we
  // have a permission we do not have.
  const scopes = exchanged.tokens.scopes;
  const writeEnabled = scopes.includes(SCOPE_APP_CREATED);

  const saved = await saveCalendarConnection({
    artistId: stored.artistId,
    // The artist's own primary calendar is what free/busy is asked about.
    // "primary" resolves per-token, so it is always the connecting account's.
    calendarId: 'primary',
    refreshToken: exchanged.tokens.refreshToken,
    scopes,
    writeEnabled,
  });
  if (!saved.ok) {
    return back(req, { calendar: 'error', reason: saved.reason }, stored.artistId);
  }

  return back(req, { calendar: 'connected', write: writeEnabled ? '1' : '0' }, stored.artistId);
}
