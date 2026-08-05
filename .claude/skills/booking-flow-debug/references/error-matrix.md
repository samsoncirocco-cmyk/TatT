# Booking error matrix

Verified against source at branch point `05a40ce` (2026-08-04). Line numbers
drift; statuses, codes, and symbols are the stable handles.

## POST /api/v1/book/hold (`src/app/api/v1/book/hold/route.ts`)

| Status | Cause |
|---|---|
| 400 | Invalid JSON; missing any of `artistId, bookingId, date, startTime, endTime`; `placeHold` refusal other than `slot_held`/`unavailable` ("That slot is not bookable.") |
| 403 | Booking doc has a `uid` that isn't the caller ("Booking does not belong to you.") |
| 409 | Booking status can't transition to `held`; slot not in current offer (`code: SLOT_GONE`); `placeHold` → `slot_held` ("Someone just took that time.", `SLOT_GONE`) |
| 503 (a) | Ownership/Firestore read threw — fails closed ("Could not verify your booking.") |
| 503 (b) | `offer.decision.mode !== 'reservation'` — body carries `mode` and the diagnostic `reason` from `resolveBookingMode` |
| 503 (c) | `placeHold` → `unavailable` (no admin credential or transaction threw) — "Reservations are temporarily unavailable." |
| 200 | `{ holdId, expiresAt, slot }`; stamps `booking_requests/{bookingId}` with `status:'held', holdId, holdExpiresAt, heldSlot` (stamp failure only logs) |

No 404 exists on this route.

## POST /api/v1/book (`src/app/api/v1/book/route.ts`)

| Status | Cause |
|---|---|
| 401 | `verifyApiAuth` / Firebase token failure |
| 429 | In-memory per-IP rate limit: 5 per hour |
| 400 | Invalid JSON; `validateBookingRequest` failure; unknown artist |
| 409 | `bookingTier !== 'bookable'` → `code: ARTIST_INTRO_REQUIRED` with `introUrl` |
| 503 | Graph error on the tier check (fails closed) |
| 200 | `{ success: true, bookingId }` (`BK-<8 hex>`); Firestore write failure falls back to `/tmp/tatt-data/bookings.jsonl` and STILL returns 200 |

## POST /api/checkout (`src/app/api/checkout/route.ts`) — hold interactions

| Status | Cause | Releases hold? |
|---|---|---|
| 404 | Artist not found (first `getRosterArtistById` miss) | Yes (`releaseHoldQuietly`) |
| 409 | `ARTIST_INTRO_REQUIRED` | Yes |
| 503 | Bookability/graph check threw | Yes |
| 409 | `HOLD_LOST` — hold missing or `status !== 'active'`; or refresh `placeHold` failed | No |
| 403 | `hold.bookingId !== bookingId` | No |
| 503 | "Payments are not configured." (`!stripeConfigured`, demo mode off) | No — leaked hold, lapses via TTL (issue #312 territory) |
| 404 | Second, later artist lookup | No (issue #312 territory) |

The reservation path *refreshes* the hold rather than reading it, so Stripe
`expires_at` gets a full TTL; the refreshed hold id becomes
`metadata.holdId`.

## Booking status machine (`src/lib/booking.ts`)

`BookingStatus = pending | held | deposit_paid | confirmed | declined |
completed | cancelled | refunded | expired`; initial `pending`.
`BOOKING_TRANSITIONS`: `pending → held|deposit_paid|cancelled|expired`;
`held → deposit_paid|pending|cancelled|expired`. `canTransition` rejects
same-state transitions. UI mapping: `src/app/bookings/bookingStatus.ts`.

## Hold lifecycle (`src/lib/booking-holds.ts` + `booking-holds-persistence.ts`)

- Pure: `HOLD_TTL_MINUTES = 35`, `MAX_HOLD_MINUTES = 720`, `Hold.status =
  "active"|"released"|"converted"`, refusals `slot_held | invalid_slot |
  in_the_past`; `resolvePaidHold` → `'confirm' | 'slot_lost'`.
- Persistence: Firestore collection `booking_holds`, doc id
  `hold_<uuid>`, client access denied in `firestore.rules` (server-only).
  `placeHold` runs a transaction over the artist's active holds and
  releases the same booking's prior hold in-transaction. `releaseHoldById`
  returns `false` on missing credential, missing doc, or throw — callers
  ignore it (warn log `[holds] release failed for …`).
- Expiry is lazy (`isHoldLive` / `liveHolds`); no cron touches slot holds.
  (The `expire-deposits` cron is about deposit relays, not slot holds.)

## Calendar failure classification (`src/lib/artist-calendar.ts`)

`CalendarFailureReason`: `unauthorized`, `no_refresh_token`,
`calendar_error`, `not_configured`, `not_connected`, `stale`, `unreachable`.
Mapping to booking-mode reasons happens in `reasonForFailure`
(`src/lib/booking-mode.ts`): `unauthorized`/`no_refresh_token` →
`calendar_unauthorized` (artist action required), `calendar_error` →
`calendar_error` (artist action required), `stale` → `sync_stale`, default
→ `calendar_unreachable`.

Offer composition (`src/lib/booking-offer.ts`): `OFFER_WINDOW_DAYS = 28`,
default session 120 min + 15/15 buffers + 24 h notice; invariant — `slots`
non-empty only when `mode === "reservation"`.
