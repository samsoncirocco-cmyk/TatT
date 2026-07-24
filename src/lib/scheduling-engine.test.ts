import { describe, it, expect } from "vitest";
import {
  parseTimeToMinutes,
  minutesToTime,
  timeOverlap,
  dayOfWeekKey,
  generateAvailableSlots,
  type WeeklySchedule,
  type GenerateSlotsParams,
  type SessionTypeConfig,
} from "./scheduling-engine";

const EMPTY_SCHEDULE: WeeklySchedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
  timezone: "America/Phoenix",
};

const STANDARD_SCHEDULE: WeeklySchedule = {
  ...EMPTY_SCHEDULE,
  // Monday 10am-6pm
  monday: [{ start: "10:00", end: "18:00" }],
  // Wednesday 10am-2pm
  wednesday: [{ start: "10:00", end: "14:00" }],
  // Friday 11am-3pm
  friday: [{ start: "11:00", end: "15:00" }],
};

const STANDARD_SESSION: SessionTypeConfig = {
  durationMinutes: 120,
  beforeBufferMinutes: 30,
  afterBufferMinutes: 30,
  minimumBookingNoticeHours: 24,
};

// Use a fixed "now" for deterministic tests: 2026-07-22 (Wednesday) at 8:00 AM UTC
const NOW_MS = new Date("2026-07-22T08:00:00Z").getTime();

// ─── Time helpers ─────────────────────────────────────────────────────

describe("parseTimeToMinutes", () => {
  it("parses HH:MM format", () => {
    expect(parseTimeToMinutes("10:00")).toBe(600);
    expect(parseTimeToMinutes("14:30")).toBe(870);
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });

  it("returns 0 on invalid input", () => {
    expect(parseTimeToMinutes("invalid")).toBe(0);
    expect(parseTimeToMinutes("")).toBe(0);
    expect(parseTimeToMinutes("10")).toBe(0);
    expect(parseTimeToMinutes("25:00")).toBe(0);
    expect(parseTimeToMinutes("10:99")).toBe(0);
  });
});

describe("minutesToTime", () => {
  it("converts minutes to HH:MM", () => {
    expect(minutesToTime(600)).toBe("10:00");
    expect(minutesToTime(870)).toBe("14:30");
    expect(minutesToTime(0)).toBe("00:00");
  });
});

describe("timeOverlap", () => {
  it("detects overlapping ranges", () => {
    expect(timeOverlap(600, 720, 660, 780)).toBe(true); // 10-12 vs 11-13
  });

  it("returns false for adjacent non-overlapping ranges", () => {
    expect(timeOverlap(600, 720, 720, 840)).toBe(false); // 10-12 vs 12-14
  });

  it("returns false for separate ranges", () => {
    expect(timeOverlap(600, 720, 840, 960)).toBe(false); // 10-12 vs 14-16
  });

  it("returns true for fully contained ranges", () => {
    expect(timeOverlap(600, 900, 700, 800)).toBe(true); // 10-15 vs 11:40-13:20
  });
});

describe("dayOfWeekKey", () => {
  it("returns correct day for a date", () => {
    expect(dayOfWeekKey(new Date("2026-07-22T00:00:00Z"))).toBe("wednesday"); // Wednesday
    expect(dayOfWeekKey(new Date("2026-07-20T00:00:00Z"))).toBe("monday");
    expect(dayOfWeekKey(new Date("2026-07-25T00:00:00Z"))).toBe("saturday");
  });
});

// ─── Slot generation ──────────────────────────────────────────────────

describe("generateAvailableSlots", () => {
  const baseParams: GenerateSlotsParams = {
    schedule: STANDARD_SCHEDULE,
    overrides: [],
    sessionType: STANDARD_SESSION,
    existingBookings: [],
    nowEpochMs: NOW_MS,
    startDate: "2026-07-27", // Monday
    endDate: "2026-07-31", // Friday
  };

  it("generates slots for a Monday 10-6 schedule with 2h sessions and 30min buffers", () => {
    const slots = generateAvailableSlots(baseParams);
    // Monday: 10:00-18:00, with 30min before buffer = 10:30 start, 30min after buffer = 17:30 end
    // Effective range: 10:30 to 17:30 = 420 min
    // 2h (120min) sessions: 10:30, 12:30, 14:30 → but 16:30+120=18:30 > 17:30, so only 3 slots
    const mondaySlots = slots.filter((s) => s.date === "2026-07-27");
    expect(mondaySlots.length).toBe(3);
    expect(mondaySlots[0].startTime).toBe("10:30");
    expect(mondaySlots[0].endTime).toBe("12:30");
    expect(mondaySlots[1].startTime).toBe("12:30");
    expect(mondaySlots[2].startTime).toBe("14:30");
  });

  it("skips days with no open hours", () => {
    const slots = generateAvailableSlots(baseParams);
    // Tuesday and Thursday have no hours → no slots
    expect(slots.filter((s) => s.date === "2026-07-28").length).toBe(0); // Tuesday
    expect(slots.filter((s) => s.date === "2026-07-30").length).toBe(0); // Thursday
  });

  it("generates fewer slots for shorter open hours (Wednesday 10-2)", () => {
    const slots = generateAvailableSlots(baseParams);
    // Wednesday: 10:00-14:00, with 30min buffers → 10:30 to 13:30 = 180 min
    // 2h sessions: 10:30 only (12:30+120=14:30 > 13:30)
    const wedSlots = slots.filter((s) => s.date === "2026-07-29");
    expect(wedSlots.length).toBe(1);
    expect(wedSlots[0].startTime).toBe("10:30");
  });

  it("filters out slots that overlap with existing bookings", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      existingBookings: [
        // 12:30 slot (12:30-14:30) overlaps with this booking (12:00-14:00)
        { date: "2026-07-27", startTime: "12:00", endTime: "14:00" },
      ],
    };
    const slots = generateAvailableSlots(params);
    const mondaySlots = slots.filter((s) => s.date === "2026-07-27");
    // 10:30 (10:30-12:30) overlaps with 12:00-14:00? 10:30=630, 12:30=750, 12:00=720, 14:00=840
    // timeOverlap(630, 750, 720, 840) = 630 < 840 && 720 < 750 = true → overlaps, filtered
    // 12:30 (12:30-14:30) overlaps with 12:00-14:00? 750 < 840 && 720 < 870 = true → filtered
    // 14:30 (14:30-16:30) overlaps with 12:00-14:00? 870 < 840 = false → no overlap, kept
    // So only 14:30 survives
    expect(mondaySlots.length).toBe(1);
    expect(mondaySlots[0].startTime).toBe("14:30");
  });

  it("respects full-day block overrides", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      overrides: [
        { date: "2026-07-27", type: "block" }, // block all of Monday
      ],
    };
    const slots = generateAvailableSlots(params);
    expect(slots.filter((s) => s.date === "2026-07-27").length).toBe(0);
  });

  it("respects timed (partial-day) block overrides", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      overrides: [
        // Block lunch-ish window that overlaps the 12:30-14:30 slot
        {
          date: "2026-07-27",
          type: "block",
          startTime: "12:00",
          endTime: "14:00",
        },
      ],
    };
    const slots = generateAvailableSlots(params);
    const mondaySlots = slots.filter((s) => s.date === "2026-07-27");
    // 10:30-12:30 overlaps 12:00-14:00 → filtered
    // 12:30-14:30 overlaps → filtered
    // 14:30-16:30 free → kept
    expect(mondaySlots.map((s) => s.startTime)).toEqual(["14:30"]);
  });

  it("ignores malformed existing booking times instead of blocking the day", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      existingBookings: [
        { date: "2026-07-27", startTime: "bad", endTime: "14:00" },
        { date: "2026-07-27", startTime: "12:00", endTime: "nope" },
      ],
    };
    const slots = generateAvailableSlots(params);
    const mondaySlots = slots.filter((s) => s.date === "2026-07-27");
    // Invalid bookings must not expand into a midnight→14:00 exclusion zone
    expect(mondaySlots.length).toBe(3);
  });

  it("adds extra slots from open overrides", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      startDate: "2026-07-28", // Tuesday (normally no hours)
      endDate: "2026-07-28",
      overrides: [
        {
          date: "2026-07-28",
          type: "open",
          startTime: "09:00",
          endTime: "13:00",
        },
      ],
    };
    const slots = generateAvailableSlots(params);
    // Tuesday with override 9-13, buffers 30/30 → 9:30 to 12:30 = 180 min
    // 2h sessions: 9:30 only (11:30+120=13:30 > 12:30)
    expect(slots.length).toBe(1);
    expect(slots[0].startTime).toBe("09:30");
  });

  it("respects minimum booking notice", () => {
    // Set "now" to just 1 hour before the Monday 10:30 slot
    const params: GenerateSlotsParams = {
      ...baseParams,
      nowEpochMs: new Date("2026-07-27T09:30:00Z").getTime(), // 1 hour before first slot
      startDate: "2026-07-27",
      endDate: "2026-07-27",
    };
    const slots = generateAvailableSlots(params);
    // With 24h minimum notice and now = Monday 9:30 AM, the 10:30 slot is within
    // the notice window, so it should be filtered. All Monday slots should be gone.
    expect(slots.length).toBe(0);
  });

  it("returns empty array for empty schedule", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      schedule: EMPTY_SCHEDULE,
    };
    const slots = generateAvailableSlots(params);
    expect(slots.length).toBe(0);
  });
});
