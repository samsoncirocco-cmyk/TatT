# Hold deposits for unclaimed artists on the platform

## Context

Most artists in the graph are scraped, not onboarded — they have no Stripe
connected account (no `stripeAccountId`, or `stripeChargesEnabled` is false). A
customer can still book them. Previously `/api/checkout` returned a 409
(`ARTIST_PAYMENTS_NOT_READY`) in that case, so an unclaimed artist could never
take a booking — the exact cold-start we need to break to grow supply.

## Decision

For a booking against an **unclaimed** artist we collect the deposit to the
**platform** and HOLD it. The Checkout Session is created WITHOUT `transfer_data`
/ `application_fee_amount` and carries `metadata.depositState='held'`; the held
state is recorded as a `:BookingRelay` node keyed by the PaymentIntent id.
Claimed artists (connected account with charges enabled) keep the existing
destination-charge path unchanged. When the artist later finishes onboarding we
release the funds via separate charges & transfers (see ADR-0007).

## Rejected alternatives

- **Keep the 409 / block the booking.** Rejected: it makes unclaimed artists
  unbookable, defeating the demand-side hook that motivates artists to claim.
- **Destination charge to a not-yet-existent account.** Impossible — Stripe
  requires a valid, charges-enabled connected account for `transfer_data`.
- **Hold money off-Stripe (our own ledger, manual payout).** Rejected: rebuilds
  custody, reconciliation, and refunds that Stripe already does correctly, and
  raises money-transmission questions we don't want to own.

## Consequences

- TatT is merchant of record for held deposits and briefly holds customer funds;
  the `:BookingRelay` node is the source of truth for what is owed and to whom.
- Two checkout code paths now exist (claimed vs held) — tested and documented.
- A held deposit must resolve exactly one way: transfer to the artist on claim,
  or refund to the customer on expiry (ADR-0006). Nothing may strand.
