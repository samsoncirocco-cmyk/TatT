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

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface AvailabilityOverride {
  date: string;  // "YYYY-MM-DD"
  type: 'block' | 'open';
  startTime?: string;  // "14:00" — for 'open' type
  endTime?: string;    // "18:00" — for 'open' type
}

export interface Slot {
  date: string;       // "YYYY-MM-DD"
  startTime: string;  // "14:00"
  endTime: string;    // "16:00"
  durationMinutes: number;
}

export interface SessionTypeConfig {
  durationMinutes: number;
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
  minimumBookingNoticeHours: number;
}

interface ExistingBooking {
  date: string;
  startTime: string;
  endTime: string;
}

// ─── Time helpers (pure) ──────────────────────────────────────────────

/** Parse "HH:MM" to minutes since midnight. Returns 0 on invalid input. */
export function parseTimeToMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return 0;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/** Convert minutes since midnight to "HH:MM". */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Check if two time ranges overlap on the same date. */
export function timeOverlap(
  startA: number, endA: number,
  startB: number, endB: number,
): boolean {
  return startA < endB && startB < endA;
}

/** Get the day-of-week key for a date (UTC to match date iteration). */
export function dayOfWeekKey(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
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
  const [Y, M, D] = dateStr.split('-').map(Number);
  const [h, m] = timeStr.split(':').map(Number);
  const desiredAsUtc = Date.UTC(Y, M - 1, D, h, m, 0);

  // Guess: treat wall clock as UTC, then correct by the zone's offset at that instant.
  let utcMs = desiredAsUtc;
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  for (let i = 0; i < 3; i++) {
    const parts = Object.fromEntries(
      dtf.formatToParts(new Date(utcMs))
        .filter((p) => p.type !== 'literal')
        .map((p) => [p.type, p.value]),
    ) as Record<string, string>;
    const hour = parts.hour === '24' ? 0 : Number(parts.hour);
    const shownAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hour,
      Number(parts.minute),
      Number(parts.second),
    );
    const diff = desiredAsUtc - shownAsUtc;
    if (diff === 0) break;
    utcMs += diff;
  }
  return utcMs;
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
  startDate: string;  // "YYYY-MM-DD"
  /** End of the date range (inclusive). */
  endDate: string;    // "YYYY-MM-DD"
}

/**
 * Generate available slots from a recurring schedule.
 *
 * Algorithm:
 * 1. For each date in [startDate, endDate]:
 *    a. Skip if within minimum booking notice
 *    b. Check for full-day block overrides → skip
 *    c. Get the day's open hours from the recurring schedule
 *    d. Apply 'open' overrides (merge extra hours)
 *    e. For each open-hours block, generate slots:
 *       - Apply before-buffer to first slot
 *       - Generate slots of sessionType.durationMinutes
 *       - Apply after-buffer (slot must end before blockEnd - afterBuffer)
 *       - Skip slots overlapping existing bookings
 */
export function generateAvailableSlots(params: GenerateSlotsParams): Slot[] {
  const slots: Slot[] = [];
  const { schedule, overrides, sessionType, existingBookings, nowEpochMs, startDate, endDate } = params;

  const minNoticeMs = sessionType.minimumBookingNoticeHours * 60 * 60 * 1000;
  const earliestBookable = nowEpochMs + minNoticeMs;

  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  const maxDays = 90;  // safety cap — reject oversized ranges instead of truncating
  const rangeDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (rangeDays > maxDays) {
    throw new Error(`Date range exceeds maximum of ${maxDays} days (got ${rangeDays})`);
  }

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = toISODate(d);
    const dayKey = dayOfWeekKey(d);

    // 1b. Full-day block override
    const blockOverride = overrides.find(
      (o) => o.date === dateStr && o.type === 'block' && !o.startTime
    );
    if (blockOverride) continue;

    // 1c. Get open hours from recurring schedule
    let openHours = schedule[dayKey] ?? [];

    // 1d. Apply 'open' override
    const openOverride = overrides.find(
      (o) => o.date === dateStr && o.type === 'open' && o.startTime && o.endTime
    );
    if (openOverride) {
      openHours = [...openHours, { start: openOverride.startTime!, end: openOverride.endTime! }];
    }

    if (!openHours.length) continue;

    // 1e. Generate slots for each open-hours block
    for (const block of openHours) {
      const blockStart = parseTimeToMinutes(block.start);
      const blockEnd = parseTimeToMinutes(block.end);

      // Apply before-buffer to the block start
      const effectiveStart = blockStart + sessionType.beforeBufferMinutes;
      const effectiveEnd = blockEnd - sessionType.afterBufferMinutes;

      if (effectiveEnd <= effectiveStart) continue;

      // Generate slots
      let slotStart = effectiveStart;
      while (slotStart + sessionType.durationMinutes <= effectiveEnd) {
        const slotEnd = slotStart + sessionType.durationMinutes;

        // Skip slots that start before the minimum booking notice (artist TZ)
        const slotStartEpochMs = zonedDateTimeToEpochMs(
          dateStr,
          minutesToTime(slotStart),
          schedule.timezone,
        );
        if (slotStartEpochMs < earliestBookable) {
          slotStart += sessionType.durationMinutes;
          continue;
        }

        // Check overlap with existing bookings, including before/after buffers
        const isBooked = existingBookings.some((b) => {
          if (b.date !== dateStr) return false;
          const bookedStart =
            parseTimeToMinutes(b.startTime) - sessionType.beforeBufferMinutes;
          const bookedEnd =
            parseTimeToMinutes(b.endTime) + sessionType.afterBufferMinutes;
          return timeOverlap(slotStart, slotEnd, bookedStart, bookedEnd);
        });

        if (!isBooked) {
          slots.push({
            date: dateStr,
            startTime: minutesToTime(slotStart),
            endTime: minutesToTime(slotEnd),
            durationMinutes: sessionType.durationMinutes,
          });
        }

        slotStart += sessionType.durationMinutes;
      }
    }
  }

  return slots;
}
