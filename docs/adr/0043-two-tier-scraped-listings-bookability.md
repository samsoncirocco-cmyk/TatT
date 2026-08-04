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

## Amendment (2026-08-04): the contact channel is a live shop website

The "Instagram, email, or phone" contact list above did not survive contact
with the data. Measured against the live graph (19,634 artists, Fizz,
PR #288):

- **Email and phone are absent** — no property, no relationship, nowhere in
  the graph. Artist email exists only after Stripe onboarding
  (`notifyArtistOfBooking` otherwise falls back to an ops inbox), so there is
  no automated channel to an unclaimed artist; relay outreach to them is a
  human step.
- **Instagram is present on 100% of profiles**, so it separates nothing —
  and it cannot be verified from outside (the login wall is identical for
  real and fabricated handles).
- **Shop websites are real and checkable**: 96.6% coverage nationally, and a
  plain HTTP probe answers before any money is taken.

**The bookable gate is therefore: real tattoo evidence AND a live shop
website** (`(:Shop).websiteLive = true`, probed and stamped by
`scripts/classify-artist-bookability.mjs`). The gate requires a *positive*
signal — unlike `artist-visibility.ts`, which coalesces missing data to
visible, an unprobed shop is an unknown shop and takes no deposits.
Visibility forgives missing data; money does not. Two tests in
`src/lib/artist-bookability.test.ts` pin this default.

Measured outcome at amendment time: Phoenix metro 164/318 bookable (51.6%),
Arizona 249/493 (50.5%) — above the ~30% recruiting-urgency line. Only AZ is
probed; all other states are browse-only until the probe runs for them.
