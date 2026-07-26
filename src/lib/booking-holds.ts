/**
 * Slot holds — the thing that makes a booking a reservation instead of a
 * request (ADR 0027).
 *
 * Without a hold, `generateAvailableSlots` offers a time, the client picks it,
 * and nothing stops a second client from picking the same time and paying for
 * it too. A hold is a short exclusive claim on one concrete slot, taken before
 * checkout and released if the client does not finish.
 *
 * Two rules keep this honest and both are enforced here, not by a scheduler:
 *
 *  1. **Expiry is decided by the clock, not by a sweep.** Every read filters on
 *     `expiresAt` against the caller's `nowMs`, so a stuck cron can never keep a
 *     slot hostage. `releaseExpired` exists only to tidy the store; correctness
 *     does not depend on it running.
 *  2. **Conflict is overlap, not equality.** A 2-hour hold at 14:00 blocks a
 *     1-hour request at 15:00. Ranges are half-open, so a slot starting exactly
 *     when another ends does not conflict.
 *
 * Pure: no I/O, no clock. The caller passes `nowMs` and the current hold set;
 * `booking-holds-persistence.ts` supplies both from Firestore inside a
 * transaction, which is what makes the check-then-write atomic.
 */
import {
  isValidTimeString,
  parseTimeToMinutes,
  timeOverlap,
  zonedMinutesToEpochMs,
  type ExistingBooking,
} from "./scheduling-engine";

/**
 * How long a slot stays held while the client pays.
 *
 * 30 minutes, and the number is not arbitrary: it is Stripe Checkout's minimum
 * `expires_at`. The Checkout Session is created with `expires_at` set to the
 * hold's own expiry, so Stripe itself refuses to take money for a slot whose
 * reservation has lapsed. A shorter hold would leave a window in which a
 * payable session outlives the reservation behind it — the exact race that
 * produces a paid-for slot somebody else already has.
 */
export const HOLD_TTL_MINUTES = 30;

const MS_PER_MINUTE = 60_000;

/**
 * Longest slot a hold may cover, in minutes. Matches the upper bound
 * `validateSessionTypeInput` puts on `durationMinutes` (15–720): no offering
 * can be longer than 12 hours, so a longer hold is malformed input, not a long
 * session. This is also what rejects `endTime === startTime` — under the
 * engine's "end at or before start runs past midnight" convention that reads as
 * a full 24 hours, and one ambiguous field must not take a whole day of an
 * artist's calendar out of circulation.
 */
const MAX_HOLD_MINUTES = 720;

/** One concrete bookable time, as offered by the scheduling engine. */
export interface HeldSlot {
  /** "YYYY-MM-DD" — the wall-clock date the session starts on. */
  date: string;
  /** "HH:MM" wall clock. */
  startTime: string;
  /** "HH:MM" wall clock. At or before `startTime` means it runs past midnight. */
  endTime: string;
  /** IANA timezone the wall-clock times are in. */
  timezone: string;
}

export interface Hold extends HeldSlot {
  holdId: string;
  artistId: string;
  /** The booking this hold belongs to — the only booking that may pay for it. */
  bookingId: string;
  createdAt: string;
  /** ISO instant this hold stops reserving anything. */
  expiresAt: string;
  status: "active" | "released" | "converted";
}

export type HoldRefusal = "slot_held" | "invalid_slot" | "in_the_past";

export type HoldResult =
  | { ok: true; hold: Hold }
  | { ok: false; reason: HoldRefusal };

/** When a hold taken at `nowMs` stops reserving its slot. */
export function holdExpiresAt(nowMs: number): string {
  return new Date(nowMs + HOLD_TTL_MINUTES * MS_PER_MINUTE).toISOString();
}

/**
 * Whether this hold is reserving its slot right now. Anything unparseable is
 * dead rather than eternal — a corrupt `expiresAt` must not lock a slot up.
 */
export function isHoldLive(hold: Hold, nowMs: number): boolean {
  if (hold.status !== "active") return false;
  const expires = Date.parse(hold.expiresAt);
  return Number.isFinite(expires) && expires > nowMs;
}

/** The subset of `holds` still reserving their slots at `nowMs`. */
export function liveHolds(holds: readonly Hold[], nowMs: number): Hold[] {
  return holds.filter((h) => isHoldLive(h, nowMs));
}

/**
 * The absolute interval a slot occupies, or null when the slot is malformed.
 * An `endTime` at or before `startTime` is read as running into the next day,
 * matching `ExistingBooking` in the scheduling engine.
 */
function slotInterval(
  slot: HeldSlot,
): { startMs: number; endMs: number } | null {
  if (!isValidTimeString(slot.startTime) || !isValidTimeString(slot.endTime)) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slot.date) || !slot.timezone) return null;

  const startMin = parseTimeToMinutes(slot.startTime);
  const rawEndMin = parseTimeToMinutes(slot.endTime);
  const endMin = rawEndMin > startMin ? rawEndMin : rawEndMin + 24 * 60;
  if (endMin - startMin > MAX_HOLD_MINUTES) return null;

  const startMs = zonedMinutesToEpochMs(slot.date, startMin, slot.timezone);
  const endMs = zonedMinutesToEpochMs(slot.date, endMin, slot.timezone);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  if (endMs <= startMs) return null;
  return { startMs, endMs };
}

/** Whether two slots overlap on the absolute timeline (half-open). */
export function slotsConflict(a: HeldSlot, b: HeldSlot): boolean {
  const ia = slotInterval(a);
  const ib = slotInterval(b);
  // A slot we cannot place in time is treated as conflicting: refusing a hold
  // is recoverable, granting one over a real reservation is not.
  if (!ia || !ib) return true;
  return timeOverlap(ia.startMs, ia.endMs, ib.startMs, ib.endMs);
}

/**
 * Live holds expressed as `ExistingBooking`s, ready to be concatenated onto the
 * artist's real bookings and fed to `generateAvailableSlots`. This is how a
 * held slot disappears from everyone else's grid without the engine needing to
 * know holds exist.
 *
 * `excludeBookingId` keeps a booking's own hold visible *to itself*, so the
 * client who is mid-checkout still sees the slot they are paying for.
 */
export function holdsAsExistingBookings(
  holds: readonly Hold[],
  nowMs: number,
  opts: { excludeBookingId?: string } = {},
): ExistingBooking[] {
  return liveHolds(holds, nowMs)
    .filter((h) => h.bookingId !== opts.excludeBookingId)
    .map((h) => ({
      date: h.date,
      startTime: h.startTime,
      endTime: h.endTime,
      timezone: h.timezone,
    }));
}

/**
 * Try to take an exclusive hold on `slot`.
 *
 * The caller must supply every live hold for this artist; the check is only as
 * atomic as the transaction it runs inside. A booking re-requesting its own
 * slot refreshes the window rather than colliding with itself, so a client who
 * reloads the checkout page does not lose their reservation.
 */
export function requestHold(input: {
  existing: readonly Hold[];
  artistId: string;
  bookingId: string;
  slot: HeldSlot;
  nowMs: number;
  holdId: string;
}): HoldResult {
  const { existing, artistId, bookingId, slot, nowMs, holdId } = input;

  const interval = slotInterval(slot);
  if (!interval) return { ok: false, reason: "invalid_slot" };
  // Holding a slot that has already begun reserves nothing anyone can attend.
  if (interval.startMs <= nowMs) return { ok: false, reason: "in_the_past" };

  const conflict = liveHolds(existing, nowMs).some(
    (h) =>
      h.artistId === artistId &&
      h.bookingId !== bookingId &&
      slotsConflict(h, slot),
  );
  if (conflict) return { ok: false, reason: "slot_held" };

  return {
    ok: true,
    hold: {
      holdId,
      artistId,
      bookingId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      timezone: slot.timezone,
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: holdExpiresAt(nowMs),
      status: "active",
    },
  };
}

/** A copy of `hold` that no longer reserves its slot. Never mutates. */
export function releaseHold(hold: Hold): Hold {
  return { ...hold, status: "released" };
}

/** A copy of `hold` marked as having become a paid booking. Never mutates. */
export function convertHold(hold: Hold): Hold {
  return { ...hold, status: "converted" };
}

/**
 * Mark every lapsed hold released, returning a new array plus the ids that
 * changed. Housekeeping only — `isHoldLive` already ignores lapsed holds, so
 * nothing depends on this having run.
 */
export function releaseExpired(
  holds: readonly Hold[],
  nowMs: number,
): { holds: Hold[]; releasedIds: string[] } {
  const releasedIds: string[] = [];
  const next = holds.map((h) => {
    if (h.status !== "active" || isHoldLive(h, nowMs)) return h;
    releasedIds.push(h.holdId);
    return releaseHold(h);
  });
  return { holds: next, releasedIds };
}

/**
 * What to do with money that arrived for a held slot.
 *
 * `confirm` — the hold was still ours when payment landed (or this is a repeat
 * webhook for a hold we already converted).
 * `slot_lost` — the reservation had lapsed or been released. Stripe's
 * `expires_at` should make this unreachable; if it happens anyway, the payment
 * must be refunded rather than confirmed, because someone else may now hold the
 * slot. Confirming here is how a platform double-books and finds out from the
 * angry client.
 */
export function resolvePaidHold(
  hold: Hold,
  paidAtMs: number,
): "confirm" | "slot_lost" {
  if (hold.status === "converted") return "confirm";
  return isHoldLive(hold, paidAtMs) ? "confirm" : "slot_lost";
}
