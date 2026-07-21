# 7-day hold window with automatic full refund on expiry

## Context

A held deposit (ADR-0005) can't sit on the platform forever waiting for an
artist to onboard. Customers who paid deserve a bounded, predictable outcome,
and unclaimed funds are a liability we must not accumulate.

## Decision

Held deposits have a fixed hold window — `DEPOSIT_HOLD_DAYS`, default **7 days**,
stamped onto each relay as `expiresAtEpoch = created + DEPOSIT_HOLD_DAYS*86400`.
A daily Vercel cron (`/api/cron/expire-deposits`, `0 9 * * *`) finds pending
relays past their window and issues a **full refund** to the customer via the
original PaymentIntent. TatT absorbs the Stripe processing fee on refund — the
customer is made whole. Expiry is a strict `expiresAtEpoch < now` predicate
(`isExpired`), mirrored by the cypher filter in `listExpiredPending`.

## Rejected alternatives

- **Partial refund / keep the Stripe fee.** Rejected: nickel-and-diming a
  customer for the artist's failure to onboard is bad faith and a chargeback
  magnet. TatT eats the fee.
- **Auto-transfer to the platform (forfeit).** Rejected: keeping money for a
  service never rendered is indefensible and likely unlawful.
- **No expiry / hold indefinitely.** Rejected: unbounded liability and stale
  customer funds; nothing forces resolution.
- **Per-artist or per-deal variable windows.** Rejected as premature (YAGNI);
  one env-tunable global window is enough until evidence says otherwise.

## Consequences

- Refunds are idempotent (`relay-refund-<id>` idempotency key; only `pending`
  relays refund), so a re-run of the cron is safe.
- The cron is the sole automatic closer of held relays; if it stops running,
  deposits linger — it must be monitored.
- Changing `DEPOSIT_HOLD_DAYS` only affects relays created after the change.
