import { describe, it, expect } from "vitest";
import {
  availabilityLabel,
  defaultAvailability,
  depositCentsForSize,
  depositDollarsForSize,
  DEPOSIT_CENTS_BY_SIZE,
  normalizeAvailability,
  normalizeRequestedSlots,
  validateBookingRequest,
  MAX_REQUESTED_SLOTS,
  canTransition,
  appendStatus,
  sanitizeBooking,
  INITIAL_BOOKING_STATUS,
  type BookingStatus,
  type BookingStatusEvent,
} from "./booking";

describe("availability model", () => {
  it("defaults to unknown", () => {
    expect(defaultAvailability("artist_123")).toEqual({
      artistId: "artist_123",
      status: "unknown",
    });
  });

  it("collapses missing/malformed docs to unknown", () => {
    expect(normalizeAvailability("a", null).status).toBe("unknown");
    expect(normalizeAvailability("a", undefined).status).toBe("unknown");
    expect(normalizeAvailability("a", "open").status).toBe("unknown");
    expect(normalizeAvailability("a", { status: "definitely-free" }).status).toBe(
      "unknown",
    );
  });

  it("passes through valid docs with note + updatedAt", () => {
    const doc = {
      status: "waitlist",
      note: "  Books open March  ",
      updatedAt: "2026-07-01T00:00:00Z",
      junk: 42,
    };
    expect(normalizeAvailability("artist_9", doc)).toEqual({
      artistId: "artist_9",
      status: "waitlist",
      note: "Books open March",
      updatedAt: "2026-07-01T00:00:00Z",
    });
  });

  it("labels never fake certainty for unknown", () => {
    expect(availabilityLabel("unknown")).toBe("Availability on request");
    expect(availabilityLabel("open")).toBe("Taking bookings");
    expect(availabilityLabel("waitlist")).toBe("Waitlist only");
    expect(availabilityLabel("closed")).toBe("Books closed");
  });
});

describe("deposit ladder", () => {
  it("maps sizes to cents and falls back to medium", () => {
    expect(depositCentsForSize("small")).toBe(7500);
    expect(depositCentsForSize("SLEEVE")).toBe(50000);
    expect(depositCentsForSize("gigantic")).toBe(15000);
    expect(depositCentsForSize(undefined)).toBe(15000);
  });

  it("derives dollars from the same cents table", () => {
    expect(depositDollarsForSize("small")).toBe(75);
    expect(depositDollarsForSize("SLEEVE")).toBe(500);
    expect(depositDollarsForSize("gigantic")).toBe(150);
    expect(depositDollarsForSize(undefined)).toBe(150);
  });

  it("keeps every rung a whole number of cents", () => {
    for (const cents of Object.values(DEPOSIT_CENTS_BY_SIZE)) {
      expect(Number.isInteger(cents)).toBe(true);
      expect(cents).toBeGreaterThan(0);
    }
  });
});

describe("normalizeRequestedSlots", () => {
  it("returns [] for non-arrays", () => {
    expect(normalizeRequestedSlots(undefined)).toEqual([]);
    expect(normalizeRequestedSlots("2026-08-01")).toEqual([]);
    expect(normalizeRequestedSlots({ date: "2026-08-01" })).toEqual([]);
  });

  it("keeps valid slots and trims time", () => {
    expect(
      normalizeRequestedSlots([{ date: "2026-08-01", time: "  Afternoon " }]),
    ).toEqual([{ date: "2026-08-01", time: "Afternoon" }]);
  });

  it("drops malformed dates", () => {
    expect(
      normalizeRequestedSlots([
        { date: "08/01/2026" },
        { date: "2026-02-30" },
        { date: "2026-8-1" },
        { date: 20260801 },
        null,
        { date: "2026-08-02" },
      ]),
    ).toEqual([{ date: "2026-08-02" }]);
  });

  it("caps at MAX_REQUESTED_SLOTS", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-08-0${(i % 9) + 1}`,
    }));
    expect(normalizeRequestedSlots(many)).toHaveLength(MAX_REQUESTED_SLOTS);
  });

  it("omits empty time strings", () => {
    expect(normalizeRequestedSlots([{ date: "2026-08-01", time: "  " }])).toEqual([
      { date: "2026-08-01" },
    ]);
  });
});

describe("validateBookingRequest", () => {
  const valid = {
    clientName: "Sam C",
    clientEmail: "sam@example.com",
    description: "Fine line fern on the forearm",
    budget: "300-600",
  };

  it("rejects non-object bodies", () => {
    expect(validateBookingRequest(null).ok).toBe(false);
    expect(validateBookingRequest("hi").ok).toBe(false);
  });

  it("rejects when any required field is missing or blank", () => {
    for (const key of ["clientName", "clientEmail", "description", "budget"]) {
      const body: Record<string, unknown> = { ...valid, [key]: "   " };
      const result = validateBookingRequest(body);
      expect(result.ok, `expected invalid when ${key} is blank`).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("required");
      }
    }
  });

  it("accepts a minimal valid payload with no slots", () => {
    const result = validateBookingRequest(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.requestedSlots).toEqual([]);
      expect(result.value.artistId).toBeUndefined();
    }
  });

  it("carries artistId + normalized slots end-to-end", () => {
    const result = validateBookingRequest({
      ...valid,
      artistId: " artist_10021 ",
      artistName: "Rosa Ink",
      clientPhone: "555-0100",
      designId: "d1",
      requestedSlots: [
        { date: "2026-08-14", time: "Morning" },
        { date: "not-a-date" },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.artistId).toBe("artist_10021");
      expect(result.value.artistName).toBe("Rosa Ink");
      expect(result.value.requestedSlots).toEqual([
        { date: "2026-08-14", time: "Morning" },
      ]);
    }
  });

  it("accepts and trims a designSessionId", () => {
    const result = validateBookingRequest({
      ...valid,
      designSessionId: "  sess-abc123  ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.designSessionId).toBe("sess-abc123");
    }
  });

  it("drops non-string or blank designSessionId instead of failing", () => {
    for (const bad of [42, { id: "sess-1" }, ["sess-1"], true, "   ", null]) {
      const result = validateBookingRequest({ ...valid, designSessionId: bad });
      expect(result.ok, `expected valid with designSessionId ${JSON.stringify(bad)}`).toBe(true);
      if (result.ok) {
        expect(result.value.designSessionId).toBeUndefined();
      }
    }
  });

  it("leaves designSessionId undefined when absent", () => {
    const result = validateBookingRequest(valid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.designSessionId).toBeUndefined();
    }
  });

  it("truncates an oversized designSessionId to a sane length", () => {
    const result = validateBookingRequest({
      ...valid,
      designSessionId: "s".repeat(500),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.designSessionId).toHaveLength(120);
    }
  });

  it("truncates oversized fields instead of failing", () => {
    const result = validateBookingRequest({
      ...valid,
      description: "x".repeat(5000),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.description).toHaveLength(2000);
    }
  });
});

describe("booking lifecycle state machine", () => {
  const ALL: BookingStatus[] = [
    "pending",
    "deposit_paid",
    "confirmed",
    "declined",
    "completed",
    "cancelled",
    "refunded",
    "expired",
  ];

  const VALID_EDGES: Array<[BookingStatus, BookingStatus]> = [
    ["pending", "deposit_paid"],
    ["pending", "cancelled"],
    ["pending", "expired"],
    ["deposit_paid", "confirmed"],
    ["deposit_paid", "declined"],
    ["deposit_paid", "refunded"],
    ["deposit_paid", "cancelled"],
    ["confirmed", "completed"],
    ["confirmed", "cancelled"],
    ["confirmed", "refunded"],
    ["declined", "refunded"],
  ];

  const TERMINAL: BookingStatus[] = [
    "completed",
    "refunded",
    "cancelled",
    "expired",
  ];

  it("starts pending", () => {
    expect(INITIAL_BOOKING_STATUS).toBe("pending");
  });

  it("allows every valid edge", () => {
    for (const [from, to] of VALID_EDGES) {
      expect(canTransition(from, to), `${from} → ${to} should be allowed`).toBe(
        true,
      );
    }
  });

  it("rejects every edge not in the transition table", () => {
    const validSet = new Set(VALID_EDGES.map(([f, t]) => `${f}→${t}`));
    for (const from of ALL) {
      for (const to of ALL) {
        if (from === to) continue;
        const expected = validSet.has(`${from}→${to}`);
        expect(
          canTransition(from, to),
          `${from} → ${to} should be ${expected}`,
        ).toBe(expected);
      }
    }
  });

  it("rejects same-state transitions", () => {
    for (const s of ALL) {
      expect(canTransition(s, s), `${s} → ${s} should be false`).toBe(false);
    }
  });

  it("gives terminal states no outgoing transitions", () => {
    for (const from of TERMINAL) {
      for (const to of ALL) {
        expect(
          canTransition(from, to),
          `terminal ${from} → ${to} should be false`,
        ).toBe(false);
      }
    }
  });

  it("rejects unknown statuses", () => {
    expect(canTransition("bogus" as BookingStatus, "pending")).toBe(false);
    expect(canTransition("pending", "bogus" as BookingStatus)).toBe(false);
    expect(
      canTransition("bogus" as BookingStatus, "also-bogus" as BookingStatus),
    ).toBe(false);
  });
});

describe("appendStatus", () => {
  const event = (status: BookingStatus, by: string): BookingStatusEvent => ({
    status,
    at: "2026-07-21T00:00:00.000Z",
    by,
  });

  it("treats undefined history as empty", () => {
    const next = event("pending", "system");
    expect(appendStatus(undefined, next)).toEqual([next]);
  });

  it("appends to the end", () => {
    const first = event("pending", "system");
    const second = event("deposit_paid", "stripe-webhook");
    expect(appendStatus([first], second)).toEqual([first, second]);
  });

  it("does not mutate the input array", () => {
    const first = event("pending", "system");
    const history = [first];
    const result = appendStatus(history, event("deposit_paid", "stripe-webhook"));
    expect(history).toEqual([first]);
    expect(history).toHaveLength(1);
    expect(result).not.toBe(history);
  });
});

describe("sanitizeBooking", () => {
  it("strips the captured ip", () => {
    const doc = { id: "BK-1", size: "medium", ip: "203.0.113.7" };
    expect(sanitizeBooking(doc)).toEqual({ id: "BK-1", size: "medium" });
  });

  it("does not mutate the input doc", () => {
    const doc = { id: "BK-1", ip: "203.0.113.7" };
    sanitizeBooking(doc);
    expect(doc.ip).toBe("203.0.113.7");
  });

  it("passes docs without ip through unchanged", () => {
    const doc = { id: "BK-2", status: "deposit_paid" };
    expect(sanitizeBooking(doc)).toEqual(doc);
  });
});
