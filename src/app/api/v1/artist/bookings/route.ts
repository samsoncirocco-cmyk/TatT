import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { getArtistByClaimedUid } from '@/lib/artist-stripe';
import { sanitizeBooking, type BookingStatusEvent } from '@/lib/booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/artist/bookings — the bookings addressed to the caller's
 * claimed artist profile.
 *
 * The artist-side counterpart of /api/v1/bookings (which is client-scoped by
 * `uid`). Which artist is never taken from the request: it is resolved from
 * the verified Firebase uid via `claimedByUid`, so nobody can read another
 * artist's booking inbox by guessing ids.
 *
 * The response surfaces each booking's `statusHistory` — the audit trail the
 * webhook has been writing since ADR 0027 that no page showed (TAT-24).
 *
 * What the artist sees vs. what we store: the client's contact details and
 * brief are the point of a booking, so they stay. The requester's `ip`
 * (server-side abuse metadata) and `uid` (an internal Firebase identifier)
 * are stripped — and history actors that are uids are collapsed to 'client',
 * so the audit trail stays honest without leaking identifiers.
 */

const KNOWN_ACTORS = new Set(['system', 'stripe-webhook']);

function sanitizeForArtist(doc: Record<string, unknown>): Record<string, unknown> {
  const out = sanitizeBooking(doc); // strips ip
  delete out.uid;
  if (Array.isArray(out.statusHistory)) {
    out.statusHistory = (out.statusHistory as BookingStatusEvent[]).map((event) => ({
      ...event,
      by: KNOWN_ACTORS.has(event.by) ? event.by : 'client',
    }));
  }
  return out;
}

export async function GET(request: NextRequest) {
  const authError = await verifyApiAuth(request);
  if (authError) return authError;

  const user = await verifyFirebaseToken(request);
  if (!user?.uid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let artist;
  try {
    artist = await getArtistByClaimedUid(user.uid);
  } catch (err) {
    console.error(
      '[artist/bookings] claimed-artist lookup failed:',
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { success: false, error: 'Could not resolve your artist profile.' },
      { status: 503 }
    );
  }

  if (!artist) {
    return NextResponse.json(
      { success: false, error: 'No claimed artist profile.', code: 'NO_CLAIMED_ARTIST' },
      { status: 403 }
    );
  }

  if (!ensureAdminApp()) {
    // Backend not wired — honest empty, never a 500 (same as /api/v1/bookings).
    return NextResponse.json({ success: true, bookings: [] });
  }

  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    // Filter by artistId only — no `.orderBy`, which would demand a composite
    // index. One artist's inbox is small: sort + cap in memory instead.
    const snap = await getFirestore()
      .collection('booking_requests')
      .where('artistId', '==', artist.id)
      .get();

    const bookings = snap.docs
      .map((d) => sanitizeForArtist({ id: d.id, ...d.data() }))
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
      .slice(0, 100);
    return NextResponse.json({ success: true, bookings });
  } catch (err) {
    // A real query failure is NOT an empty inbox — signal it.
    console.error(
      '[artist/bookings] list query failed:',
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ success: false, error: 'Booking lookup failed.' }, { status: 503 });
  }
}
