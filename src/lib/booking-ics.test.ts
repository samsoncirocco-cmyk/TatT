import { describe, it, expect } from "vitest";
import {
  buildBookingIcs,
  bookingIcsFilename,
  escapeIcsText,
  foldIcsLine,
  slotUtcInterval,
  type BookingIcsInput,
} from "./booking-ics";

const SLOT = {
  date: "2026-08-14",
  startTime: "13:00",
  endTime: "15:00",
  timezone: "America/New_York", // EDT on this date: UTC-4
};

function input(overrides: Partial<BookingIcsInput> = {}): BookingIcsInput {
  return {
    bookingId: "BK-ABC12345",
    artistName: "Nadia Vex",
    location: "Iron Quill Studio, Brooklyn, NY",
    slot: SLOT,
    nowMs: Date.UTC(2026, 6, 29, 12, 0, 0),
    ...overrides,
  };
}

describe("escapeIcsText", () => {
  it("escapes backslashes, newlines, semicolons and commas", () => {
    expect(escapeIcsText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });

  it("escapes backslash before the newline escape so \\n stays literal", () => {
    // A raw backslash-n in the source must not collapse into an escaped newline.
    expect(escapeIcsText("path\\name")).toBe("path\\\\name");
  });

  it("normalizes CRLF and CR to the same \\n escape", () => {
    expect(escapeIcsText("a\r\nb\rc")).toBe("a\\nb\\nc");
  });
});

describe("foldIcsLine", () => {
  it("leaves short lines alone", () => {
    expect(foldIcsLine("SUMMARY:short")).toEqual(["SUMMARY:short"]);
  });

  it("folds long lines to at most 75 octets, continuations space-prefixed", () => {
    const line = "DESCRIPTION:" + "x".repeat(200);
    const folded = foldIcsLine(line);
    expect(folded.length).toBeGreaterThan(1);
    for (const part of folded) {
      expect(Buffer.byteLength(part, "utf8")).toBeLessThanOrEqual(75);
    }
    for (const cont of folded.slice(1)) {
      expect(cont.startsWith(" ")).toBe(true);
    }
    // Unfolding (strip the leading space of each continuation) restores the line.
    expect(folded[0] + folded.slice(1).map((l) => l.slice(1)).join("")).toBe(line);
  });

  it("never splits a multi-byte character across the fold", () => {
    const line = "SUMMARY:" + "é".repeat(100); // 2 bytes each
    const folded = foldIcsLine(line);
    for (const part of folded) {
      expect(Buffer.byteLength(part, "utf8")).toBeLessThanOrEqual(75);
      // Round-trippable: no lone surrogates / broken chars.
      expect(part).toBe(Buffer.from(part, "utf8").toString("utf8"));
    }
  });
});

describe("slotUtcInterval", () => {
  it("converts wall clock + IANA zone to UTC instants (EDT is UTC-4)", () => {
    const interval = slotUtcInterval(SLOT);
    expect(interval).not.toBeNull();
    expect(new Date(interval!.startMs).toISOString()).toBe("2026-08-14T17:00:00.000Z");
    expect(new Date(interval!.endMs).toISOString()).toBe("2026-08-14T19:00:00.000Z");
  });

  it("rolls an end at or before the start into the next day", () => {
    const interval = slotUtcInterval({ ...SLOT, startTime: "23:00", endTime: "01:00" });
    expect(interval).not.toBeNull();
    expect(new Date(interval!.startMs).toISOString()).toBe("2026-08-15T03:00:00.000Z");
    expect(new Date(interval!.endMs).toISOString()).toBe("2026-08-15T05:00:00.000Z");
  });

  it("returns null for a DST-gap start (2:30 AM does not exist on spring-forward day)", () => {
    expect(
      slotUtcInterval({
        date: "2026-03-08",
        startTime: "02:30",
        endTime: "04:00",
        timezone: "America/New_York",
      }),
    ).toBeNull();
  });

  it("returns null for malformed fields", () => {
    expect(slotUtcInterval({ ...SLOT, date: "14/08/2026" })).toBeNull();
    expect(slotUtcInterval({ ...SLOT, startTime: "25:00" })).toBeNull();
    expect(slotUtcInterval({ ...SLOT, endTime: "nope" })).toBeNull();
    expect(slotUtcInterval({ ...SLOT, timezone: "" })).toBeNull();
  });
});

/** Reverse RFC 5545 folding: CRLF + single space joins back into one line. */
function unfold(ics: string): string {
  return ics.replace(/\r\n /g, "");
}

describe("buildBookingIcs", () => {
  it("renders a complete VCALENDAR with UTC DTSTART/DTEND", () => {
    const raw = buildBookingIcs(input());
    expect(raw).not.toBeNull();
    const ics = unfold(raw!);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("UID:BK-ABC12345@tatttester.com");
    expect(ics).toContain("DTSTART:20260814T170000Z");
    expect(ics).toContain("DTEND:20260814T190000Z");
    expect(ics).toContain("DTSTAMP:20260729T120000Z");
    expect(ics).toContain("SUMMARY:Tattoo session — Nadia Vex");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("https://tatttester.com/bookings");
  });

  it("escapes the artist name and location", () => {
    const ics = unfold(
      buildBookingIcs(
        input({
          artistName: "Vex; Nadia",
          location: "Iron Quill, Brooklyn",
        }),
      )!,
    );
    expect(ics).toContain("SUMMARY:Tattoo session — Vex\\; Nadia");
    expect(ics).toContain("LOCATION:Iron Quill\\, Brooklyn");
  });

  it("omits LOCATION when unknown", () => {
    const ics = buildBookingIcs(input({ location: undefined }))!;
    expect(ics).not.toContain("LOCATION:");
  });

  it("uses CRLF line endings throughout and ends with CRLF", () => {
    const ics = buildBookingIcs(input())!;
    expect(ics.endsWith("\r\n")).toBe(true);
    // No bare LF: every \n is preceded by \r.
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("keeps every physical line within 75 octets", () => {
    const ics = buildBookingIcs(
      input({ location: "A very long studio name ".repeat(10) }),
    )!;
    for (const line of ics.split("\r\n")) {
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    }
  });

  it("returns null rather than a wrong event when the slot cannot be placed", () => {
    expect(
      buildBookingIcs(
        input({
          slot: {
            date: "2026-03-08",
            startTime: "02:30",
            endTime: "04:00",
            timezone: "America/New_York",
          },
        }),
      ),
    ).toBeNull();
  });
});

describe("bookingIcsFilename", () => {
  it("builds a safe filename from the booking id", () => {
    expect(bookingIcsFilename("BK-ABC12345")).toBe("tatttester-booking-BK-ABC12345.ics");
    expect(bookingIcsFilename('BK/"weird"')).toBe("tatttester-booking-BKweird.ics");
    expect(bookingIcsFilename("///")).toBe("tatttester-booking-event.ics");
  });
});
