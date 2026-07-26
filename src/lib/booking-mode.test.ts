import { describe, it, expect } from "vitest";
import {
  resolveBookingMode,
  isReservation,
  type BookingModeInput,
} from "./booking-mode";
import { MAX_SYNC_AGE_MINUTES } from "./artist-calendar";

const NOW = Date.parse("2026-08-03T17:00:00.000Z");
const MINUTE = 60_000;

const CONNECTED = {
  artistId: "artist_a",
  calendarId: "artist@example.com",
  connectedAt: "2026-07-01T00:00:00.000Z",
  scopes: ["https://www.googleapis.com/auth/calendar.freebusy"],
  writeEnabled: false,
};

/** The happy path: claimed artist, live calendar read, holds writable. */
function synced(over: Partial<BookingModeInput> = {}): BookingModeInput {
  return {
    artistId: "artist_a",
    claimed: true,
    connection: CONNECTED,
    calendar: { ok: true, busy: [], fetchedAtMs: NOW },
    holdsWritable: true,
    nowMs: NOW,
    ...over,
  };
}

describe("reservation is granted only when everything holds", () => {
  it("returns reservation when the calendar is synced and holds are writable", () => {
    const d = resolveBookingMode(synced());
    expect(d.mode).toBe("reservation");
    expect(d.reason).toBe("calendar_synced");
    expect(isReservation(d)).toBe(true);
  });

  it("never claims a reservation without a live read, whatever else is true", () => {
    // The exhaustive statement of the rule: every single input that is not the
    // full happy path must come back "request".
    const degraded: Array<Partial<BookingModeInput>> = [
      { claimed: false },
      { connection: null },
      { calendar: null },
      { calendar: { ok: false, reason: "unreachable" } },
      { calendar: { ok: false, reason: "unauthorized" } },
      { calendar: { ok: false, reason: "calendar_error" } },
      { calendar: { ok: false, reason: "not_configured" } },
      { calendar: { ok: false, reason: "not_connected" } },
      { holdsWritable: false },
      { calendar: { ok: true, busy: [], fetchedAtMs: NOW - 60 * MINUTE } },
    ];
    for (const patch of degraded) {
      const d = resolveBookingMode(synced(patch));
      expect(d.mode, `${JSON.stringify(patch)} must degrade`).toBe("request");
    }
  });
});

describe("an artist with no calendar gets the request model", () => {
  it("degrades with reason no_calendar", () => {
    const d = resolveBookingMode(synced({ connection: null }));
    expect(d.mode).toBe("request");
    expect(d.reason).toBe("no_calendar");
  });

  it("says 'availability on request' and never implies a held time", () => {
    const d = resolveBookingMode(synced({ connection: null }));
    expect(d.label).toBe("Availability on request");
    expect(d.detail.toLowerCase()).not.toContain("reserv");
    expect(d.detail.toLowerCase()).not.toContain("confirmed");
  });

  it("does not nag the artist — most artists will never connect one", () => {
    // This is the permanent, correct state for the ~10k scraped artists, not a
    // fault to be fixed. Only a BROKEN connection asks the artist to act.
    expect(resolveBookingMode(synced({ connection: null })).artistActionRequired).toBe(
      false,
    );
  });

  it("degrades an unclaimed artist even if a connection somehow exists", () => {
    // Ops must not be able to put an artist into reservation mode on their
    // behalf. A slot calendar backed by someone else's guess is a fake slot.
    const d = resolveBookingMode(synced({ claimed: false }));
    expect(d.mode).toBe("request");
    expect(d.reason).toBe("not_claimed");
  });

  it("degrades a connection the artist has disconnected", () => {
    const d = resolveBookingMode(
      synced({ connection: { ...CONNECTED, revokedAt: "2026-08-01T00:00:00.000Z" } }),
    );
    expect(d.mode).toBe("request");
    expect(d.reason).toBe("no_calendar");
    // Disconnecting is not an error state — it must not shout at the artist.
    expect(d.artistActionRequired).toBe(false);
  });
});

describe("an unreachable calendar falls back to the request model", () => {
  it("degrades rather than serving the artist's declared windows unfiltered", () => {
    const d = resolveBookingMode(
      synced({ calendar: { ok: false, reason: "unreachable" } }),
    );
    expect(d.mode).toBe("request");
    expect(d.reason).toBe("calendar_unreachable");
    expect(d.label).toBe("Availability on request");
  });

  it("shows the client the same honest label as an artist with no calendar", () => {
    // A client must never be able to tell "this artist has no calendar" from
    // "this artist's calendar is down" by the promise being made to them. Both
    // promise the same thing: a request, answered by a human.
    const down = resolveBookingMode(
      synced({ calendar: { ok: false, reason: "unreachable" } }),
    );
    const none = resolveBookingMode(synced({ connection: null }));
    expect(down.label).toBe(none.label);
    expect(down.detail).toBe(none.detail);
  });

  it("does not blame the artist for an outage on our side", () => {
    expect(
      resolveBookingMode(synced({ calendar: { ok: false, reason: "unreachable" } }))
        .artistActionRequired,
    ).toBe(false);
  });

  it("asks the artist to reconnect when the grant was revoked", () => {
    const d = resolveBookingMode(
      synced({ calendar: { ok: false, reason: "unauthorized" } }),
    );
    expect(d.mode).toBe("request");
    expect(d.reason).toBe("calendar_unauthorized");
    expect(d.artistActionRequired).toBe(true);
  });

  it("degrades when we never attempted a read at all", () => {
    // A caller that forgot to fetch must not accidentally get reservation mode.
    const d = resolveBookingMode(synced({ calendar: null }));
    expect(d.mode).toBe("request");
    expect(d.reason).toBe("calendar_unreachable");
  });

  it("degrades when no Google client is configured on this deployment", () => {
    const d = resolveBookingMode(
      synced({ calendar: { ok: false, reason: "not_configured" } }),
    );
    expect(d.mode).toBe("request");
    expect(d.reason).toBe("not_configured");
  });
});

describe("a stale read is treated as no calendar", () => {
  it("accepts a read inside the freshness budget", () => {
    const d = resolveBookingMode(
      synced({
        calendar: {
          ok: true,
          busy: [],
          fetchedAtMs: NOW - (MAX_SYNC_AGE_MINUTES - 1) * MINUTE,
        },
      }),
    );
    expect(d.mode).toBe("reservation");
  });

  it("refuses a read older than the freshness budget", () => {
    // Yesterday's free/busy is a guess about today. Serving it would show slots
    // the artist has since filled — the one failure this whole design exists to
    // prevent.
    const d = resolveBookingMode(
      synced({
        calendar: {
          ok: true,
          busy: [],
          fetchedAtMs: NOW - (MAX_SYNC_AGE_MINUTES + 1) * MINUTE,
        },
      }),
    );
    expect(d.mode).toBe("request");
    expect(d.reason).toBe("sync_stale");
  });

  it("refuses a read stamped in the future", () => {
    const d = resolveBookingMode(
      synced({ calendar: { ok: true, busy: [], fetchedAtMs: NOW + 5 * MINUTE } }),
    );
    expect(d.mode).toBe("request");
    expect(d.reason).toBe("sync_stale");
  });
});

describe("holds are a prerequisite, not a detail", () => {
  it("refuses reservation mode when a hold cannot be written", () => {
    // Offering slots we cannot reserve is the double-booking bug with a
    // calendar bolted on. Without a writable hold store there is no
    // reservation, however good the calendar data is.
    const d = resolveBookingMode(synced({ holdsWritable: false }));
    expect(d.mode).toBe("request");
    expect(d.reason).toBe("holds_unavailable");
  });
});

describe("copy never overstates", () => {
  it("only the reservation label mentions holding a time", () => {
    const reservation = resolveBookingMode(synced());
    expect(reservation.label).toBe("Live calendar");
    expect(reservation.detail.toLowerCase()).toContain("hold");
  });

  it("every request-mode reason produces the identical client-facing promise", () => {
    const patches: Array<Partial<BookingModeInput>> = [
      { connection: null },
      { claimed: false },
      { calendar: { ok: false, reason: "unreachable" } },
      { calendar: { ok: false, reason: "unauthorized" } },
      { calendar: { ok: false, reason: "calendar_error" } },
      { holdsWritable: false },
      { calendar: { ok: true, busy: [], fetchedAtMs: 0 } },
    ];
    const promises = new Set(
      patches.map((p) => {
        const d = resolveBookingMode(synced(p));
        return `${d.label}|${d.detail}`;
      }),
    );
    // Why the artist is on the request model is TatT's business. What the
    // client is promised must be one sentence, always the same one.
    expect(promises.size).toBe(1);
  });
});
