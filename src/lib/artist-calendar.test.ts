import { describe, it, expect, vi } from "vitest";
import {
  SCOPE_FREEBUSY,
  SCOPE_APP_CREATED,
  MAX_SYNC_AGE_MINUTES,
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  fetchFreeBusy,
  filterSlotsByBusy,
  buildBookingEvent,
  writeBookingEvent,
  type BusyInterval,
} from "./artist-calendar";
import type { Slot } from "./scheduling-engine";

const CREDS = {
  clientId: "client-123.apps.googleusercontent.com",
  clientSecret: "secret-xyz",
  redirectUri: "https://tatt.example/api/v1/artist/calendar/callback",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("scopes", () => {
  it("reads availability with freebusy only — never the events themselves", () => {
    // freebusy returns busy time ranges with no titles, attendees, locations or
    // descriptions. It is the narrowest scope that answers "when are they
    // busy?", and it is the whole trust story for asking a working artist to
    // connect a personal calendar.
    expect(SCOPE_FREEBUSY).toBe(
      "https://www.googleapis.com/auth/calendar.freebusy",
    );
  });

  it("writes only to calendars this app created", () => {
    // calendar.app.created cannot see or touch the artist's existing calendars
    // at all — only secondary calendars TatT itself made. The alternative,
    // calendar.events, grants read+write across every calendar they own.
    expect(SCOPE_APP_CREATED).toBe(
      "https://www.googleapis.com/auth/calendar.app.created",
    );
  });

  it("asks for read access only by default", () => {
    const url = new URL(buildAuthorizeUrl({ ...CREDS, state: "s" }));
    expect(url.searchParams.get("scope")).toBe(SCOPE_FREEBUSY);
  });

  it("adds the write scope only when write-back is explicitly requested", () => {
    const url = new URL(
      buildAuthorizeUrl({ ...CREDS, state: "s", includeWrite: true }),
    );
    expect(url.searchParams.get("scope")).toBe(
      `${SCOPE_FREEBUSY} ${SCOPE_APP_CREATED}`,
    );
  });

  it("requests offline access with consent so a refresh token comes back", () => {
    const url = new URL(buildAuthorizeUrl({ ...CREDS, state: "s" }));
    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("state")).toBe("s");
    expect(url.searchParams.get("redirect_uri")).toBe(CREDS.redirectUri);
    expect(url.searchParams.get("response_type")).toBe("code");
  });
});

describe("token exchange", () => {
  it("returns the refresh token and the granted scopes", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        access_token: "at-1",
        refresh_token: "rt-1",
        expires_in: 3599,
        scope: SCOPE_FREEBUSY,
      }),
    );
    const res = await exchangeCodeForTokens({
      ...CREDS,
      code: "auth-code",
      fetchImpl,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.tokens.refreshToken).toBe("rt-1");
    expect(res.tokens.accessToken).toBe("at-1");
    expect(res.tokens.scopes).toEqual([SCOPE_FREEBUSY]);
  });

  it("fails when Google returns no refresh token", async () => {
    // Without one we cannot read availability tomorrow, and a connection that
    // silently dies in an hour is worse than no connection.
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ access_token: "at-1", expires_in: 3599 }),
    );
    const res = await exchangeCodeForTokens({
      ...CREDS,
      code: "auth-code",
      fetchImpl,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("no_refresh_token");
  });

  it("fails cleanly when Google rejects the code", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: "invalid_grant" }, 400),
    );
    const res = await exchangeCodeForTokens({
      ...CREDS,
      code: "bad",
      fetchImpl,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("unauthorized");
  });

  it("never puts the client secret in a URL", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ access_token: "a", refresh_token: "r", expires_in: 60 }),
    );
    await exchangeCodeForTokens({ ...CREDS, code: "c", fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain(CREDS.clientSecret);
    expect(String(init.body)).toContain("client_secret");
  });
});

describe("access-token refresh", () => {
  it("exchanges a refresh token for an access token", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ access_token: "at-2", expires_in: 3599 }),
    );
    const res = await refreshAccessToken({
      ...CREDS,
      refreshToken: "rt-1",
      fetchImpl,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.accessToken).toBe("at-2");
  });

  it("reports a revoked refresh token as unauthorized, not unreachable", async () => {
    // The artist revoked us in their Google account. This must degrade them to
    // the request model AND tell them to reconnect — retrying forever is wrong.
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: "invalid_grant" }, 400),
    );
    const res = await refreshAccessToken({
      ...CREDS,
      refreshToken: "dead",
      fetchImpl,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("unauthorized");
  });

  it("reports a network failure as unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    const res = await refreshAccessToken({
      ...CREDS,
      refreshToken: "rt-1",
      fetchImpl,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("unreachable");
  });
});

describe("revocation", () => {
  it("posts the token to Google's revoke endpoint", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 200 }));
    expect(await revokeToken({ token: "rt-1", fetchImpl })).toBe(true);
    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toBe("https://oauth2.googleapis.com/revoke");
  });

  it("treats an already-dead token as successfully revoked", async () => {
    // Disconnect must always work locally. If Google says the token is already
    // gone, the artist's intent is satisfied — never leave them stuck connected.
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: "invalid_token" }, 400),
    );
    expect(await revokeToken({ token: "dead", fetchImpl })).toBe(true);
  });

  it("reports a network failure so the caller can log it", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await revokeToken({ token: "rt-1", fetchImpl })).toBe(false);
  });
});

describe("free/busy read", () => {
  const args = {
    accessToken: "at-1",
    calendarId: "artist@example.com",
    timeMinMs: Date.parse("2026-08-03T00:00:00.000Z"),
    timeMaxMs: Date.parse("2026-08-10T00:00:00.000Z"),
  };

  it("parses busy ranges into epoch intervals", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        calendars: {
          "artist@example.com": {
            busy: [
              { start: "2026-08-06T21:00:00Z", end: "2026-08-06T23:00:00Z" },
            ],
          },
        },
      }),
    );
    const res = await fetchFreeBusy({ ...args, fetchImpl, nowMs: 1 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.busy).toEqual([
      {
        startMs: Date.parse("2026-08-06T21:00:00Z"),
        endMs: Date.parse("2026-08-06T23:00:00Z"),
      },
    ]);
  });

  it("drops malformed busy entries rather than failing the whole read", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        calendars: {
          "artist@example.com": {
            busy: [
              { start: "nonsense", end: "2026-08-06T23:00:00Z" },
              { start: "2026-08-06T21:00:00Z", end: "2026-08-06T23:00:00Z" },
            ],
          },
        },
      }),
    );
    const res = await fetchFreeBusy({ ...args, fetchImpl, nowMs: 1 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.busy).toHaveLength(1);
  });

  it("fails when Google reports an error for that calendar", async () => {
    // A 200 with a per-calendar error means we do NOT know when they are busy.
    // Reading it as "no busy time" would offer every slot the artist listed.
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        calendars: {
          "artist@example.com": { errors: [{ reason: "notFound" }], busy: [] },
        },
      }),
    );
    const res = await fetchFreeBusy({ ...args, fetchImpl, nowMs: 1 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("calendar_error");
  });

  it("fails when the calendar is missing from the response entirely", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ calendars: {} }));
    const res = await fetchFreeBusy({ ...args, fetchImpl, nowMs: 1 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("calendar_error");
  });

  it.each([
    [401, "unauthorized"],
    [403, "unauthorized"],
    [429, "unreachable"],
    [500, "unreachable"],
    [503, "unreachable"],
  ])("maps HTTP %i to %s", async (status, reason) => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "x" }, status));
    const res = await fetchFreeBusy({ ...args, fetchImpl, nowMs: 1 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe(reason);
  });

  it("maps a thrown network error to unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ETIMEDOUT");
    });
    const res = await fetchFreeBusy({ ...args, fetchImpl, nowMs: 1 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("unreachable");
  });

  it("stamps the read so staleness can be judged later", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ calendars: { "artist@example.com": { busy: [] } } }),
    );
    const res = await fetchFreeBusy({ ...args, fetchImpl, nowMs: 12345 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.fetchedAtMs).toBe(12345);
  });

  it("has a staleness budget short enough that a stale read is refused", () => {
    expect(MAX_SYNC_AGE_MINUTES).toBeLessThanOrEqual(15);
  });
});

describe("subtracting busy time from offered slots", () => {
  const TZ = "America/Phoenix"; // UTC-7 year round
  const slots: Slot[] = [
    { date: "2026-08-06", startTime: "10:00", endTime: "12:00", durationMinutes: 120 },
    { date: "2026-08-06", startTime: "14:00", endTime: "16:00", durationMinutes: 120 },
  ];

  it("keeps every slot when nothing is busy", () => {
    expect(filterSlotsByBusy(slots, [], TZ)).toEqual(slots);
  });

  it("drops a slot the artist is already busy for", () => {
    // 14:00-16:00 Phoenix == 21:00-23:00 UTC
    const busy: BusyInterval[] = [
      {
        startMs: Date.parse("2026-08-06T21:30:00Z"),
        endMs: Date.parse("2026-08-06T22:00:00Z"),
      },
    ];
    expect(filterSlotsByBusy(slots, busy, TZ)).toEqual([slots[0]]);
  });

  it("keeps a slot that merely abuts busy time", () => {
    const busy: BusyInterval[] = [
      {
        startMs: Date.parse("2026-08-06T23:00:00Z"),
        endMs: Date.parse("2026-08-07T00:00:00Z"),
      },
    ];
    expect(filterSlotsByBusy(slots, busy, TZ)).toEqual(slots);
  });

  it("drops a slot it cannot place in time rather than offering it blind", () => {
    const broken: Slot[] = [
      { date: "2026-08-06", startTime: "??", endTime: "12:00", durationMinutes: 120 },
    ];
    expect(filterSlotsByBusy(broken, [], TZ)).toEqual([]);
  });
});

describe("write-back", () => {
  const booking = {
    bookingId: "BK-AAA",
    clientName: "Sam",
    summaryDetail: "medium tattoo on forearm",
    slot: {
      date: "2026-08-06",
      startTime: "14:00",
      endTime: "16:00",
      timezone: "America/Phoenix",
    },
  };

  it("builds an event carrying the booking id and no client contact details", () => {
    const ev = buildBookingEvent(booking);
    expect(ev.summary).toContain("Sam");
    expect(ev.start).toEqual({
      dateTime: "2026-08-06T14:00:00",
      timeZone: "America/Phoenix",
    });
    expect(ev.end).toEqual({
      dateTime: "2026-08-06T16:00:00",
      timeZone: "America/Phoenix",
    });
    // The id is what makes a repeat write idempotent and a cancellation findable.
    expect(ev.extendedProperties?.private?.tattBookingId).toBe("BK-AAA");
  });

  it("refuses to write unless writes are explicitly enabled", async () => {
    const fetchImpl = vi.fn();
    const res = await writeBookingEvent({
      accessToken: "at-1",
      calendarId: "cal-1",
      event: buildBookingEvent(booking),
      writesEnabled: false,
      fetchImpl,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("writes_disabled");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts to the app-created calendar when writes are enabled", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: "ev-1" }, 200));
    const res = await writeBookingEvent({
      accessToken: "at-1",
      calendarId: "cal-1",
      event: buildBookingEvent(booking),
      writesEnabled: true,
      fetchImpl,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.eventId).toBe("ev-1");
    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toContain("/calendars/cal-1/events");
  });
});
