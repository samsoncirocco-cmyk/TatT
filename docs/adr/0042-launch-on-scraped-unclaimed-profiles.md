---
status: accepted
---

# Soft launch runs on scraped, unclaimed profiles; recruited artists are an upgrade

Owner grill session, 2026-08-03 (TattTester Buzz channel, continuation of the
session recorded in ADR-0040/ADR-0041). Decided by Samson.

## Context

Two supply models have coexisted in the docs without a decision about which
one gates launch. The Phoenix soft-launch runbook
(`docs/operations/phoenix-soft-launch.md`) makes "first supply comes from
consented, identity-checked local artists" a launch gate ("five launch-ready
artists"), while the booking relay lane (ADR-0005 through ADR-0008) was built
precisely so a customer can book an artist who has never heard of TattTester:
held deposit on the platform, relay outreach, claim-driven transfer, 7-day
auto-refund if nobody claims. Meanwhile GitHub issues #82 (soft launch to
friends + artists + local AZ) and #83 (the "full journey works" launch bar)
frame the launch checklist, and issue #65 (discovery → graph integration) asks
what quality bar scraped candidates must clear to become usable Artist nodes.

## Decision

**The soft launch must work end-to-end on scraped, UNCLAIMED artist
profiles.** The unclaimed-booking relay mechanism (ADR-0005 held deposit →
relay → ADR-0008 claim-driven transfer → ADR-0006 7-day auto-refund) is the
load-bearing launch path, not a fallback.

- Claimed/recruited artists are an **upgrade**, not a launch gate. The
  Phoenix/AZ recruiting track (starting with Sailor Zac, issue #82,
  `docs/operations/phoenix-soft-launch.md`) continues in parallel and remains
  valuable — a claimed artist gets direct payouts, availability, and console
  tools — but zero recruited artists does not block launch.
- The "full journey works" launch bar (issue #83: sign up → generate → match →
  book, real data, no fake screens) is therefore satisfied when the journey
  completes against scraped profiles, with bookability gated per ADR-0043.
- Scraped profiles must never be labeled "verified artists" (ADR-0032; the
  artist-verification entry in `docs/status/known-contradictions.md`). They
  are discovered, unclaimed profiles and the UI says so plainly.

## Rejected alternatives

- **Gate launch on recruited/claimed artists.** Rejected: it makes launch
  hostage to outreach conversion in one metro, and it wastes the relay
  machinery (ADR-0005–0008) that was built to break exactly this cold-start.
  Recruiting continues, but as an upgrade lane.

## Consequences

- Launch-readiness work shifts to making the relay path trustworthy at scale:
  which scraped profiles may take a deposit is decided in ADR-0043, and that
  classification largely defines the acceptance bar for issue #65.
- `docs/operations/phoenix-soft-launch.md` is annotated: its recruiting
  phases stand, but its "consented, identity-checked local artists" supply
  gate is no longer a launch gate.
- Unclaimed-profile copy keeps the existing honesty rule: unclaimed, work
  shown from the artist's public Instagram with credit, plus the claim door
  (`CONTEXT.md`); never "verified".
