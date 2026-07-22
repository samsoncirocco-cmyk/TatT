# Booking fee charged to the client on top; artist keeps 100% of the deposit

## Context

TatT competes for a scarce supply side: ~10k scraped artists must *claim and
onboard* for the marketplace to work. Charging artists a commission or a
subscription at launch fights that adoption, and a key competitor is
artist-free. TatT also offers real live scheduling/availability (not just a
booking request), a higher-value product than a directory — worth more than a
flat intro fee.

## Decision

**The platform booking fee is charged to the CLIENT, on top of the deposit, and
the artist keeps 100% of their deposit.**

- At checkout the client pays `deposit + bookingFee` (two line items). The fee is
  `platformFeeCents(depositCents)` (default `PLATFORM_FEE_BPS` = 1000 bps = 10%
  of the deposit) — a percentage, not a flat $10, because live confirmed
  scheduling delivers more than a directory intro and a flat fee under-monetizes
  large bookings.
- **Claimed artist** → destination charge with `application_fee_amount = the
  booking fee` and `transfer_data` → artist, so the artist receives
  `total − fee = the full deposit`.
- **Unclaimed artist** → the whole charge (deposit + fee) is held on the
  platform; on release, `transferHeldDeposits` pays the artist the **full
  deposit** (`netTransferCents(depositCents) === depositCents`) and TatT keeps
  the fee. `refundRelay` returns the entire charge on expiry.
- The artist subscription lane (Billing) stays **built but dormant** — a
  fast-follow once artists rely on the scheduling tools, not a launch gate.

## Rejected alternatives

- **Deduct a % from the deposit (artist receives deposit − fee).** Rejected: reads
  as "the platform skims my art money," the objection that most suppresses artist
  onboarding — the thing we most need at launch.
- **Flat $10 client fee (competitor's model).** Rejected as the launch default:
  simple, but over-taxes small deposits (13% of a $75) and under-monetizes large
  ones (2% of a $500). A percentage scales with delivered value; `PLATFORM_FEE_BPS`
  keeps a flat/floor/cap variant a config change away.
- **Charge artists a subscription at launch.** Rejected: onboarding is the
  constraint; monetize the client at the high-intent booking moment instead.

## Consequences

- Artist-side is friction-free (keeps 100%), maximizing claims/onboarding.
- The fee basis is the deposit; the client sees a transparent "TatT booking fee"
  line item.
- Transfers stay idempotent (`relay-transfer-<id>`, `pending`-only) and use
  `source_transaction` so releases draw from held funds, not platform float.
- Switching to flat/floor/cap, or turning on the subscription later, are config /
  small changes, not rewrites.
