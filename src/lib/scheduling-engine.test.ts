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
    // Monday 10:00-18:00. A session's footprint is 30 + 120 + 30 = 180 min, and
    // footprints may not overlap, so the grid steps by 180 min from 10:00:
    // 10:30-12:30 (footprint 10:00-13:00), 13:30-15:30 (footprint 13:00-16:00).
    // The next footprint would be 16:00-19:00, past the 18:00 close.
    const mondaySlots = slots.filter((s) => s.date === "2026-07-27");
    expect(mondaySlots.map((s) => [s.startTime, s.endTime])).toEqual([
      ["10:30", "12:30"],
      ["13:30", "15:30"],
    ]);
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
        { date: "2026-07-27", startTime: "12:00", endTime: "14:00" },
      ],
    };
    const slots = generateAvailableSlots(params);
    // The booking's footprint is 11:30-14:30. Nothing fits before it (90 min),
    // and the grid re-anchors to 14:30 after it. This case asserted 0 slots
    // until #162: the grid was pinned to 10:00, so the whole afternoon was lost.
    expect(
      slots.filter((s) => s.date === "2026-07-27").map((s) => s.startTime),
    ).toEqual(["15:00"]);
  });

  it("keeps slots whose footprint clears an existing booking", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      existingBookings: [
        // Footprint 09:30-11:30: hits the 10:00-13:00 slot only.
        { date: "2026-07-27", startTime: "10:00", endTime: "11:00" },
      ],
    };
    const slots = generateAvailableSlots(params);
    const mondaySlots = slots.filter((s) => s.date === "2026-07-27");
    // Free time is 11:30-18:00, which holds two sessions. Before #162 the grid
    // stayed pinned to 10:00 and offered only 13:30.
    expect(mondaySlots.map((s) => s.startTime)).toEqual(["12:00", "15:00"]);
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
    // 10:00-12:00 is too short for a 180-minute footprint; the grid re-anchors
    // to 14:00 and the offered footprint (14:00-17:00) clears the block.
    expect(
      slots.filter((s) => s.date === "2026-07-27").map((s) => s.startTime),
    ).toEqual(["14:30"]);
  });

  it("keeps slots whose footprint clears a timed block override", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      overrides: [
        {
          date: "2026-07-27",
          type: "block",
          startTime: "12:00",
          endTime: "13:00",
        },
      ],
    };
    const slots = generateAvailableSlots(params);
    const mondaySlots = slots.filter((s) => s.date === "2026-07-27");
    // 10:00-13:00 hits the block; 13:00-16:00 starts exactly as it ends.
    expect(mondaySlots.map((s) => s.startTime)).toEqual(["13:30"]);
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
    expect(mondaySlots.length).toBe(2);
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

  // ─── #150: open overrides must merge, not append ────────────────────

  it("merges an open override that overlaps the recurring day instead of appending it", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      startDate: "2026-07-27",
      endDate: "2026-07-27",
      overrides: [
        // Wholly inside the recurring Monday 10:00-18:00 window.
        {
          date: "2026-07-27",
          type: "open",
          startTime: "11:00",
          endTime: "15:00",
        },
      ],
    };
    const withOverride = generateAvailableSlots(params);
    const withoutOverride = generateAvailableSlots({
      ...params,
      overrides: [],
    });
    // A redundant open window adds no availability.
    expect(withOverride).toEqual(withoutOverride);
  });

  it("never offers two slots that overlap each other", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      startDate: "2026-07-27",
      endDate: "2026-07-27",
      overrides: [
        {
          date: "2026-07-27",
          type: "open",
          startTime: "11:00",
          endTime: "15:00",
        },
      ],
    };
    const slots = generateAvailableSlots(params);
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        expect(
          timeOverlap(
            parseTimeToMinutes(slots[i].startTime),
            parseTimeToMinutes(slots[i].endTime),
            parseTimeToMinutes(slots[j].startTime),
            parseTimeToMinutes(slots[j].endTime),
          ),
        ).toBe(false);
      }
    }
  });

  // ─── #151: the offered grid must satisfy the engine's own buffer rule ─

  it("keeps every remaining slot bookable after any offered slot is booked", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      startDate: "2026-07-27",
      endDate: "2026-07-27",
    };
    const slots = generateAvailableSlots(params);
    expect(slots.length).toBeGreaterThan(1);

    for (const booked of slots) {
      const remaining = generateAvailableSlots({
        ...params,
        existingBookings: [
          {
            date: booked.date,
            startTime: booked.startTime,
            endTime: booked.endTime,
          },
        ],
      });
      const expected = slots.filter((s) => s.startTime !== booked.startTime);
      expect(remaining).toEqual(expected);
    }
  });

  // ─── #153: malformed block overrides must fail closed ───────────────

  it("treats a block override with no endTime as a full-day block", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      overrides: [{ date: "2026-07-27", type: "block", startTime: "12:00" }],
    };
    const slots = generateAvailableSlots(params);
    expect(slots.filter((s) => s.date === "2026-07-27").length).toBe(0);
  });

  it("treats a block override with unparseable times as a full-day block", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      overrides: [
        {
          date: "2026-07-27",
          type: "block",
          startTime: "noon",
          endTime: "14:00",
        },
      ],
    };
    const slots = generateAvailableSlots(params);
    expect(slots.filter((s) => s.date === "2026-07-27").length).toBe(0);
  });

  it("treats a block override whose end precedes its start as a full-day block", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      overrides: [
        {
          date: "2026-07-27",
          type: "block",
          startTime: "16:00",
          endTime: "10:00",
        },
      ],
    };
    const slots = generateAvailableSlots(params);
    expect(slots.filter((s) => s.date === "2026-07-27").length).toBe(0);
  });

  it("still honours a well-formed block override on other days", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      overrides: [{ date: "2026-07-27", type: "block", startTime: "12:00" }],
    };
    const slots = generateAvailableSlots(params);
    // Only Monday is blocked — the malformed override must not leak days.
    expect(slots.filter((s) => s.date === "2026-07-29").length).toBe(1);
  });

  // ─── #152: bookings are absolute intervals, not date-keyed strings ───

  it("blocks the following morning when a booking runs past midnight", () => {
    const params: GenerateSlotsParams = {
      ...baseParams,
      startDate: "2026-07-28", // Tuesday, opened by override only
      endDate: "2026-07-28",
      overrides: [
        {
          date: "2026-07-28",
          type: "open",
          startTime: "00:00",
          endTime: "08:00",
        },
      ],
      existingBookings: [
        // Monday night session running into Tuesday morning.
        { date: "2026-07-27", startTime: "22:00", endTime: "02:00" },
      ],
    };
    const slots = generateAvailableSlots(params);
    expect(slots.map((s) => s.startTime)).toEqual(["03:00"]);
  });
});

// ─── #162: occupancy must re-anchor the grid, not strand the remainder ─

describe("generateAvailableSlots around occupied time", () => {
  const baseParams: GenerateSlotsParams = {
    schedule: STANDARD_SCHEDULE,
    overrides: [],
    sessionType: STANDARD_SESSION,
    existingBookings: [],
    nowEpochMs: NOW_MS,
    startDate: "2026-07-27", // Monday
    endDate: "2026-07-27",
  };

  it("offers the afternoon when a mid-day booking splits the range", () => {
    // The #162 repro: Monday 10:00-18:00 with one 12:00-14:00 booking.
    // The booking's footprint is 11:30-14:30, leaving 14:30-18:00 free —
    // room for a 15:00-17:00 session with both buffers inside the range.
    const slots = generateAvailableSlots({
      ...baseParams,
      existingBookings: [
        { date: "2026-07-27", startTime: "12:00", endTime: "14:00" },
      ],
    });
    expect(slots.map((s) => [s.startTime, s.endTime])).toEqual([
      ["15:00", "17:00"],
    ]);
  });

  it("re-anchors to the end of a booking that opens the day", () => {
    // Footprint 09:30-11:30 — free time is 11:30-18:00, which holds two
    // sessions. Anchoring to 10:00 would have offered only one.
    const slots = generateAvailableSlots({
      ...baseParams,
      existingBookings: [
        { date: "2026-07-27", startTime: "10:00", endTime: "11:00" },
      ],
    });
    expect(slots.map((s) => [s.startTime, s.endTime])).toEqual([
      ["12:00", "14:00"],
      ["15:00", "17:00"],
    ]);
  });

  it("leaves the earlier grid intact when a booking closes the day", () => {
    // Footprint 16:30-18:30 clips only the tail, which held no slot anyway.
    const slots = generateAvailableSlots({
      ...baseParams,
      existingBookings: [
        { date: "2026-07-27", startTime: "17:00", endTime: "18:00" },
      ],
    });
    expect(slots.map((s) => s.startTime)).toEqual(["10:30", "13:30"]);
  });

  it("fills each of three free intervals left by two bookings", () => {
    // 60-minute session, 15/15 buffers → a 90-minute footprint.
    // Booking footprints 10:45-11:45 and 13:45-14:45 cut Monday into
    // 10:00-10:45 (45 min — too short), 11:45-13:45, and 14:45-18:00.
    const slots = generateAvailableSlots({
      ...baseParams,
      sessionType: {
        durationMinutes: 60,
        beforeBufferMinutes: 15,
        afterBufferMinutes: 15,
        minimumBookingNoticeHours: 24,
      },
      existingBookings: [
        { date: "2026-07-27", startTime: "11:00", endTime: "11:30" },
        { date: "2026-07-27", startTime: "14:00", endTime: "14:30" },
      ],
    });
    expect(slots.map((s) => [s.startTime, s.endTime])).toEqual([
      ["12:00", "13:00"],
      ["15:00", "16:00"],
      ["16:30", "17:30"],
    ]);
  });

  it("offers nothing when every free interval is shorter than the footprint", () => {
    // Footprints 11:30-14:30 and 15:00-18:00 leave 10:00-11:30 (90 min) and
    // 14:30-15:00 (30 min) — neither fits the 180-minute footprint.
    const slots = generateAvailableSlots({
      ...baseParams,
      existingBookings: [
        { date: "2026-07-27", startTime: "12:00", endTime: "14:00" },
        { date: "2026-07-27", startTime: "15:30", endTime: "17:30" },
      ],
    });
    expect(slots).toEqual([]);
  });

  it("re-anchors after a block override the same way as after a booking", () => {
    // A 12:00-14:00 block leaves 14:00-18:00 free → a 14:30 start fits.
    const slots = generateAvailableSlots({
      ...baseParams,
      overrides: [
        {
          date: "2026-07-27",
          type: "block",
          startTime: "12:00",
          endTime: "14:00",
        },
      ],
    });
    expect(slots.map((s) => [s.startTime, s.endTime])).toEqual([
      ["14:30", "16:30"],
    ]);
  });

  it("starts the grid at the notice cutoff instead of the range start", () => {
    // Notice expires 12:10 Phoenix, mid-range. Anchoring to 10:00 would skip
    // the 10:30 slot and offer only 13:30, stranding an hour and a half.
    const slots = generateAvailableSlots({
      ...baseParams,
      sessionType: { ...STANDARD_SESSION, minimumBookingNoticeHours: 0 },
      nowEpochMs: new Date("2026-07-27T19:10:00Z").getTime(), // 12:10 MST
    });
    expect(slots.map((s) => s.startTime)).toEqual(["12:15", "15:15"]);
  });

  it("keeps every remaining slot bookable when the day is already split", () => {
    // #151's invariant, re-checked on a re-anchored grid: booking any offered
    // slot must remove exactly that slot and leave the others untouched.
    const params: GenerateSlotsParams = {
      ...baseParams,
      sessionType: {
        durationMinutes: 60,
        beforeBufferMinutes: 15,
        afterBufferMinutes: 15,
        minimumBookingNoticeHours: 24,
      },
      existingBookings: [
        { date: "2026-07-27", startTime: "11:00", endTime: "11:30" },
      ],
    };
    const slots = generateAvailableSlots(params);
    expect(slots.length).toBeGreaterThan(1);

    for (const booked of slots) {
      const remaining = generateAvailableSlots({
        ...params,
        existingBookings: [
          ...params.existingBookings,
          {
            date: booked.date,
            startTime: booked.startTime,
            endTime: booked.endTime,
          },
        ],
      });
      expect(remaining).toEqual(
        slots.filter((s) => s.startTime !== booked.startTime),
      );
    }
  });
});

// ─── #162: slot granularity aligns starts to the artist's own grid ─────

describe("generateAvailableSlots slot granularity", () => {
  const baseParams: GenerateSlotsParams = {
    schedule: STANDARD_SCHEDULE,
    overrides: [],
    sessionType: STANDARD_SESSION,
    nowEpochMs: NOW_MS,
    startDate: "2026-07-27", // Monday
    endDate: "2026-07-27",
    // An off-grid booking: footprint 10:30-12:37 leaves free time starting at
    // an awkward 12:37, which would otherwise surface as a 13:07 start.
    existingBookings: [
      { date: "2026-07-27", startTime: "11:00", endTime: "12:07" },
    ],
  };

  it("rounds an off-grid start up to the default 15-minute grid", () => {
    const slots = generateAvailableSlots(baseParams);
    expect(slots.map((s) => [s.startTime, s.endTime])).toEqual([
      ["13:15", "15:15"],
    ]);
  });

  it("honours a coarser granularity", () => {
    const slots = generateAvailableSlots({
      ...baseParams,
      slotGranularityMinutes: 60,
    });
    expect(slots.map((s) => [s.startTime, s.endTime])).toEqual([
      ["14:00", "16:00"],
    ]);
  });

  it("offers the exact free-interval start when granularity is 1 minute", () => {
    const slots = generateAvailableSlots({
      ...baseParams,
      slotGranularityMinutes: 1,
    });
    expect(slots.map((s) => [s.startTime, s.endTime])).toEqual([
      ["13:07", "15:07"],
    ]);
  });

  it("falls back to the default when granularity is not a positive number", () => {
    for (const bad of [0, -15, NaN]) {
      const slots = generateAvailableSlots({
        ...baseParams,
        slotGranularityMinutes: bad,
      });
      expect(slots.map((s) => s.startTime)).toEqual(["13:15"]);
    }
  });

  it("never lets granularity push a footprint past its free interval", () => {
    // Whatever the grid, an offered slot's whole footprint stays inside the
    // artist's open hours and clear of the booking.
    for (const granularity of [1, 5, 15, 30, 60]) {
      const slots = generateAvailableSlots({
        ...baseParams,
        slotGranularityMinutes: granularity,
      });
      for (const slot of slots) {
        const footprintStart =
          parseTimeToMinutes(slot.startTime) - STANDARD_SESSION.beforeBufferMinutes;
        const footprintEnd =
          parseTimeToMinutes(slot.endTime) + STANDARD_SESSION.afterBufferMinutes;
        expect(footprintStart).toBeGreaterThanOrEqual(parseTimeToMinutes("10:00"));
        expect(footprintEnd).toBeLessThanOrEqual(parseTimeToMinutes("18:00"));
        // Booking footprint is 10:30-12:37.
        expect(footprintStart).toBeGreaterThanOrEqual(parseTimeToMinutes("12:37"));
      }
    }
  });
});

// ─── #152: DST correctness (America/Denver observes DST) ──────────────

describe("generateAvailableSlots across DST transitions", () => {
  const DENVER_SCHEDULE: WeeklySchedule = {
    ...EMPTY_SCHEDULE,
    // Both 2026 US transitions fall on a Sunday.
    sunday: [{ start: "00:30", end: "06:00" }],
    timezone: "America/Denver",
  };

  const dstParams: GenerateSlotsParams = {
    schedule: DENVER_SCHEDULE,
    overrides: [],
    sessionType: STANDARD_SESSION,
    existingBookings: [],
    nowEpochMs: new Date("2026-01-01T00:00:00Z").getTime(),
    startDate: "2026-03-08",
    endDate: "2026-03-08",
  };

  it("measures session duration in real elapsed time across spring-forward", () => {
    // 2026-03-08: 02:00 MST jumps to 03:00 MDT, so the open window
    // 00:30-06:00 is only 4h30m of real time.
    const slots = generateAvailableSlots(dstParams);
    // 01:00 + 120 real minutes lands on 04:00 wall clock, not 03:00.
    expect(slots.map((s) => [s.date, s.startTime, s.endTime])).toEqual([
      ["2026-03-08", "01:00", "04:00"],
    ]);
  });

  it("measures session duration in real elapsed time across fall-back", () => {
    // 2026-11-01: 02:00 MDT falls back to 01:00 MST, so the open window
    // 00:30-06:00 is 6h30m of real time.
    const slots = generateAvailableSlots({
      ...dstParams,
      startDate: "2026-11-01",
      endDate: "2026-11-01",
      nowEpochMs: new Date("2026-10-01T00:00:00Z").getTime(),
    });
    // 01:00 + 120 real minutes lands on 02:00 wall clock, not 03:00.
    expect(slots.map((s) => [s.date, s.startTime, s.endTime])).toEqual([
      ["2026-11-01", "01:00", "02:00"],
      ["2026-11-01", "03:00", "05:00"],
    ]);
  });
});
