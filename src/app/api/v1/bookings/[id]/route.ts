import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { ensureAdminApp } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/bookings/[id] — a single booking, owner-scoped.
 *
 * A booking that doesn't exist AND a booking owned by someone else both
 * return 404 — we never reveal a doc's existence to a non-owner.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await verifyApiAuth(request);
  if (authError) return authError;

  const user = await verifyFirebaseToken(request);
  if (!user?.uid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (!ensureAdminApp()) {
    // Backend not wired — can't confirm ownership, so treat as not found.
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    const doc = await getFirestore().collection('booking_requests').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    const data = doc.data() as { uid?: string } | undefined;
    // Non-owner gets the same 404 as a missing doc — never reveal existence.
    if (!data || data.uid !== user.uid) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking: { id: doc.id, ...data } });
  } catch (err) {
    console.error(
      `[bookings] fetch ${id} failed:`,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
}
