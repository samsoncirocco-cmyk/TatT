/**
 * Google Calendar connection for one artist — OAuth, free/busy, write-back.
 *
 * The model (ADR 0027):
 *   1. Each artist connects THEIR OWN Google account. Per-artist refresh
 *      tokens; there is no shared TatT calendar account anywhere in this file.
 *   2. The artist separately declares the availability they are willing to give
 *      TatT (`artist-availability.ts`) — TatT never offers their whole calendar.
 *   3. This module answers one question about the connected calendar: when are
 *      they busy? That is subtracted from the windows they offered.
 *
 * ── Scopes ────────────────────────────────────────────────────────────────
 * Read is `calendar.freebusy` and nothing else. The free/busy query returns
 * start/end pairs — no titles, attendees, locations, descriptions or
 * organisers. That is all the scheduling engine needs, and it is the difference
 * between asking a working artist for "when am I free" and asking for their
 * diary. `calendar.readonly` would hand us every event body on every calendar
 * they can see; we do not ask for it.
 *
 * Write, when an artist opts in, is `calendar.app.created`: access limited to
 * secondary calendars this app itself created. TatT makes a "TatT Bookings"
 * calendar in their account and can write only there. It cannot read, edit or
 * delete anything on their existing calendars. The obvious alternative,
 * `calendar.events`, grants read+write across every calendar they own — far
 * more power than writing our own bookings needs.
 *
 * Write-back is a SEPARATE consent (`includeWrite`), because an artist may
 * reasonably want us to see their availability and not to touch their calendar.
 *
 * ── Transport ─────────────────────────────────────────────────────────────
 * Plain `fetch` against Google's REST endpoints — no new dependency. The
 * `googleapis` client would bring a large transitive tree for four endpoints
 * we call by hand in ~40 lines. Every network call takes an injectable
 * `fetchImpl` so the whole module is testable without a token.
 *
 * ── Failure ───────────────────────────────────────────────────────────────
 * Nothing here throws on a bad answer. Every call returns a discriminated
 * result whose failure `reason` is what `booking-mode.ts` degrades on. An
 * unclassifiable outcome is a failure, never an empty-but-successful read:
 * "no busy time" and "we could not find out" must never be the same value,
 * because the first offers the artist's whole day to a stranger.
 */
import {
  epochMsToZonedDateTime,
  isValidTimeString,
  parseTimeToMinutes,
  timeOverlap,
  zonedMinutesToEpochMs,
  type Slot,
} from "./scheduling-engine";

// ─── Scopes ────────────────────────────────────────────────────────────

/** Busy time ranges only — no event contents. The default and usually the only scope. */
export const SCOPE_FREEBUSY = "https://www.googleapis.com/auth/calendar.freebusy";

/** Secondary calendars THIS app created, and nothing else. Opt-in write-back only. */
export const SCOPE_APP_CREATED =
  "https://www.googleapis.com/auth/calendar.app.created";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/**
 * How old a successful free/busy read may be and still support a reservation.
 *
 * Short on purpose. This is the window in which an artist could accept a
 * booking elsewhere without us noticing, and every minute of it is a minute we
 * might offer a slot they have just filled. Past this, the read is treated as
 * no calendar at all and the artist degrades to the request model.
 */
export const MAX_SYNC_AGE_MINUTES = 10;

// ─── Types ─────────────────────────────────────────────────────────────

/** A half-open interval on the absolute (UTC epoch ms) timeline. */
export interface BusyInterval {
  startMs: number;
  endMs: number;
}

export type CalendarFailureReason =
  /** No Google OAuth client configured on this deployment. */
  | "not_configured"
  /** This artist has never connected a calendar. */
  | "not_connected"
  /** Token rejected or revoked — the artist must reconnect. Do not retry. */
  | "unauthorized"
  /** Network error, rate limit, or Google 5xx. Transient; retry is fine. */
  | "unreachable"
  /** Google answered, but could not read that specific calendar. */
  | "calendar_error"
  /** The last successful read is too old to be trusted. */
  | "stale"
  /** Google returned no refresh token, so the connection could not persist. */
  | "no_refresh_token";

export type FreeBusyResult =
  | { ok: true; busy: BusyInterval[]; fetchedAtMs: number }
  | { ok: false; reason: CalendarFailureReason };

export interface OAuthTokens {
  refreshToken: string;
  accessToken: string;
  /** Absolute expiry of `accessToken`, epoch ms. */
  accessTokenExpiresAtMs: number;
  scopes: string[];
}

interface GoogleCreds {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

function defaultFetch(): FetchLike {
  return globalThis.fetch.bind(globalThis) as FetchLike;
}

/**
 * Classify an HTTP status.
 *
 * 5xx and 429 are transient — retry later, the grant is fine. Everything else
 * in the 4xx range means Google understood us and said no: a revoked grant, a
 * rejected code, an expired token. Those are `unauthorized`, because retrying
 * will never fix them and the artist has to reconnect. 404 is called out
 * separately: the grant is good, that particular calendar is not readable.
 */
function statusToReason(status: number): CalendarFailureReason {
  if (status >= 500 || status === 429) return "unreachable";
  if (status === 404) return "calendar_error";
  return "unauthorized";
}

// ─── OAuth ─────────────────────────────────────────────────────────────

/**
 * The consent URL the artist is sent to. `state` must be an unguessable value
 * bound to the artist and verified on the way back — it is the CSRF defence for
 * the callback.
 *
 * `access_type=offline` + `prompt=consent` is what makes Google return a
 * refresh token. Without `prompt=consent`, a returning artist who has already
 * granted consent gets an access token only, and the connection dies in an hour.
 */
export function buildAuthorizeUrl(
  input: GoogleCreds & { state: string; includeWrite?: boolean; loginHint?: string },
): string {
  const scopes = input.includeWrite
    ? `${SCOPE_FREEBUSY} ${SCOPE_APP_CREATED}`
    : SCOPE_FREEBUSY;
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: input.state,
  });
  if (input.loginHint) params.set("login_hint", input.loginHint);
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export type TokenExchangeResult =
  | { ok: true; tokens: OAuthTokens }
  | { ok: false; reason: CalendarFailureReason };

/** Swap the one-time authorization code for a refresh token. */
export async function exchangeCodeForTokens(
  input: GoogleCreds & { code: string; nowMs?: number; fetchImpl?: FetchLike },
): Promise<TokenExchangeResult> {
  const doFetch = input.fetchImpl ?? defaultFetch();
  const nowMs = input.nowMs ?? Date.now();
  let res: Response;
  try {
    res = await doFetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      // Credentials go in the body, never the query string: URLs end up in
      // access logs, proxies and browser history.
      body: new URLSearchParams({
        code: input.code,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
  } catch {
    return { ok: false, reason: "unreachable" };
  }

  if (!res.ok) return { ok: false, reason: statusToReason(res.status) };

  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "unreachable" };
  }

  const refreshToken = typeof body.refresh_token === "string" ? body.refresh_token : "";
  // No refresh token means the connection expires within the hour and cannot be
  // renewed. Better to fail the connect and tell the artist than to record a
  // connection that quietly stops working tomorrow.
  if (!refreshToken) return { ok: false, reason: "no_refresh_token" };

  const expiresInSec = typeof body.expires_in === "number" ? body.expires_in : 0;
  return {
    ok: true,
    tokens: {
      refreshToken,
      accessToken: typeof body.access_token === "string" ? body.access_token : "",
      accessTokenExpiresAtMs: nowMs + expiresInSec * 1000,
      scopes: typeof body.scope === "string" ? body.scope.split(" ").filter(Boolean) : [],
    },
  };
}

export type AccessTokenResult =
  | { ok: true; accessToken: string; expiresAtMs: number }
  | { ok: false; reason: CalendarFailureReason };

/** Mint a short-lived access token from a stored refresh token. */
export async function refreshAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  nowMs?: number;
  fetchImpl?: FetchLike;
}): Promise<AccessTokenResult> {
  const doFetch = input.fetchImpl ?? defaultFetch();
  const nowMs = input.nowMs ?? Date.now();
  let res: Response;
  try {
    res = await doFetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        refresh_token: input.refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  // A revoked grant comes back 400 invalid_grant. That is `unauthorized`, not
  // `unreachable`: the artist pulled our access and only reconnecting fixes it.
  if (!res.ok) return { ok: false, reason: statusToReason(res.status) };
  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  const accessToken = typeof body.access_token === "string" ? body.access_token : "";
  if (!accessToken) return { ok: false, reason: "unauthorized" };
  const expiresInSec = typeof body.expires_in === "number" ? body.expires_in : 0;
  return { ok: true, accessToken, expiresAtMs: nowMs + expiresInSec * 1000 };
}

/**
 * Ask Google to revoke a grant. Returns false only when we could not reach
 * Google at all — an already-invalid token counts as revoked, because the
 * artist's intent is satisfied either way and disconnect must never wedge.
 */
export async function revokeToken(input: {
  token: string;
  fetchImpl?: FetchLike;
}): Promise<boolean> {
  const doFetch = input.fetchImpl ?? defaultFetch();
  try {
    const res = await doFetch(REVOKE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: input.token }).toString(),
    });
    // 400 invalid_token = already gone. Only a server-side failure is a failure.
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

// ─── Free/busy ─────────────────────────────────────────────────────────

/**
 * When is this calendar busy between two instants?
 *
 * Returns busy ranges only. A per-calendar error in an HTTP 200 body is a
 * FAILURE here, not an empty result: Google saying "I could not read that
 * calendar" alongside `busy: []` would otherwise be indistinguishable from a
 * completely free week, and we would offer the artist's every declared window.
 */
export async function fetchFreeBusy(input: {
  accessToken: string;
  calendarId: string;
  timeMinMs: number;
  timeMaxMs: number;
  nowMs?: number;
  fetchImpl?: FetchLike;
}): Promise<FreeBusyResult> {
  const doFetch = input.fetchImpl ?? defaultFetch();
  const nowMs = input.nowMs ?? Date.now();
  let res: Response;
  try {
    res = await doFetch(`${CALENDAR_API}/freeBusy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: new Date(input.timeMinMs).toISOString(),
        timeMax: new Date(input.timeMaxMs).toISOString(),
        items: [{ id: input.calendarId }],
      }),
    });
  } catch {
    return { ok: false, reason: "unreachable" };
  }

  if (!res.ok) return { ok: false, reason: statusToReason(res.status) };

  let body: Record<string, unknown>;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "unreachable" };
  }

  const calendars = body.calendars as Record<string, unknown> | undefined;
  const entry = calendars?.[input.calendarId] as
    | { busy?: unknown; errors?: unknown }
    | undefined;
  if (!entry) return { ok: false, reason: "calendar_error" };
  if (Array.isArray(entry.errors) && entry.errors.length > 0) {
    return { ok: false, reason: "calendar_error" };
  }

  const busy: BusyInterval[] = [];
  if (Array.isArray(entry.busy)) {
    for (const raw of entry.busy) {
      if (!raw || typeof raw !== "object") continue;
      const { start, end } = raw as Record<string, unknown>;
      if (typeof start !== "string" || typeof end !== "string") continue;
      const startMs = Date.parse(start);
      const endMs = Date.parse(end);
      // One unparseable range should not lose the other nineteen; the ranges
      // are independent and dropping a malformed one only ever offers less.
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
      if (endMs <= startMs) continue;
      busy.push({ startMs, endMs });
    }
  }
  return { ok: true, busy, fetchedAtMs: nowMs };
}

/**
 * Remove every offered slot that collides with busy calendar time.
 *
 * Works on the absolute timeline rather than converting busy intervals back to
 * wall clock, which keeps it correct across DST and across busy blocks that
 * span days. A slot whose times cannot be placed in the zone is dropped: we
 * will not offer a time we cannot reason about.
 */
export function filterSlotsByBusy(
  slots: readonly Slot[],
  busy: readonly BusyInterval[],
  timezone: string,
): Slot[] {
  return slots.filter((slot) => {
    if (!isValidTimeString(slot.startTime) || !isValidTimeString(slot.endTime)) {
      return false;
    }
    const startMin = parseTimeToMinutes(slot.startTime);
    const rawEndMin = parseTimeToMinutes(slot.endTime);
    const endMin = rawEndMin > startMin ? rawEndMin : rawEndMin + 24 * 60;
    const startMs = zonedMinutesToEpochMs(slot.date, startMin, timezone);
    const endMs = zonedMinutesToEpochMs(slot.date, endMin, timezone);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
    return !busy.some((b) => timeOverlap(startMs, endMs, b.startMs, b.endMs));
  });
}

// ─── Write-back ────────────────────────────────────────────────────────

export interface CalendarEvent {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  extendedProperties?: { private?: Record<string, string> };
}

/**
 * The event a confirmed booking becomes on the artist's TatT calendar.
 *
 * Deliberately thin: the artist's name for the client and what they are getting
 * tattooed. The client's email and phone stay in TatT — a calendar event syncs
 * to phones, watches and shared devices, and there is no reason for a client's
 * contact details to ride along.
 */
export function buildBookingEvent(input: {
  bookingId: string;
  clientName: string;
  summaryDetail?: string;
  slot: { date: string; startTime: string; endTime: string; timezone: string };
}): CalendarEvent {
  const { slot } = input;
  return {
    summary: `TattTester booking — ${input.clientName}`,
    description: [input.summaryDetail, `TattTester booking ${input.bookingId}`]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: `${slot.date}T${slot.startTime}:00`, timeZone: slot.timezone },
    end: { dateTime: `${slot.date}T${slot.endTime}:00`, timeZone: slot.timezone },
    // Lets a later run find this event again — for idempotent re-writes and for
    // deleting it if the booking is cancelled.
    extendedProperties: { private: { tattBookingId: input.bookingId } },
  };
}

export type CalendarWriteResult =
  | { ok: true; eventId: string }
  | { ok: false; reason: CalendarFailureReason | "writes_disabled" };

/**
 * Write a booking onto the app-created calendar.
 *
 * `writesEnabled` is a hard gate, checked before any network call is made. It
 * comes from `GOOGLE_CALENDAR_WRITE_ENABLED` and is false everywhere until an
 * owner turns it on deliberately — no agent, test or preview deploy writes to a
 * real person's calendar by accident.
 */
export async function writeBookingEvent(input: {
  accessToken: string;
  /** The app-created calendar's id — never "primary". */
  calendarId: string;
  event: CalendarEvent;
  writesEnabled: boolean;
  fetchImpl?: FetchLike;
}): Promise<CalendarWriteResult> {
  if (!input.writesEnabled) return { ok: false, reason: "writes_disabled" };
  const doFetch = input.fetchImpl ?? defaultFetch();
  let res: Response;
  try {
    res = await doFetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(input.calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input.event),
      },
    );
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  if (!res.ok) return { ok: false, reason: statusToReason(res.status) };
  try {
    const body = (await res.json()) as Record<string, unknown>;
    const eventId = typeof body.id === "string" ? body.id : "";
    return eventId ? { ok: true, eventId } : { ok: false, reason: "unreachable" };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}

/** Re-exported for callers that render busy time back as wall clock. */
export { epochMsToZonedDateTime };
