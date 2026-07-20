import { describe, it, expect } from "vitest";
import {
  availabilityLabel,
  defaultAvailability,
  depositForSize,
  normalizeAvailability,
  normalizeRequestedSlots,
  validateBookingRequest,
  MAX_REQUESTED_SLOTS,
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

describe("depositForSize", () => {
  it("maps sizes and falls back to medium", () => {
    expect(depositForSize("small")).toBe(75);
    expect(depositForSize("SLEEVE")).toBe(500);
    expect(depositForSize("gigantic")).toBe(150);
    expect(depositForSize(undefined)).toBe(150);
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
