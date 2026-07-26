/**
 * Take an exclusive hold on one slot, before checkout.
 *
 * This is the step that makes a booking a reservation. The client picks a time,
 * this route reserves it for 30 minutes, and only then may they pay for it. A
 * second client asking for the same time gets 409 and sees it gone from their
 * grid.
 *
 * The route refuses to hold a slot the offer would not currently show. That
 * matters: a client could otherwise post any time at all — 3am, a day the
 * artist blocked, a slot already busy on their calendar — and reserve it. The
 * slot must be one `getBookingOffer` is offering *right now*, in reservation
 * mode, to this artist.
 *
 * A 503 here is not a failure the client should retry into: it means this
 * artist is not on the reservation model, and the caller falls back to the
 * request flow.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import { verifyFirebaseToken } from '@/lib/auth-dal';
import { ensureAdminApp } from '@/lib/firebase-admin';
import { getBookingOffer } from '@/lib/booking-offer';
import { placeHold } from '@/lib/booking-holds-persistence';
import { canTransition, type BookingStatus } from '@/lib/booking';

export const runtime = 'nodejs';

interface HoldPayload {
  artistId?: string;
  bookingId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

export async function POST(req: NextRequest) {
  const authError = await verifyApiAuth(req);
  if (authError) return authError;

  const caller = await verifyFirebaseToken(req);
  let body: HoldPayload;
  try {
    body = (await req.json()) as HoldPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { artistId, bookingId, date, startTime, endTime } = body;
  if (!artistId || !bookingId || !date || !startTime || !endTime) {
    return NextResponse.json(
      { error: 'artistId, bookingId, date, startTime and endTime are required.' },
      { status: 400 }
    );
  }

  // Ownership: a hold moves someone's booking record, so it must be theirs.
  // A missing document is allowed through for the same reason /api/checkout
  // allows it — the capture may have hit the file fallback.
  const cred = ensureAdminApp();
  if (cred) {
    try {
      const { getFirestore } = await import('firebase-admin/firestore');
      const snap = await getFirestore()
        .collection('booking_requests')
        .doc(bookingId)
        .get();
      if (snap.exists) {
        const doc = snap.data() as Record<string, unknown>;
        const ownerUid = (doc.uid as string | null) ?? null;
        if (ownerUid && ownerUid !== (caller?.uid ?? null)) {
          return NextResponse.json({ error: 'Booking does not belong to you.' }, { status: 403 });
        }
        // Only a booking that may legally move to `held` may take one. A paid
        // or cancelled booking reserving more of an artist's day is a bug.
        const status = (doc.status as BookingStatus | undefined) ?? 'pending';
        if (status !== 'held' && !canTransition(status, 'held')) {
          return NextResponse.json(
            { error: `A ${status} booking cannot hold a slot.` },
            { status: 409 }
          );
        }
      }
    } catch (err) {
      // Fail CLOSED, unlike the checkout ownership check. That one guards a
      // payment the caller is making for themselves; this one hands out an
      // exclusive claim on an artist's time to whoever asks.
      console.error('[hold] ownership check failed — refusing:', err);
      return NextResponse.json({ error: 'Could not verify your booking.' }, { status: 503 });
    }
  }

  const nowMs = Date.now();
  const offer = await getBookingOffer({ artistId, nowMs, excludeBookingId: bookingId });
  if (offer.decision.mode !== 'reservation') {
    return NextResponse.json(
      {
        error: 'This artist takes booking requests, not reservations.',
        mode: offer.decision.mode,
        reason: offer.decision.reason,
      },
      { status: 503 }
    );
  }

  // The slot must be one we are offering right now — not any time the caller
  // cares to name.
  const offered = offer.slots.some(
    (s) => s.date === date && s.startTime === startTime && s.endTime === endTime
  );
  if (!offered) {
    return NextResponse.json(
      { error: 'That time is no longer available.', code: 'SLOT_GONE' },
      { status: 409 }
    );
  }

  const result = await placeHold({
    artistId,
    bookingId,
    slot: { date, startTime, endTime, timezone: offer.timezone! },
    nowMs,
  });

  if (!result.ok) {
    if (result.reason === 'slot_held') {
      return NextResponse.json(
        { error: 'Someone just took that time.', code: 'SLOT_GONE' },
        { status: 409 }
      );
    }
    if (result.reason === 'unavailable') {
      return NextResponse.json(
        { error: 'Reservations are temporarily unavailable.', mode: 'request' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'That slot is not bookable.' }, { status: 400 });
  }

  // Persist the hold onto the booking so checkout and the webhook can find it.
  if (cred) {
    try {
      const { getFirestore } = await import('firebase-admin/firestore');
      await getFirestore()
        .collection('booking_requests')
        .doc(bookingId)
        .set(
          {
            status: 'held',
            holdId: result.hold.holdId,
            holdExpiresAt: result.hold.expiresAt,
            heldSlot: {
              date: result.hold.date,
              startTime: result.hold.startTime,
              endTime: result.hold.endTime,
              timezone: result.hold.timezone,
            },
          },
          { merge: true }
        );
    } catch (err) {
      // The hold itself is taken and will lapse on its own in 30 minutes, so
      // nothing is over-booked. Log loudly: the booking record is now behind.
      console.error(`[hold] booking ${bookingId} not stamped with hold:`, err);
    }
  }

  return NextResponse.json({
    holdId: result.hold.holdId,
    expiresAt: result.hold.expiresAt,
    slot: {
      date: result.hold.date,
      startTime: result.hold.startTime,
      endTime: result.hold.endTime,
      timezone: result.hold.timezone,
    },
  });
}
