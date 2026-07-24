/**
 * GET /api/v1/bookings — the signed-in client's booking requests, newest
 * first. Server truth for the /bookings page (the localStorage mirror shows
 * instantly; this endpoint is what knows about deposit_paid transitions
 * written by the Stripe webhook).
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { sanitizeBooking } from '@/lib/booking';

export const runtime = 'nodejs';

const LIST_LIMIT = 50;

export async function GET(request: NextRequest) {
  const authError = await verifyApiAuth(request);
  if (authError) return authError;

  const user = await verifyFirebaseToken(request);
  if (!user?.uid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!ensureAdminApp()) {
    return NextResponse.json(
      { success: false, error: 'Booking storage is not configured.' },
      { status: 503 }
    );
  }

  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    // No orderBy: where(uid) + orderBy(createdAt) needs a composite index
    // that isn't deployed. A single client's bookings are few — sort here.
    const snap = await getFirestore()
      .collection('booking_requests')
      .where('uid', '==', user.uid)
      .get();
    const bookings = snap.docs
      .map((d) => sanitizeBooking(d.data()))
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
      .slice(0, LIST_LIMIT);
    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error('[bookings] list failed:', error);
    return NextResponse.json(
      { success: false, error: 'Could not load bookings.' },
      { status: 500 }
    );
  }
}
