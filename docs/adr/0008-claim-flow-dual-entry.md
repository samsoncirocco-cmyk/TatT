# Dual entry into the artist claim / onboarding flow

> **Security amendment:** ADR-0033 supersedes the direct ownership-binding
> portion of this decision. Both entry points remain, but `v1/connect/claim`
> now creates a pending identity-review request. Connect onboarding and deposit
> release start only after a human-approved verified ownership binding exists.

## Context

An unclaimed artist becomes payable only after they create a Stripe connected
account and enable charges. Two independent things can trigger that onboarding:
a real held deposit waiting for them (a customer already booked and paid), or an
artist arriving on their own to set up payments before any booking exists. Both
must converge on the same end state and the same fund-release logic.

## Decision

Support **two entry points** into one claim flow:

1. **Deposit-driven** — `notifyArtistOfBooking` sends the artist a claim link
   when a held relay is recorded; they follow it to onboard.
2. **Self-serve** — the artist requests ownership via `v1/connect/claim`,
   completes identity review, then continues through Connect onboarding and
   `v1/connect/claim-complete` (firebase-auth routes).

Both paths end at the same Stripe onboarding and, on success, the same release:
`account.updated`/claim-complete calls `transferHeldDeposits(artistId)`, which
pays out every pending held relay for that artist. Release is keyed on the
artist becoming charges-enabled, not on which door they came through.

## Rejected alternatives

- **Deposit-driven only.** Rejected: artists who hear about TatT elsewhere would
  have no way to onboard before a booking exists.
- **Self-serve only.** Rejected: wastes the strongest possible hook — "you have
  $X waiting" — which is exactly what converts a scraped artist into a user.
- **Two separate onboarding implementations.** Rejected: divergent release logic
  is how money gets stranded or double-paid; one convergent path is safer.

## Consequences

- Whichever path completes, `transferHeldDeposits` is the single release point,
  and its idempotency (ADR-0007) means a second trigger is a safe no-op.
- New routes `v1/connect/claim` and `v1/connect/claim-complete` are registered in
  `api-route-security.ts` and guarded via `verifyApiAuth`.
- The webhook releases best-effort on `account.updated`; the completion route is
  the synchronous path — either can fire first, and idempotency makes that fine.
