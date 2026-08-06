# ADR-0054 — Money is integer cents everywhere; out-of-range money is rejected, not clamped

## Status

Accepted — implemented in `src/lib/booking.ts` and `src/lib/session-types.ts`.

## Context

Two deposit engines grew up independently and met in the scheduling work:

- `depositForSize` (`src/lib/booking.ts`) returned **flat dollars** (`75`, `150`,
  `300`, `500`) and is live: `/api/checkout` multiplied it by 100 on the way to
  Stripe, and `/book` renders it as `${n}`.
- `computeDepositCents` (`src/lib/session-types.ts`) returns **cents**, and
  handles percentage deposits expressed in basis points.

Nothing reconciled them. Both are named `deposit*`, both return a bare `number`,
and the payment path already speaks cents throughout (`platformFeeCents`,
`netTransferCents`, Stripe's `unit_amount`, the `depositCents` charge metadata
the release webhook transfers on). One accidental substitution — passing the
dollars function where the cents one was meant — is a **100x** billing error in
either direction, and nothing in the type system would notice, because both
sides are `number`.

Separately, `cancellationPolicyPartialRefundBps` had no upper bound. A value
above 10000 bps is a refund larger than the deposit that funded it; Stripe would
attempt it.

## Decision

**1. Cents is the unit of record. Dollars exist only at the presentation edge,
and every money accessor names its unit.**

- `DEPOSIT_CENTS_BY_SIZE` is the single deposit ladder, denominated in cents.
- `depositCentsForSize()` is what anything touching Stripe calls.
- `depositDollarsForSize()` is derived from that same table (`/100`) and is for
  UI copy only.
- `depositForSize` — the ambiguous name — no longer exists, so no call site can
  keep using it without stating which unit it means.

`computeDepositCents` and `depositCentsForSize` remain two functions because
they answer different questions: the per-session-type deposit configured by an
artist, versus the size-bucket fallback used when no session type applies. They
are reconciled in *unit*, which is where the 100x risk lived — not merged into
one function, which would have conflated two policies.

**2. Money and policy values outside their valid range are REJECTED, never
silently clamped.** `cancellationPolicyPartialRefundBps` must be 0–10000. A
`depositAmount` may not be supplied without the `depositType` that defines its
unit (cents for `flat`, basis points for `percentage`).

## Rejected alternatives

- **Convert `depositForSize` to cents in place, keeping the name.** Rejected:
  the name is the defect. Any stale call site would keep compiling and silently
  return a 100x-different number — the exact failure mode being fixed.
- **A branded `Cents` type instead of naming conventions.** Rejected for now as
  more machinery than the ~6 money call sites justify. Worth revisiting if the
  payment surface grows; the naming convention is the cheap 90%.
- **Clamp `cancellationPolicyPartialRefundBps` to 10000.** Rejected. Clamping
  turns an artist typing `50000` into a silent 100% refund policy they never
  agreed to, and it surfaces only when a real customer cancels and real money
  moves. This codebase's existing money guards fail loud (`/api/checkout` and
  the Stripe routes return 503 rather than proceeding on missing config), and
  the sibling `percentage deposit must be 0-10000 bps` check already rejects.
  Clamping would have been the sole silent-correction in the money path.
- **Bound the value only at the API layer.** Rejected: the persistence module
  is the last checkpoint before the number is durable, and it is reachable from
  more than one route.

## Consequences

- Checkout behavior is unchanged (`7500 === 75 * 100`); the dollars value it
  puts in charge metadata is now derived from the cents figure rather than the
  other way round.
- ADR 0007 is unaffected: the client still pays `deposit + bookingFee` and the
  artist still keeps 100% of the deposit. This ADR changes the unit the deposit
  is *expressed* in, not who pays what.
- An artist who enters an out-of-range refund policy gets an error at save time
  instead of a surprise at refund time.
- Changing the ladder means editing one table. The dollars view cannot drift
  from it.
