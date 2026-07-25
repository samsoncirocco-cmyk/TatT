import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { sanitizeBooking } from '@/lib/booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/bookings — the caller's own booking requests.
 *
 * Owner-scoped: only returns booking_requests where uid == the verified
 * caller. Never leaks another user's docs. If Firebase Admin is not
 * configured we return an honest empty list (200), never a 500 — an
 * unconfigured backend is an empty inbox, not an error to the client.
 */
export async function GET(request: NextRequest) {
  const authError = await verifyApiAuth(request);
  if (authError) return authError;

  const user = await verifyFirebaseToken(request);
  if (!user?.uid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!ensureAdminApp()) {
    // Backend not wired — honest empty, never a 500.
    return NextResponse.json({ success: true, bookings: [] });
  }

  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    // Filter by owner only — no `.orderBy('createdAt')`, which would require a
    // composite index (uid + createdAt) that may not exist and would throw.
    // A user's own bookings are a small set: sort + cap in memory instead.
    const snap = await getFirestore()
      .collection('booking_requests')
      .where('uid', '==', user.uid)
      .get();

    const bookings = snap.docs
      .map((d) => sanitizeBooking({ id: d.id, ...d.data() }))
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
      .slice(0, 50);
    return NextResponse.json({ success: true, bookings });
  } catch (err) {
    // A real query failure is NOT an empty inbox. Returning success:[] here would
    // make the client hide its localStorage fallback and show a false empty
    // state. Signal failure so the page falls back instead.
    console.error(
      '[bookings] list query failed:',
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ success: false, error: 'Booking lookup failed.' }, { status: 503 });
  }
}
