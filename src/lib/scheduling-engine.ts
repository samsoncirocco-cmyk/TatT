/**
 * Scheduling engine — generates bookable time slots from artist availability.
 *
 * This is the Cal.com core primitive: recurring weekly schedule → concrete
 * bookable slots, filtered by existing bookings, holds, overrides, and buffers.
 *
 * In Cal.com this lives in the getAvailableSlots() server function. Here it
 * reads:
 *  - Recurring weekly schedule from Firestore (artist_availability/{artistId}/schedule)
 *  - Date overrides from the same Firestore doc
 *  - Session type config from Neo4j (:SessionType) for duration + buffers
 *  - Existing bookings from Neo4j (:BookingRelay or future :Booking nodes)
 *
 * Pure function: the slot generation logic has NO side effects and is unit-testable.
 * The I/O wrappers (fetchSlots) handle Firestore/Neo4j calls.
 */

// ─── Types ─────────────────────────────────────────────────────────────

export interface TimeRange {
  /** "10:00" (24h, "HH:MM") */
  start: string;
  /** "18:00" (24h, "HH:MM") */
  end: string;
}

export interface WeeklySchedule {
  monday: TimeRange[];
  tuesday: TimeRange[];
  wednesday: TimeRange[];
  thursday: TimeRange[];
  friday: TimeRange[];
  saturday: TimeRange[];
  sunday: TimeRange[];
  /** IANA timezone, e.g. "America/Phoenix" */
  timezone: string;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface AvailabilityOverride {
  date: string; // "YYYY-MM-DD"
  type: "block" | "open";
  /** "14:00" — timed window for 'open', or partial-day 'block' */
  startTime?: string;
  /** "18:00" — timed window for 'open', or partial-day 'block' */
  endTime?: string;
}

export interface Slot {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "14:00"
  endTime: string; // "16:00"
  durationMinutes: number;
}

export interface SessionTypeConfig {
  durationMinutes: number;
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
  minimumBookingNoticeHours: number;
}

export interface ExistingBooking {
  /** Wall-clock date the session *starts* on. */
  date: string;
  startTime: string;
  /** Wall-clock end. If it is at or before `startTime`, the session runs past midnight. */
  endTime: string;
  /** IANA timezone the wall-clock times are in. Defaults to the schedule's. */
  timezone?: string;
}

/** A half-open wall-clock range expressed in minutes since midnight. */
export interface MinuteRange {
  start: number;
  end: number;
}

/** A half-open interval on the absolute (UTC epoch ms) timeline. */
interface EpochInterval {
  startMs: number;
  endMs: number;
}

const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60 * 1000;

// ─── Time helpers (pure) ──────────────────────────────────────────────

/** True when `time` is a wall-clock "H:MM" / "HH:MM" with hour 0–23 and minute 0–59. */
export function isValidTimeString(time: string): boolean {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return false;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  return hours <= 23 && minutes <= 59;
}

/** Parse "HH:MM" to minutes since midnight. Returns 0 on invalid input. */
export function parseTimeToMinutes(time: string): number {
  if (!isValidTimeString(time)) return 0;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)!;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Convert minutes since midnight to "HH:MM". */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Check if two half-open intervals overlap. Unit-agnostic: both operands must
 * simply be on the same scale (minutes since midnight, or epoch ms).
 */
export function timeOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && startB < endA;
}

/** Get the day-of-week key for a date (UTC to match date iteration). */
export function dayOfWeekKey(date: Date): DayOfWeek {
  const days: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[date.getUTCDay()];
}

/** Format a Date to "YYYY-MM-DD" (UTC). */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Convert a wall-clock date+time in an IANA timezone to UTC epoch ms.
 * "2026-07-27" + "10:30" in America/Phoenix → the corresponding UTC instant.
 */
export function zonedDateTimeToEpochMs(
  dateStr: string,
  timeStr: string,
  timeZone: string,
): number {
  if (!isValidTimeString(timeStr)) return NaN;
  const [Y, M, D] = dateStr.split("-").map(Number);
  const minutesSinceMidnight = parseTimeToMinutes(timeStr);
  const hour = Math.floor(minutesSinceMidnight / 60);
  const minute = minutesSinceMidnight % 60;

  const desiredAsUtc = Date.UTC(Y, M - 1, D, hour, minute, 0);

  // Guess: treat wall clock as UTC, then correct by the zone's offset at that instant.
  let utcMs = desiredAsUtc;
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let i = 0; i < 8; i++) {
    const parts = Object.fromEntries(
      dtf
        .formatToParts(new Date(utcMs))
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, p.value]),
    ) as Record<string, string>;
    const shownHour = parts.hour === "24" ? 0 : Number(parts.hour);
    const shownAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      shownHour,
      Number(parts.minute),
      Number(parts.second),
    );
    const diff = desiredAsUtc - shownAsUtc;
    if (diff === 0) return utcMs;
    utcMs += diff;
  }
  // Did not converge (e.g. nonexistent local time in a DST gap).
  return NaN;
}

/** Add whole days to a "YYYY-MM-DD" string. */
export function addDaysToISODate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/**
 * Convert "minutes since midnight" on a wall-clock date to a UTC instant,
 * rolling into an adjacent day when the value falls outside [0, 1440) — which
 * is how a session running past midnight is expressed.
 * Returns NaN when the wall clock does not exist in the zone (DST gap).
 */
export function zonedMinutesToEpochMs(
  dateStr: string,
  minutes: number,
  timeZone: string,
): number {
  const dayOffset = Math.floor(minutes / MINUTES_PER_DAY);
  const minuteOfDay = minutes - dayOffset * MINUTES_PER_DAY;
  return zonedDateTimeToEpochMs(
    addDaysToISODate(dateStr, dayOffset),
    minutesToTime(minuteOfDay),
    timeZone,
  );
}

/** Render a UTC instant as the wall-clock date + time seen in an IANA timezone. */
export function epochMsToZonedDateTime(
  epochMs: number,
  timeZone: string,
): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(epochMs))
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}`,
  };
}

/**
 * Merge overlapping or touching ranges into a sorted, disjoint set.
 * Empty and inverted ranges are dropped.
 */
export function mergeMinuteRanges(ranges: MinuteRange[]): MinuteRange[] {
  const merged: MinuteRange[] = [];
  const sorted = ranges
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start);
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

/**
 * Resolve a `block` override to the absolute window it takes out, or null when
 * it is not a usable timed window — which covers both a deliberate full-day
 * block (no bounds) and a malformed one (missing, unparseable, inverted, or
 * nonexistent-in-zone bounds). Callers must treat null as blocking the day:
 * a malformed block must never be more permissive than a well-formed one.
 */
function toBlockWindow(
  override: AvailabilityOverride,
  dateStr: string,
  timeZone: string,
): EpochInterval | null {
  const { startTime, endTime } = override;
  if (!startTime || !endTime) return null;
  if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) return null;

  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  if (endMinutes <= startMinutes) return null;

  const startMs = zonedMinutesToEpochMs(dateStr, startMinutes, timeZone);
  const endMs = zonedMinutesToEpochMs(dateStr, endMinutes, timeZone);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;

  return { startMs, endMs };
}

/**
 * Convert existing bookings into absolute, buffered intervals.
 *
 * Bookings are absolute occupancy, not per-date wall-clock strings: a session
 * running 22:00–02:00 occupies part of the following day too. Buffers are real
 * elapsed time, so they are applied to the instant rather than the wall clock.
 *
 * Malformed times are ignored rather than treated as a midnight-anchored
 * exclusion zone (`parseTimeToMinutes` maps junk to 0).
 */
function toBookedIntervals(
  bookings: ExistingBooking[],
  defaultTimeZone: string,
  beforeBufferMs: number,
  afterBufferMs: number,
): EpochInterval[] {
  const intervals: EpochInterval[] = [];
  for (const booking of bookings) {
    if (
      !isValidTimeString(booking.startTime) ||
      !isValidTimeString(booking.endTime)
    ) {
      continue;
    }
    const timeZone = booking.timezone ?? defaultTimeZone;
    const startMinutes = parseTimeToMinutes(booking.startTime);
    let endMinutes = parseTimeToMinutes(booking.endTime);
    // An end at or before the start means the session runs past midnight.
    if (endMinutes <= startMinutes) endMinutes += MINUTES_PER_DAY;

    const startMs = zonedMinutesToEpochMs(booking.date, startMinutes, timeZone);
    const endMs = zonedMinutesToEpochMs(booking.date, endMinutes, timeZone);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;

    intervals.push({
      startMs: startMs - beforeBufferMs,
      endMs: endMs + afterBufferMs,
    });
  }
  return intervals;
}

// ─── Slot generation (pure, no I/O) ───────────────────────────────────

export interface GenerateSlotsParams {
  schedule: WeeklySchedule;
  overrides: AvailabilityOverride[];
  sessionType: SessionTypeConfig;
  existingBookings: ExistingBooking[];
  /** Unix epoch ms for "now" — used for minimum booking notice. */
  nowEpochMs: number;
  /** Start of the date range (inclusive). */
  startDate: string; // "YYYY-MM-DD"
  /** End of the date range (inclusive). */
  endDate: string; // "YYYY-MM-DD"
}

/**
 * Generate available slots from a recurring schedule.
 *
 * A session's *footprint* is the time it actually costs the artist:
 * `[start - beforeBuffer, end + afterBuffer]`. Every rule below is expressed in
 * terms of footprints on the absolute (epoch ms) timeline, which is what keeps
 * the offered grid self-consistent and DST-correct:
 *  - a slot is offered only if its footprint fits inside an open range;
 *  - consecutive slots are spaced so their footprints never overlap, so booking
 *    one offered slot can never invalidate another;
 *  - a slot is dropped if its footprint hits a block override or the footprint
 *    of an existing booking.
 *
 * Algorithm — for each date in [startDate, endDate]:
 *  a. Resolve `block` overrides; any that is not a usable timed window —
 *     deliberate full-day or malformed — takes out the whole day
 *  b. Keep the resolved block windows as absolute intervals
 *  c. Merge the recurring day's hours with any 'open' overrides into a
 *     disjoint set of open ranges (overlapping windows must not be sliced twice)
 *  d. Walk each open range on the epoch timeline, emitting slots whose
 *     footprint fits and which clear the minimum booking notice, blocks,
 *     and existing bookings
 */
export function generateAvailableSlots(params: GenerateSlotsParams): Slot[] {
  const slots: Slot[] = [];
  const {
    schedule,
    overrides,
    sessionType,
    existingBookings,
    nowEpochMs,
    startDate,
    endDate,
  } = params;

  // Zero/negative duration would never advance the cursor → infinite loop.
  if (sessionType.durationMinutes <= 0) return [];

  const timeZone = schedule.timezone;
  const durationMs = sessionType.durationMinutes * MS_PER_MINUTE;
  const beforeBufferMs =
    Math.max(0, sessionType.beforeBufferMinutes) * MS_PER_MINUTE;
  const afterBufferMs =
    Math.max(0, sessionType.afterBufferMinutes) * MS_PER_MINUTE;
  // One footprint per step, so two offered slots never contend for the same time.
  const strideMs = beforeBufferMs + durationMs + afterBufferMs;

  const noticeHours = Math.max(0, sessionType.minimumBookingNoticeHours);
  const minNoticeMs = noticeHours * 60 * 60 * 1000;
  const earliestBookable = nowEpochMs + minNoticeMs;

  const start = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");
  const maxDays = 90; // safety cap — reject oversized ranges instead of truncating
  const rangeDays =
    Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (rangeDays > maxDays) {
    throw new Error(
      `Date range exceeds maximum of ${maxDays} days (got ${rangeDays})`,
    );
  }

  // Existing bookings are absolute occupancy — resolved once, not per date, so
  // that a session running past midnight also blocks the following morning.
  const bookedIntervals = toBookedIntervals(
    existingBookings,
    timeZone,
    beforeBufferMs,
    afterBufferMs,
  );

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = toISODate(d);
    const dayKey = dayOfWeekKey(d);

    const dayBlocks = overrides.filter(
      (o) => o.date === dateStr && o.type === "block",
    );

    // a/b. Resolve block overrides to timed windows. Any block that does not
    //      resolve — a deliberate full-day block, or a malformed one — takes
    //      out the whole day. A block is the artist's "do not book me" signal,
    //      so it must never fail in the permissive direction.
    const blockedIntervals: EpochInterval[] = [];
    let fullDayBlocked = false;
    for (const o of dayBlocks) {
      const blockWindow = toBlockWindow(o, dateStr, timeZone);
      if (!blockWindow) {
        fullDayBlocked = true;
        break;
      }
      blockedIntervals.push(blockWindow);
    }
    if (fullDayBlocked) continue;

    // c. Merge the recurring day's hours with any 'open' overrides. Merging
    //    (rather than concatenating) is what stops an overlapping window from
    //    being sliced twice into overlapping slots.
    const rawRanges: MinuteRange[] = [];
    for (const range of schedule[dayKey] ?? []) {
      // Reject out-of-range clocks (parseTimeToMinutes maps them to 0, which
      // would incorrectly look like midnight).
      if (!isValidTimeString(range.start) || !isValidTimeString(range.end))
        continue;
      rawRanges.push({
        start: parseTimeToMinutes(range.start),
        end: parseTimeToMinutes(range.end),
      });
    }
    for (const o of overrides) {
      if (o.date !== dateStr || o.type !== "open") continue;
      if (!o.startTime || !o.endTime) continue;
      if (!isValidTimeString(o.startTime) || !isValidTimeString(o.endTime))
        continue;
      rawRanges.push({
        start: parseTimeToMinutes(o.startTime),
        end: parseTimeToMinutes(o.endTime),
      });
    }

    const openRanges = mergeMinuteRanges(rawRanges);
    if (!openRanges.length) continue;

    // d. Walk each open range on the absolute timeline.
    for (const range of openRanges) {
      const rangeStartMs = zonedMinutesToEpochMs(
        dateStr,
        range.start,
        timeZone,
      );
      const rangeEndMs = zonedMinutesToEpochMs(dateStr, range.end, timeZone);
      // A boundary that does not exist in this zone (DST gap) makes the range
      // unusable; dropping it is the conservative direction.
      if (!Number.isFinite(rangeStartMs) || !Number.isFinite(rangeEndMs))
        continue;

      for (
        let slotStartMs = rangeStartMs + beforeBufferMs;
        slotStartMs + durationMs + afterBufferMs <= rangeEndMs;
        slotStartMs += strideMs
      ) {
        if (slotStartMs < earliestBookable) continue;

        const slotEndMs = slotStartMs + durationMs;
        const footprintStartMs = slotStartMs - beforeBufferMs;
        const footprintEndMs = slotEndMs + afterBufferMs;

        const conflicts = (i: EpochInterval) =>
          timeOverlap(footprintStartMs, footprintEndMs, i.startMs, i.endMs);
        if (blockedIntervals.some(conflicts)) continue;
        if (bookedIntervals.some(conflicts)) continue;

        const slotStart = epochMsToZonedDateTime(slotStartMs, timeZone);
        const slotEnd = epochMsToZonedDateTime(slotEndMs, timeZone);
        slots.push({
          date: slotStart.date,
          startTime: slotStart.time,
          endTime: slotEnd.time,
          durationMinutes: sessionType.durationMinutes,
        });
      }
    }
  }

  return slots;
}
