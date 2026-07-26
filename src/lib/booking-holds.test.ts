import { describe, it, expect } from "vitest";
import {
  HOLD_TTL_MINUTES,
  holdExpiresAt,
  isHoldLive,
  liveHolds,
  holdsAsExistingBookings,
  requestHold,
  releaseExpired,
  releaseHold,
  convertHold,
  resolvePaidHold,
  type Hold,
  type HeldSlot,
} from "./booking-holds";

const TZ = "America/Phoenix";
// 2026-08-03T10:00 Phoenix (UTC-7, no DST) => 17:00 UTC
const NOW = Date.parse("2026-08-03T17:00:00.000Z");
const MINUTE = 60_000;

const SLOT: HeldSlot = {
  date: "2026-08-06",
  startTime: "14:00",
  endTime: "16:00",
  timezone: TZ,
};

function hold(over: Partial<Hold> = {}): Hold {
  return {
    holdId: "hold_1",
    artistId: "artist_a",
    bookingId: "BK-AAA",
    ...SLOT,
    createdAt: new Date(NOW).toISOString(),
    expiresAt: holdExpiresAt(NOW),
    status: "active",
    ...over,
  };
}

describe("hold lifetime", () => {
  it("expires HOLD_TTL_MINUTES after it is taken", () => {
    expect(Date.parse(holdExpiresAt(NOW)) - NOW).toBe(HOLD_TTL_MINUTES * MINUTE);
  });

  it("is exactly 30 minutes — Stripe Checkout's minimum expires_at", () => {
    // The hold and the Checkout Session must expire together. Stripe refuses an
    // expires_at less than 30 minutes out, so a shorter hold would leave a
    // window where a payable session outlives the reservation behind it.
    expect(HOLD_TTL_MINUTES).toBe(30);
  });

  it("is live before expiry and dead after", () => {
    const h = hold();
    expect(isHoldLive(h, NOW)).toBe(true);
    expect(isHoldLive(h, NOW + 29 * MINUTE)).toBe(true);
    expect(isHoldLive(h, NOW + 30 * MINUTE)).toBe(false);
    expect(isHoldLive(h, NOW + 31 * MINUTE)).toBe(false);
  });

  it("is never live once released or converted", () => {
    expect(isHoldLive(hold({ status: "released" }), NOW)).toBe(false);
    expect(isHoldLive(hold({ status: "converted" }), NOW)).toBe(false);
  });

  it("treats an unparseable expiry as dead, not as forever", () => {
    expect(isHoldLive(hold({ expiresAt: "whenever" }), NOW)).toBe(false);
  });
});

describe("a hold blocks a second booker", () => {
  it("refuses the identical slot while the first hold is live", () => {
    const first = requestHold({
      existing: [],
      artistId: "artist_a",
      bookingId: "BK-AAA",
      slot: SLOT,
      nowMs: NOW,
      holdId: "hold_1",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = requestHold({
      existing: [first.hold],
      artistId: "artist_a",
      bookingId: "BK-BBB",
      slot: SLOT,
      nowMs: NOW + MINUTE,
      holdId: "hold_2",
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("slot_held");
  });

  it("refuses a merely OVERLAPPING slot, not just an identical one", () => {
    // A 2h hold at 14:00 must block a 1h request at 15:00 — a slot that starts
    // inside someone else's reservation is the same double-booking bug.
    const existing = [hold()];
    const overlapping = requestHold({
      existing,
      artistId: "artist_a",
      bookingId: "BK-BBB",
      slot: { ...SLOT, startTime: "15:00", endTime: "16:00" },
      nowMs: NOW,
      holdId: "hold_2",
    });
    expect(overlapping.ok).toBe(false);
  });

  it("allows a slot that merely touches the held one (half-open ranges)", () => {
    const existing = [hold()];
    const abutting = requestHold({
      existing,
      artistId: "artist_a",
      bookingId: "BK-BBB",
      slot: { ...SLOT, startTime: "16:00", endTime: "17:00" },
      nowMs: NOW,
      holdId: "hold_2",
    });
    expect(abutting.ok).toBe(true);
  });

  it("does not let one artist's hold block another artist's slot", () => {
    const existing = [hold({ artistId: "artist_a" })];
    const other = requestHold({
      existing,
      artistId: "artist_b",
      bookingId: "BK-BBB",
      slot: SLOT,
      nowMs: NOW,
      holdId: "hold_2",
    });
    expect(other.ok).toBe(true);
  });

  it("lets the SAME booking re-take its own slot (idempotent refresh)", () => {
    const existing = [hold({ bookingId: "BK-AAA" })];
    const again = requestHold({
      existing,
      artistId: "artist_a",
      bookingId: "BK-AAA",
      slot: SLOT,
      nowMs: NOW + MINUTE,
      holdId: "hold_2",
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    // A refresh extends the window from the moment it is refreshed.
    expect(Date.parse(again.hold.expiresAt)).toBe(
      NOW + MINUTE + HOLD_TTL_MINUTES * MINUTE,
    );
  });

  it("rejects a malformed slot rather than holding nothing", () => {
    const bad = requestHold({
      existing: [],
      artistId: "artist_a",
      bookingId: "BK-AAA",
      slot: { ...SLOT, startTime: "25:99" },
      nowMs: NOW,
      holdId: "hold_1",
    });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.reason).toBe("invalid_slot");
  });

  it("rejects a slot whose end is not after its start", () => {
    const bad = requestHold({
      existing: [],
      artistId: "artist_a",
      bookingId: "BK-AAA",
      slot: { ...SLOT, startTime: "16:00", endTime: "16:00" },
      nowMs: NOW,
      holdId: "hold_1",
    });
    expect(bad.ok).toBe(false);
  });

  it("rejects a hold on a slot that has already started", () => {
    const bad = requestHold({
      existing: [],
      artistId: "artist_a",
      bookingId: "BK-AAA",
      slot: { ...SLOT, date: "2026-08-03", startTime: "09:00", endTime: "11:00" },
      nowMs: NOW,
      holdId: "hold_1",
    });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.reason).toBe("in_the_past");
  });
});

describe("hold expiry releases the slot", () => {
  it("lets a second booker take the slot once the first hold lapses", () => {
    const first = hold({ bookingId: "BK-AAA" });
    const afterExpiry = NOW + (HOLD_TTL_MINUTES + 1) * MINUTE;

    // Still blocked one minute before expiry...
    const tooSoon = requestHold({
      existing: [first],
      artistId: "artist_a",
      bookingId: "BK-BBB",
      slot: SLOT,
      nowMs: NOW + (HOLD_TTL_MINUTES - 1) * MINUTE,
      holdId: "hold_2",
    });
    expect(tooSoon.ok).toBe(false);

    // ...and free afterwards, with no sweep having run. Expiry is decided by
    // the clock, not by a job: a stuck cron must never keep a slot hostage.
    const second = requestHold({
      existing: [first],
      artistId: "artist_a",
      bookingId: "BK-BBB",
      slot: SLOT,
      nowMs: afterExpiry,
      holdId: "hold_2",
    });
    expect(second.ok).toBe(true);
  });

  it("drops expired holds out of the live set", () => {
    const holds = [
      hold({ holdId: "live", expiresAt: new Date(NOW + 10 * MINUTE).toISOString() }),
      hold({ holdId: "dead", expiresAt: new Date(NOW - MINUTE).toISOString() }),
    ];
    expect(liveHolds(holds, NOW).map((h) => h.holdId)).toEqual(["live"]);
  });

  it("marks expired holds released and names them, leaving live ones alone", () => {
    const holds = [
      hold({ holdId: "live", expiresAt: new Date(NOW + 10 * MINUTE).toISOString() }),
      hold({ holdId: "dead", expiresAt: new Date(NOW - MINUTE).toISOString() }),
      hold({ holdId: "already", status: "released" }),
    ];
    const { holds: swept, releasedIds } = releaseExpired(holds, NOW);
    expect(releasedIds).toEqual(["dead"]);
    expect(swept.find((h) => h.holdId === "dead")?.status).toBe("released");
    expect(swept.find((h) => h.holdId === "live")?.status).toBe("active");
    expect(swept).not.toBe(holds); // never mutates
    expect(holds[1].status).toBe("active");
  });
});

describe("holds hide slots from everyone else's grid", () => {
  it("renders live holds as existing bookings for the slot engine", () => {
    const holds = [
      hold({ holdId: "live" }),
      hold({ holdId: "dead", expiresAt: new Date(NOW - MINUTE).toISOString() }),
    ];
    expect(holdsAsExistingBookings(holds, NOW)).toEqual([
      { date: "2026-08-06", startTime: "14:00", endTime: "16:00", timezone: TZ },
    ]);
  });

  it("shows a booking its OWN held slot so it can still check out", () => {
    const holds = [hold({ bookingId: "BK-AAA" })];
    expect(
      holdsAsExistingBookings(holds, NOW, { excludeBookingId: "BK-AAA" }),
    ).toEqual([]);
    expect(
      holdsAsExistingBookings(holds, NOW, { excludeBookingId: "BK-BBB" }),
    ).toHaveLength(1);
  });
});

describe("release, convert, and the paid-after-expiry race", () => {
  it("releases a hold without touching the input", () => {
    const h = hold();
    const released = releaseHold(h);
    expect(released.status).toBe("released");
    expect(h.status).toBe("active");
  });

  it("converts a hold on payment", () => {
    expect(convertHold(hold()).status).toBe("converted");
  });

  it("confirms a payment that landed inside the hold window", () => {
    expect(resolvePaidHold(hold(), NOW + MINUTE)).toBe("confirm");
  });

  it("confirms a payment on a hold already converted (duplicate webhook)", () => {
    expect(resolvePaidHold(hold({ status: "converted" }), NOW + MINUTE)).toBe(
      "confirm",
    );
  });

  it("flags a payment that landed after the hold lapsed as slot_lost", () => {
    // Stripe's expires_at should make this unreachable, but money arriving for
    // a slot we no longer hold must refund, never silently double-book.
    expect(resolvePaidHold(hold(), NOW + (HOLD_TTL_MINUTES + 1) * MINUTE)).toBe(
      "slot_lost",
    );
  });

  it("flags a payment against a released hold as slot_lost", () => {
    expect(resolvePaidHold(hold({ status: "released" }), NOW + MINUTE)).toBe(
      "slot_lost",
    );
  });
});
