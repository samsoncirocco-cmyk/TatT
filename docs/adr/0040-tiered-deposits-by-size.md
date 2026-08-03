---
status: accepted
---

# Booking deposits are tiered by tattoo size

Owner grill session, 2026-08-03 (TattTester Buzz channel). Decided by Samson.

## Context

The 2026-07-20 grill produced an early "flat ~$25 deposit" decision, made
before the booking lane was built. What actually shipped is a size-based
deposit ladder: `DEPOSIT_CENTS_BY_SIZE` in `src/lib/booking.ts` charges by
tattoo size, and the checkout, webhook, and held-deposit paths (ADR-0005
through ADR-0008) all run on it. The two decisions have coexisted as an
unresolved contradiction: the flat number lived only in the grill record,
while the ladder lived in the code that takes real money.

## Decision

**Deposits are tiered by tattoo size, exactly as shipped:**

| Size | Deposit |
| --- | --- |
| small | $75 |
| medium | $150 |
| large | $300 |
| sleeve | $500 |

- The unit of record is cents (`DEPOSIT_CENTS_BY_SIZE`, ADR-0026); dollars
  appear only at the presentation edge via `depositDollarsForSize`.
- An unknown or missing size falls back to the medium tier, as the code
  already does.
- The booking fee remains a percentage charged to the client on top of the
  deposit, and the artist keeps 100% of the deposit (ADR-0007). A tiered
  deposit basis is precisely why that fee is a percentage and not flat.

This ADR **supersedes the flat ~$25 deposit decision from the 2026-07-20
grill**. That decision is struck; do not repeat it in copy, decks, or specs.

## Rejected alternatives

- **Flat ~$25 deposit.** Rejected: $25 is not a serious commitment signal for
  a tattoo, under-secures the artist's time on large work, and would make the
  percentage booking fee (10% of $25) commercially meaningless.
- **Artist-configured per-session-type deposits now.** The scheduling-engine
  spec (`docs/specs/scheduling-engine-spec.md`) sketches flat/percent/none
  deposits per session type; that remains a possible future in which
  `DEPOSIT_CENTS_BY_SIZE` becomes the fallback. It is not launch scope.

## Consequences

- `src/lib/booking.ts` is the single source of truth for deposit amounts;
  docs and copy quote it, never the other way around.
- Any document still describing a flat $25 deposit is historical and must
  point here.
