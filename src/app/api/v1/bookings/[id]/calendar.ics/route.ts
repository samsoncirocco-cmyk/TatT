import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { buildBookingIcs, bookingIcsFilename } from '@/lib/booking-ics';
import { liveHolds, type Hold } from '@/lib/booking-holds';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/bookings/[id]/calendar.ics — the booking's slot as a calendar
 * event, owner-scoped.
 *
 * Only a booking with a CONCRETE slot gets an event: the slot truth lives in
 * `booking_holds` (ADR 0027), so a converted hold — or, in the window between
 * checkout and webhook, a still-live active one — is what we render. A
 * request-model booking has date *preferences*, never times, and answers 404
 * here; rendering a preference as an event would be the fake-slot lie the
 * booking model exists to prevent.
 *
 * Auth mirrors /api/v1/bookings/[id]: missing doc, foreign owner, and
 * backend-unconfigured all collapse to 404 — never reveal existence.
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
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  try {
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();

    const doc = await db.collection('booking_requests').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    const booking = doc.data() as { uid?: string; artistId?: string; artistName?: string };
    if (!booking || booking.uid !== user.uid) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // The concrete slot: a converted hold is the paid reservation; an active
    // hold that is still live covers the moments before the webhook converts
    // it. Released/expired holds are dead slots and never rendered.
    const holdsSnap = await db
      .collection('booking_holds')
      .where('bookingId', '==', id)
      .get();
    const holds = holdsSnap.docs.map((d) => d.data() as Hold);
    const newestFirst = [...holds].sort((a, b) =>
      (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    );
    const slot =
      newestFirst.find((h) => h.status === 'converted') ??
      liveHolds(newestFirst.filter((h) => h.status === 'active'), Date.now())[0];
    if (!slot) {
      return NextResponse.json(
        { success: false, error: 'No scheduled time for this booking' },
        { status: 404 }
      );
    }

    // Studio/city for LOCATION — best-effort, fail-open: a graph outage must
    // not break the download, it just loses the location line.
    let location: string | undefined;
    if (booking.artistId) {
      try {
        const { getRosterArtistById } = await import('@/lib/artists-graph');
        const artist = await getRosterArtistById(booking.artistId);
        if (artist?.location) location = artist.location;
      } catch {
        // Location stays undefined.
      }
    }

    const ics = buildBookingIcs({
      bookingId: id,
      artistName: booking.artistName ?? 'your artist',
      location,
      slot: {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone: slot.timezone,
      },
    });
    if (!ics) {
      // A stored slot we cannot place in time — malformed data, not a client error.
      console.error(`[calendar.ics] booking ${id}: slot could not be rendered`, {
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone: slot.timezone,
      });
      return NextResponse.json(
        { success: false, error: 'No scheduled time for this booking' },
        { status: 404 }
      );
    }

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${bookingIcsFilename(id)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error(
      `[calendar.ics] fetch ${id} failed:`,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
}
