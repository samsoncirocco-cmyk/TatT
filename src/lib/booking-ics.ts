/**
 * iCalendar (.ics) rendering for a booked slot — pure, no I/O, unit-tested.
 *
 * Serves GET /api/v1/bookings/[id]/calendar.ics. Only a booking with a
 * CONCRETE slot (a hold on the reservation model — see ADR 0027) can become
 * a calendar event; request-model bookings have preferences, not times, and
 * must never be rendered as if a time were real.
 *
 * Time handling: a hold stores wall-clock times plus an IANA timezone
 * (see booking-holds.ts). We convert to UTC instants and emit `DTSTART`/
 * `DTEND` in the `...Z` form rather than TZID-qualified local times — a
 * TZID reference is only valid alongside a matching VTIMEZONE component,
 * and shipping a hand-rolled VTIMEZONE (with correct DST rules per zone)
 * is exactly the kind of subtle wrongness UTC avoids. Google Calendar and
 * Apple Calendar both accept UTC instants and display them in the viewer's
 * local zone. A slot that cannot be placed on the UTC timeline (DST gap,
 * malformed fields) yields `null`, never a wrong event.
 */

import {
  isValidTimeString,
  parseTimeToMinutes,
  zonedMinutesToEpochMs,
} from "./scheduling-engine";

const MINUTES_PER_DAY = 24 * 60;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The slot fields an event needs — matches HeldSlot in booking-holds.ts. */
export type IcsSlot = {
  /** "YYYY-MM-DD" wall-clock date the session starts on. */
  date: string;
  /** "HH:MM" wall clock. */
  startTime: string;
  /** "HH:MM" wall clock. At or before `startTime` means it runs past midnight. */
  endTime: string;
  /** IANA timezone the wall-clock times are in. */
  timezone: string;
};

export type BookingIcsInput = {
  bookingId: string;
  artistName: string;
  /** Studio / city line for LOCATION; omitted when unknown. */
  location?: string;
  slot: IcsSlot;
  /** Epoch ms for DTSTAMP; defaults to now. Injectable for tests. */
  nowMs?: number;
};

/**
 * Escape TEXT property values per RFC 5545 §3.3.11: backslash first, then
 * newlines (as literal "\n"), semicolons, and commas.
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/**
 * Fold one content line to RFC 5545 §3.1's 75-octet limit (excluding CRLF),
 * continuation lines prefixed with a single space. Octet-aware so a
 * multi-byte character is never split.
 */
export function foldIcsLine(line: string): string[] {
  if (Buffer.byteLength(line, "utf8") <= 75) return [line];
  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch, "utf8");
    if (currentBytes + b > 75) {
      out.push(current);
      current = " ";
      currentBytes = 1;
    }
    current += ch;
    currentBytes += b;
  }
  out.push(current);
  return out;
}

/** Render an epoch-ms instant as an RFC 5545 UTC DATE-TIME ("...Z"). */
function icsUtc(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * The absolute [start, end) interval a slot occupies, or null when the slot
 * is malformed or falls in a DST gap. Same past-midnight convention as
 * booking-holds: an end at or before the start rolls into the next day.
 */
export function slotUtcInterval(
  slot: IcsSlot,
): { startMs: number; endMs: number } | null {
  if (!ISO_DATE.test(slot.date) || !slot.timezone) return null;
  if (!isValidTimeString(slot.startTime) || !isValidTimeString(slot.endTime)) {
    return null;
  }
  const startMin = parseTimeToMinutes(slot.startTime);
  const rawEndMin = parseTimeToMinutes(slot.endTime);
  const endMin = rawEndMin <= startMin ? rawEndMin + MINUTES_PER_DAY : rawEndMin;
  const startMs = zonedMinutesToEpochMs(slot.date, startMin, slot.timezone);
  const endMs = zonedMinutesToEpochMs(slot.date, endMin, slot.timezone);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  return { startMs, endMs };
}

/** Download filename for a booking's event. */
export function bookingIcsFilename(bookingId: string): string {
  const safe = bookingId.replace(/[^A-Za-z0-9_-]/g, "");
  return `tatttester-booking-${safe || "event"}.ics`;
}

/**
 * Render the full VCALENDAR for one booked slot, or null when the slot
 * cannot honestly be placed in time. Lines are CRLF-joined and folded.
 */
export function buildBookingIcs(input: BookingIcsInput): string | null {
  const interval = slotUtcInterval(input.slot);
  if (!interval) return null;

  const summary = `Tattoo session — ${input.artistName}`;
  const description =
    "Booked on TattTester. Manage your booking: https://tatttester.com/bookings";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TattTester//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(input.bookingId)}@tatttester.com`,
    `DTSTAMP:${icsUtc(input.nowMs ?? Date.now())}`,
    `DTSTART:${icsUtc(interval.startMs)}`,
    `DTEND:${icsUtc(interval.endMs)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    ...(input.location ? [`LOCATION:${escapeIcsText(input.location)}`] : []),
    `DESCRIPTION:${escapeIcsText(description)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.flatMap(foldIcsLine).join("\r\n") + "\r\n";
}
