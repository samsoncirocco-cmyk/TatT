# Platform fee taken via separate charges & transfers on release

## Context

When a claimed artist's held deposit is released, TatT must keep its marketplace
take (`PLATFORM_FEE_BPS`, default 1000 bps = 10%) and pass the rest to the
artist. Unlike a destination charge — where `application_fee_amount` splits the
money at capture time — a held deposit was already captured to the platform with
no split, so the fee has to be applied at release.

## Decision

Release held deposits with **separate charges & transfers**: for each pending
relay, `stripe.transfers.create` with `source_transaction` = the original charge
id (so Stripe draws from the held funds, not the platform float),
`destination` = the artist's connected account, and
`amount = netTransferCents(gross) = gross − platformFeeCents(gross)`. TatT
retains `platformFeeCents(gross)`. `netTransferCents`/`platformFeeCents` are pure
and unit-tested so the split is provably `net + fee === gross`.

## Rejected alternatives

- **Convert the hold into a destination charge later.** Not possible — the charge
  already settled to the platform; you cannot retroactively add `transfer_data`.
- **Transfer the full gross, invoice the fee separately.** Rejected: two money
  movements to reconcile, and it risks paying out more than we can claw back.
- **Take a different fee than the destination-charge path.** Rejected: the take
  rate should be identical whether the artist was claimed at booking or later,
  so the same `PLATFORM_FEE_BPS` drives both.

## Consequences

- The fee basis is the **gross** deposit, matching the destination-charge path.
- Transfers are idempotent (`relay-transfer-<id>`; only `pending` relays move),
  so retries and webhook redelivery won't double-pay.
- `source_transaction` ties each transfer to its charge, keeping Stripe balance
  and reporting clean instead of drawing from platform working capital.
