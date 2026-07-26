import { describe, it, expect } from "vitest";
import {
  EMPTY_WEEK,
  MAX_RANGES_PER_DAY,
  MAX_OVERRIDES,
  validateArtistSchedule,
  normalizeArtistSchedule,
  hasPublishedHours,
} from "./artist-availability";

const GOOD = {
  timezone: "America/Phoenix",
  monday: [{ start: "10:00", end: "18:00" }],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

describe("validating the windows an artist offers", () => {
  it("accepts a plain week", () => {
    const res = validateArtistSchedule({ schedule: GOOD, overrides: [] });
    expect(res.ok).toBe(true);
  });

  it("accepts a week with no hours at all — that is 'I am not offering slots'", () => {
    const res = validateArtistSchedule({ schedule: EMPTY_WEEK("UTC"), overrides: [] });
    expect(res.ok).toBe(true);
  });

  it("rejects an unknown timezone rather than guessing UTC", () => {
    // Guessing here shifts every slot the artist offers by hours.
    const res = validateArtistSchedule({
      schedule: { ...GOOD, timezone: "Mars/Olympus" },
      overrides: [],
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/timezone/i);
  });

  it("rejects a missing timezone", () => {
    const { timezone: _drop, ...noTz } = GOOD;
    const res = validateArtistSchedule({ schedule: noTz, overrides: [] });
    expect(res.ok).toBe(false);
  });

  it("rejects a malformed time", () => {
    const res = validateArtistSchedule({
      schedule: { ...GOOD, monday: [{ start: "25:00", end: "18:00" }] },
      overrides: [],
    });
    expect(res.ok).toBe(false);
  });

  it("rejects a window that ends before it starts", () => {
    const res = validateArtistSchedule({
      schedule: { ...GOOD, monday: [{ start: "18:00", end: "10:00" }] },
      overrides: [],
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/after/i);
  });

  it("rejects overlapping windows on the same day", () => {
    // Overlaps would double-count the artist's time and produce slots the
    // engine lays out twice.
    const res = validateArtistSchedule({
      schedule: {
        ...GOOD,
        monday: [
          { start: "10:00", end: "14:00" },
          { start: "13:00", end: "18:00" },
        ],
      },
      overrides: [],
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/overlap/i);
  });

  it("accepts two windows that merely touch", () => {
    const res = validateArtistSchedule({
      schedule: {
        ...GOOD,
        monday: [
          { start: "10:00", end: "14:00" },
          { start: "14:00", end: "18:00" },
        ],
      },
      overrides: [],
    });
    expect(res.ok).toBe(true);
  });

  it("caps the windows per day", () => {
    const many = Array.from({ length: MAX_RANGES_PER_DAY + 1 }, (_, i) => ({
      start: `${String(i).padStart(2, "0")}:00`,
      end: `${String(i).padStart(2, "0")}:30`,
    }));
    const res = validateArtistSchedule({
      schedule: { ...GOOD, monday: many },
      overrides: [],
    });
    expect(res.ok).toBe(false);
  });
});

describe("validating date overrides", () => {
  it("accepts a full-day block", () => {
    const res = validateArtistSchedule({
      schedule: GOOD,
      overrides: [{ date: "2026-08-06", type: "block" }],
    });
    expect(res.ok).toBe(true);
  });

  it("accepts a timed extra opening", () => {
    const res = validateArtistSchedule({
      schedule: GOOD,
      overrides: [
        { date: "2026-08-06", type: "open", startTime: "19:00", endTime: "22:00" },
      ],
    });
    expect(res.ok).toBe(true);
  });

  it("rejects an impossible date", () => {
    const res = validateArtistSchedule({
      schedule: GOOD,
      overrides: [{ date: "2026-02-30", type: "block" }],
    });
    expect(res.ok).toBe(false);
  });

  it("rejects an unknown override type", () => {
    const res = validateArtistSchedule({
      schedule: GOOD,
      overrides: [{ date: "2026-08-06", type: "maybe" }],
    });
    expect(res.ok).toBe(false);
  });

  it("rejects an 'open' override with no window — it would open nothing", () => {
    const res = validateArtistSchedule({
      schedule: GOOD,
      overrides: [{ date: "2026-08-06", type: "open" }],
    });
    expect(res.ok).toBe(false);
  });

  it("caps the number of overrides", () => {
    const many = Array.from({ length: MAX_OVERRIDES + 1 }, () => ({
      date: "2026-08-06",
      type: "block" as const,
    }));
    const res = validateArtistSchedule({ schedule: GOOD, overrides: many });
    expect(res.ok).toBe(false);
  });
});

describe("reading a stored schedule back", () => {
  it("returns null for a document with no schedule", () => {
    expect(normalizeArtistSchedule(null)).toBeNull();
    expect(normalizeArtistSchedule({ status: "open" })).toBeNull();
  });

  it("returns null for a stored schedule that no longer validates", () => {
    // Rules can tighten after a document was written. A schedule we cannot
    // trust must not generate slots — it degrades to the request model.
    expect(
      normalizeArtistSchedule({
        schedule: { ...GOOD, monday: [{ start: "18:00", end: "10:00" }] },
      }),
    ).toBeNull();
  });

  it("round-trips a valid schedule", () => {
    const parsed = normalizeArtistSchedule({ schedule: GOOD, overrides: [] });
    expect(parsed?.schedule.monday).toEqual([{ start: "10:00", end: "18:00" }]);
    expect(parsed?.schedule.timezone).toBe("America/Phoenix");
  });

  it("ignores junk fields on the stored document", () => {
    const parsed = normalizeArtistSchedule({
      schedule: { ...GOOD, evilDay: [{ start: "00:00", end: "23:59" }] },
      overrides: [],
    });
    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed!.schedule)).not.toContain("evilDay");
  });
});

describe("hasPublishedHours", () => {
  it("is false for a week with no windows anywhere", () => {
    expect(hasPublishedHours(EMPTY_WEEK("UTC"))).toBe(false);
  });

  it("is true once any day has a window", () => {
    expect(hasPublishedHours(GOOD)).toBe(true);
  });
});
