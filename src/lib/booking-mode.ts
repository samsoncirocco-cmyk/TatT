/**
 * Is this artist's booking a reservation or a request? (ADR 0027)
 *
 * Samson's decision was "reservation, once the calendar is actually synced".
 * This function is the "actually synced" half, and it is the only place in the
 * codebase allowed to say yes.
 *
 * ── Why the mode is derived, never stored ─────────────────────────────────
 * A stored `mode: "reservation"` flag can outlive the thing it describes: the
 * artist revokes access, the token dies, Google has an outage, and a database
 * row still cheerfully says "reservation" while the slots behind it are
 * fiction. So there is no flag. The mode is recomputed from live signals on
 * every render, and there is no field ops could flip to put an artist into slot
 * mode on their behalf.
 *
 * ── Fails closed ──────────────────────────────────────────────────────────
 * `"reservation"` is returned from exactly one branch, at the bottom, after
 * every check has passed. Every other path — including a caller who simply
 * forgot to fetch the calendar — returns `"request"`. Adding a new failure mode
 * later cannot accidentally grant a reservation, because the default is not
 * reservation.
 *
 * ── The client sees one promise ───────────────────────────────────────────
 * `reason` is diagnostic and for us. `label` and `detail` are for the client,
 * and every request-mode reason produces the *same* two strings. Whether an
 * artist never connected a calendar or connected one that is down right now is
 * TatT's problem; what the client is promised is identical either way, and it
 * is the honest promise that shipped before any of this existed.
 */
import { MAX_SYNC_AGE_MINUTES, type FreeBusyResult } from "./artist-calendar";

export type BookingMode = "reservation" | "request";

export type BookingModeReason =
  /** Live calendar read, fresh, holds writable — a reservation. */
  | "calendar_synced"
  /** The artist has not claimed their profile, so nobody has authority over it. */
  | "not_claimed"
  /** No calendar has ever been connected, or the artist disconnected it. */
  | "no_calendar"
  /** Google was unreachable, rate-limited, erroring, or was never asked. */
  | "calendar_unreachable"
  /** The grant was revoked or rejected — the artist must reconnect. */
  | "calendar_unauthorized"
  /** Google answered but could not read that calendar. */
  | "calendar_error"
  /** No Google OAuth client is configured on this deployment. */
  | "not_configured"
  /** The last good read is too old to trust. */
  | "sync_stale"
  /** No exclusive hold can be written, so a "reservation" would reserve nothing. */
  | "holds_unavailable";

/** The non-secret half of a calendar connection. Never carries a token. */
export interface CalendarConnectionSummary {
  artistId: string;
  /** The calendar we read free/busy from. */
  calendarId: string;
  connectedAt: string;
  scopes: string[];
  /** Whether the artist also granted write-back. */
  writeEnabled: boolean;
  /** Set when the artist disconnected. A revoked connection is no connection. */
  revokedAt?: string;
  /** The app-created calendar we write bookings to, when write-back is on. */
  writeCalendarId?: string;
}

export interface BookingModeInput {
  artistId: string;
  /** Has a real person proved they own this profile (`claimedByUid`)? */
  claimed: boolean;
  connection: CalendarConnectionSummary | null;
  /** The live free/busy read. `null` means no read was attempted. */
  calendar: FreeBusyResult | null;
  /** Can an exclusive hold be written right now? */
  holdsWritable: boolean;
  nowMs: number;
}

export interface BookingModeDecision {
  mode: BookingMode;
  reason: BookingModeReason;
  /** Client-facing label. Identical for every request-mode reason. */
  label: string;
  /** Client-facing sentence. Identical for every request-mode reason. */
  detail: string;
  /** True only when the artist can fix this by reconnecting. */
  artistActionRequired: boolean;
}

/**
 * The one promise made to a client on the request model. This is the copy that
 * shipped before any calendar work existed, and it was always honest: we do not
 * know this artist's schedule, so a human will answer.
 */
const REQUEST_LABEL = "Availability on request";
const REQUEST_DETAIL =
  "Pick the dates that suit you — the artist confirms a time after your request lands.";

const RESERVATION_LABEL = "Live calendar";
const RESERVATION_DETAIL =
  "These times are from the artist's own calendar. Picking one holds it for 30 minutes while you pay.";

function request(
  reason: BookingModeReason,
  artistActionRequired = false,
): BookingModeDecision {
  return {
    mode: "request",
    reason,
    label: REQUEST_LABEL,
    detail: REQUEST_DETAIL,
    artistActionRequired,
  };
}

/** Map a calendar read failure onto the reason the booking model degraded. */
function reasonForFailure(
  failure: Extract<FreeBusyResult, { ok: false }>,
): BookingModeDecision {
  switch (failure.reason) {
    case "unauthorized":
      // The artist pulled our access in their Google account. Retrying never
      // helps; only they can fix it, so this is the one case that nags them.
      return request("calendar_unauthorized", true);
    case "no_refresh_token":
      return request("calendar_unauthorized", true);
    case "calendar_error":
      return request("calendar_error", true);
    case "not_configured":
      return request("not_configured");
    case "not_connected":
      return request("no_calendar");
    case "stale":
      return request("sync_stale");
    case "unreachable":
    default:
      // Our outage, or Google's. Not the artist's fault and not their problem.
      return request("calendar_unreachable");
  }
}

/**
 * Decide the booking model for one artist, right now.
 *
 * Order matters: authority first (has anyone the right to publish this
 * schedule?), then whether a calendar exists, then whether we could actually
 * read it, then whether the read is fresh, then whether a hold could be taken.
 * Only a clean pass through all five is a reservation.
 */
export function resolveBookingMode(
  input: BookingModeInput,
): BookingModeDecision {
  // 1. Authority. An unclaimed profile has no owner, so any schedule on it is
  //    someone's guess — exactly the fake open slots this product refused to
  //    show in the first place.
  if (!input.claimed) return request("not_claimed");

  // 2. A connection must exist and still be live. Disconnecting is a normal,
  //    supported thing to do: it degrades cleanly and blames nobody.
  if (!input.connection || input.connection.revokedAt) {
    return request("no_calendar");
  }

  // 3. We must have actually asked, and been answered. `null` — a caller who
  //    never fetched — is a failure, not a pass.
  if (!input.calendar) return request("calendar_unreachable");
  if (!input.calendar.ok) return reasonForFailure(input.calendar);

  // 4. The answer must be recent. Yesterday's free/busy is a guess about today,
  //    and serving it shows slots the artist has since filled.
  const ageMs = input.nowMs - input.calendar.fetchedAtMs;
  if (ageMs < 0 || ageMs > MAX_SYNC_AGE_MINUTES * 60_000) {
    return request("sync_stale");
  }

  // 5. A slot we cannot hold is not reserved. Without a writable hold store,
  //    "reservation" would mean the same double-booking as before, with a
  //    calendar bolted on the side.
  if (!input.holdsWritable) return request("holds_unavailable");

  return {
    mode: "reservation",
    reason: "calendar_synced",
    label: RESERVATION_LABEL,
    detail: RESERVATION_DETAIL,
    artistActionRequired: false,
  };
}

/** Narrowing helper for call sites that branch on the model. */
export function isReservation(decision: BookingModeDecision): boolean {
  return decision.mode === "reservation";
}
