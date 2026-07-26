/**
 * What can we actually offer this client, for this artist, right now?
 *
 * The one server-side composition of every part of the reservation model:
 *
 *     artist's declared windows        (artist-availability)
 *   − time already booked on TatT      (existing bookings)
 *   − time held by another client      (booking-holds)
 *   − time busy on their own calendar  (artist-calendar freeBusy)
 *   = the slots we are willing to hold
 *
 * and, alongside it, the honest statement of which model the client is getting
 * (`booking-mode`).
 *
 * The invariant this file exists to guarantee: **`slots` is non-empty only when
 * `decision.mode === "reservation"`.** A slot on screen is a promise we can
 * keep, so if anything at all is uncertain the slots are dropped and the client
 * gets the request flow. Nothing downstream has to remember to check.
 */
import {
  generateAvailableSlots,
  addDaysToISODate,
  toISODate,
  type SessionTypeConfig,
  type Slot,
} from "./scheduling-engine";
import { normalizeArtistSchedule, hasPublishedHours } from "./artist-availability";
import { filterSlotsByBusy } from "./artist-calendar";
import {
  getCalendarConnection,
  readArtistBusy,
} from "./artist-calendar-connection";
import { holdsWritable, listLiveHolds } from "./booking-holds-persistence";
import { holdsAsExistingBookings } from "./booking-holds";
import { isArtistClaimed } from "./artist-ownership";
import { resolveBookingMode, type BookingModeDecision } from "./booking-mode";
import { ensureAdminApp } from "./firebase-admin";

/** How far ahead the booking page offers times. */
export const OFFER_WINDOW_DAYS = 28;

/**
 * Fallback session shape until `:SessionType` is wired into the booking page.
 * Deliberately conservative: a two-hour sitting with 15 minutes either side and
 * a day's notice. Offering too little is a smaller mistake than offering a slot
 * the artist cannot honour.
 */
export const DEFAULT_SESSION: SessionTypeConfig = {
  durationMinutes: 120,
  beforeBufferMinutes: 15,
  afterBufferMinutes: 15,
  minimumBookingNoticeHours: 24,
};

export interface BookingOffer {
  decision: BookingModeDecision;
  /** Concrete bookable times. Always empty unless the mode is "reservation". */
  slots: Slot[];
  /** The zone `slots` are expressed in. Absent when there are none. */
  timezone?: string;
}

/** Read the artist's declared windows from the availability document. */
async function readSchedule(artistId: string) {
  try {
    if (!ensureAdminApp()) return null;
    const { getFirestore } = await import("firebase-admin/firestore");
    const snap = await getFirestore()
      .collection("artist_availability")
      .doc(artistId)
      .get();
    return normalizeArtistSchedule(snap.exists ? snap.data() : null);
  } catch (err) {
    console.warn(
      `[offer] schedule read failed for ${artistId} — request model:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Compose the offer for one artist.
 *
 * `excludeBookingId` keeps a client's own hold visible to themselves, so
 * reloading the checkout page does not make their reserved slot vanish.
 */
export async function getBookingOffer(input: {
  artistId: string;
  nowMs?: number;
  excludeBookingId?: string;
  sessionType?: SessionTypeConfig;
}): Promise<BookingOffer> {
  const nowMs = input.nowMs ?? Date.now();
  const startDate = toISODate(new Date(nowMs));
  const endDate = addDaysToISODate(startDate, OFFER_WINDOW_DAYS);

  // Everything independent, in parallel — this runs on a page render.
  const [claimed, connection, schedule, canHold] = await Promise.all([
    isArtistClaimed(input.artistId),
    getCalendarConnection(input.artistId),
    readSchedule(input.artistId),
    holdsWritable(),
  ]);

  const publishedHours = Boolean(schedule && hasPublishedHours(schedule.schedule));

  // Only read the calendar when there is a live connection to read. Asking
  // otherwise would spend a network round trip to learn what we already know.
  const calendar =
    connection && !connection.revokedAt
      ? await readArtistBusy({
          artistId: input.artistId,
          timeMinMs: nowMs,
          timeMaxMs: Date.parse(`${endDate}T23:59:59.999Z`),
          nowMs,
        })
      : null;

  const decision = resolveBookingMode({
    artistId: input.artistId,
    claimed,
    connection,
    publishedHours,
    calendar,
    holdsWritable: canHold,
    nowMs,
  });

  // The invariant: no reservation, no slots. Every degradation path lands here.
  if (decision.mode !== "reservation" || !schedule || !calendar?.ok) {
    return { decision, slots: [] };
  }

  const timezone = schedule.schedule.timezone;
  const holds = await listLiveHolds(input.artistId, nowMs);

  const slots = generateAvailableSlots({
    schedule: schedule.schedule,
    overrides: schedule.overrides,
    sessionType: input.sessionType ?? DEFAULT_SESSION,
    // Another client's live hold occupies the artist's time exactly as a booked
    // session does, so the engine filters it out without knowing holds exist.
    existingBookings: holdsAsExistingBookings(holds, nowMs, {
      excludeBookingId: input.excludeBookingId,
    }),
    nowEpochMs: nowMs,
    startDate,
    endDate,
  });

  // The calendar subtracts, last. It never adds a slot the artist did not
  // declare — it only removes ones they are already busy for.
  return {
    decision,
    slots: filterSlotsByBusy(slots, calendar.busy, timezone),
    timezone,
  };
}
