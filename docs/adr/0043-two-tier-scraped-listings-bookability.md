---
status: accepted
---

# Two-tier scraped listings: bookable only with tattoo evidence and a working contact channel

Owner grill session, 2026-08-03 (TattTester Buzz channel, continuation of the
session recorded in ADR-0040/ADR-0041). Decided by Samson.

## Context

ADR-0042 makes scraped, unclaimed profiles the load-bearing soft-launch
supply. But the relay lane only works if the relay can actually reach the
artist: a held deposit against an artist with no working contact channel can
never convert to a claim — it silently dies into the ADR-0006 7-day
auto-refund. The discovery pipeline (issue #65) produces junk-filtered
candidates of very uneven quality: some have real tattoo portfolios and live
Instagram/email/phone contacts; others are little more than a handle and a
bio. A single "everything bookable" bar would take deposits it structurally
cannot deliver.

## Decision

**Scraped listings are two-tier.** A scraped profile is publicly **BOOKABLE**
(shows the deposit button, enters the ADR-0005 held-deposit relay) only if it
has BOTH:

1. **Real tattoo evidence** — an actual tattoo portfolio (not a logo, flash
   aggregator, or empty account), and
2. **A working contact channel** — Instagram, email, or phone — so the relay
   outreach (ADR-0005/ADR-0008) can actually deliver the booking to the
   artist.

All other junk-filtered scraped profiles remain **visible** for browsing and
matching but show a **"request intro"** action instead of taking a deposit.
They stay in the graph and the match deck; they just cannot take money until
they clear both criteria (or the artist claims the profile).

This classification largely defines the acceptance bar for issue #65
(discovery → graph integration): importing a candidate as an Artist node must
record whether it clears the bookable tier, and the tier drives which action
the profile surfaces.

## Rejected alternatives

- **(A) Everything junk-filtered is bookable.** Rejected: deposits to
  unreachable artists silently die into 7-day refunds — the customer's money
  sits for a week for nothing, and every such booking erodes trust in the
  relay lane exactly where it must be credible.
- **(C) AZ-only hand-curated cut.** Deferred, not rejected on merits: a
  hand-curated Phoenix subset can layer on top of the two-tier rule later,
  but curation is not a launch decision and must not gate it.

## Consequences

- The two criteria become data requirements on scraped Artist nodes (issue
  #65): evidence of real tattoo work, and at least one verified-working
  contact channel for the relay.
- The booking surface needs a second, non-deposit action ("request intro")
  for the non-bookable tier; browsing and matching behavior is unchanged.
- The bookable tier is an eligibility gate in front of ADR-0005, not a change
  to it: held deposit → relay → claim transfer → 7-day auto-refund semantics
  (ADR-0005 through ADR-0008) are untouched for profiles that qualify.
- Neither tier is ever labeled "verified" (ADR-0032). Bookable means
  reachable with real work shown — nothing more.
