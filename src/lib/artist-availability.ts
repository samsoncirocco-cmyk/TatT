/**
 * The availability an artist chooses to give TatT.
 *
 * This is the missing half of the reservation model. A connected calendar says
 * when someone is *busy*; it says nothing about when they are willing to take a
 * TatT client. Reading a calendar and offering every gap in it would book an
 * artist's evenings, their days off, and the hour they keep free for lunch.
 *
 * So the artist declares windows — recurring weekly hours plus date overrides —
 * and the connected calendar only ever SUBTRACTS from them. TatT can never
 * offer a time the artist did not first offer to TatT.
 *
 * ── Why this file exists at all ───────────────────────────────────────────
 * `scheduling-engine.ts` has consumed `WeeklySchedule` and
 * `AvailabilityOverride` since PR #112, but nothing has ever written one:
 * there is no route, no library function, and `firestore.rules` forbids client
 * writes to `artist_availability/{artistId}`. The engine reads a shape that no
 * artist can produce. This module is the validation layer behind the write path
 * that closes that gap.
 *
 * Stored on the SAME document as the availability status
 * (`artist_availability/{artistId}`), under a `schedule` key. The existing
 * `status` field and `normalizeAvailability` are untouched — an artist can have
 * both, and a stale or invalid schedule simply falls back to the status.
 *
 * Pure: validation and parsing only, no I/O.
 */
import {
  isValidTimeString,
  parseTimeToMinutes,
  type AvailabilityOverride,
  type DayOfWeek,
  type TimeRange,
  type WeeklySchedule,
} from "./scheduling-engine";

export const DAYS: readonly DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

/** Enough for a split shift with breaks; low enough to bound the engine's work. */
export const MAX_RANGES_PER_DAY = 6;

/** Roughly a year of holidays and one-off openings. */
export const MAX_OVERRIDES = 200;

export interface ArtistSchedule {
  schedule: WeeklySchedule;
  overrides: AvailabilityOverride[];
  updatedAt?: string;
}

export type ScheduleValidation =
  | { ok: true; value: ArtistSchedule }
  | { ok: false; error: string };

/** A week offering nothing. The correct starting point for a new editor. */
export function EMPTY_WEEK(timezone: string): WeeklySchedule {
  return {
    timezone,
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
  };
}

/** Does this artist offer TatT any time at all? */
export function hasPublishedHours(schedule: WeeklySchedule): boolean {
  return DAYS.some((d) => (schedule[d] ?? []).length > 0);
}

/**
 * Is this a timezone the runtime actually knows? Guessing UTC for a typo would
 * shift every slot the artist offers by hours, and they would find out from a
 * client who turned up at the wrong time.
 */
function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Validate one day's windows: well-formed, forward-running, non-overlapping. */
function validateDay(day: DayOfWeek, raw: unknown): TimeRange[] | string {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return `${day} must be a list of time ranges`;
  if (raw.length > MAX_RANGES_PER_DAY) {
    return `${day} has more than ${MAX_RANGES_PER_DAY} windows`;
  }

  const ranges: TimeRange[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return `${day} has a malformed window`;
    const { start, end } = item as Record<string, unknown>;
    if (typeof start !== "string" || !isValidTimeString(start)) {
      return `${day} has an invalid start time`;
    }
    if (typeof end !== "string" || !isValidTimeString(end)) {
      return `${day} has an invalid end time`;
    }
    if (parseTimeToMinutes(end) <= parseTimeToMinutes(start)) {
      return `${day}: ${end} must be after ${start}`;
    }
    ranges.push({ start, end });
  }

  // Overlaps would hand the engine the same minute twice and lay out slots on
  // top of each other. Touching windows (14:00 end, 14:00 start) are fine.
  const sorted = [...ranges].sort(
    (a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start),
  );
  for (let i = 1; i < sorted.length; i++) {
    if (parseTimeToMinutes(sorted[i].start) < parseTimeToMinutes(sorted[i - 1].end)) {
      return `${day} has overlapping windows`;
    }
  }
  return ranges;
}

function validateOverride(raw: unknown): AvailabilityOverride | string {
  if (!raw || typeof raw !== "object") return "Malformed override";
  const { date, type, startTime, endTime } = raw as Record<string, unknown>;
  if (!isValidIsoDate(date)) return `Override has an invalid date: ${String(date)}`;
  if (type !== "block" && type !== "open") {
    return `Override type must be 'block' or 'open', got '${String(type)}'`;
  }

  const out: AvailabilityOverride = { date, type };
  const hasStart = typeof startTime === "string" && startTime.length > 0;
  const hasEnd = typeof endTime === "string" && endTime.length > 0;

  if (hasStart !== hasEnd) return `Override on ${date} needs both a start and an end`;
  if (hasStart && hasEnd) {
    if (!isValidTimeString(startTime as string) || !isValidTimeString(endTime as string)) {
      return `Override on ${date} has an invalid time`;
    }
    if (parseTimeToMinutes(endTime as string) <= parseTimeToMinutes(startTime as string)) {
      return `Override on ${date}: end must be after start`;
    }
    out.startTime = startTime as string;
    out.endTime = endTime as string;
  } else if (type === "open") {
    // A full-day 'block' is meaningful (a holiday). A full-day 'open' is not:
    // the engine reads an 'open' override as a timed window, so one without
    // times silently opens nothing and the artist wonders where their slots
    // went.
    return `Override on ${date}: an 'open' override needs a start and end time`;
  }
  return out;
}

/** Validate a whole schedule submission. Rejects rather than repairs. */
export function validateArtistSchedule(input: unknown): ScheduleValidation {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Invalid request body" };
  }
  const { schedule: rawSchedule, overrides: rawOverrides } = input as Record<
    string,
    unknown
  >;

  if (!rawSchedule || typeof rawSchedule !== "object") {
    return { ok: false, error: "A schedule is required" };
  }
  const src = rawSchedule as Record<string, unknown>;

  if (!isValidTimezone(src.timezone)) {
    return { ok: false, error: "A valid IANA timezone is required" };
  }

  const schedule = EMPTY_WEEK(src.timezone);
  for (const day of DAYS) {
    const result = validateDay(day, src[day]);
    if (typeof result === "string") return { ok: false, error: result };
    schedule[day] = result;
  }

  const overrides: AvailabilityOverride[] = [];
  if (rawOverrides !== undefined) {
    if (!Array.isArray(rawOverrides)) {
      return { ok: false, error: "Overrides must be a list" };
    }
    if (rawOverrides.length > MAX_OVERRIDES) {
      return { ok: false, error: `No more than ${MAX_OVERRIDES} overrides` };
    }
    for (const raw of rawOverrides) {
      const result = validateOverride(raw);
      if (typeof result === "string") return { ok: false, error: result };
      overrides.push(result);
    }
  }

  return { ok: true, value: { schedule, overrides } };
}

/**
 * Read a stored `artist_availability` document back into a schedule.
 *
 * Returns null for anything we cannot fully trust — no schedule, a malformed
 * one, or one written under looser rules than today's. A schedule we cannot
 * validate must not generate slots; the artist falls back to the request model,
 * which is always safe.
 */
export function normalizeArtistSchedule(raw: unknown): ArtistSchedule | null {
  if (!raw || typeof raw !== "object") return null;
  const doc = raw as Record<string, unknown>;
  if (!doc.schedule) return null;
  const result = validateArtistSchedule({
    schedule: doc.schedule,
    overrides: doc.overrides,
  });
  if (!result.ok) return null;
  return {
    ...result.value,
    ...(typeof doc.scheduleUpdatedAt === "string"
      ? { updatedAt: doc.scheduleUpdatedAt }
      : {}),
  };
}
