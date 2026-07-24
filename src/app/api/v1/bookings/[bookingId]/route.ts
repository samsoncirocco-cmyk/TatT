/**
 * GET /api/v1/bookings/{bookingId} — a single booking request, owner-only.
 * The /book/success page uses this to render the reconciled server state
 * (deposit_paid) instead of trusting Stripe redirect params.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { isValidBookingId, sanitizeBooking } from '@/lib/booking';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const authError = await verifyApiAuth(request);
  if (authError) return authError;

  const user = await verifyFirebaseToken(request);
  if (!user?.uid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { bookingId } = await params;
  if (!isValidBookingId(bookingId)) {
    return NextResponse.json({ success: false, error: 'Invalid booking id.' }, { status: 400 });
  }

  if (!ensureAdminApp()) {
    return NextResponse.json(
      { success: false, error: 'Booking storage is not configured.' },
      { status: 503 }
    );
  }

  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    const snap = await getFirestore().collection('booking_requests').doc(bookingId).get();
    const data = snap.exists ? snap.data() : undefined;
    // 404 for both "missing" and "not yours" — don't leak which ids exist.
    if (!data || data.uid !== user.uid) {
      return NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, booking: sanitizeBooking(data) });
  } catch (error) {
    console.error('[bookings] get failed:', error);
    return NextResponse.json(
      { success: false, error: 'Could not load booking.' },
      { status: 500 }
    );
  }
}
