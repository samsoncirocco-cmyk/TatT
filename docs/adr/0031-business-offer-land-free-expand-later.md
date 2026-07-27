---
status: accepted
---

# Day-one business offer: land free, expand later

Launch-scope triage grill, 2026-07-27. With ~7,828 scraped artist profiles, the
launch motion toward businesses is land-free/expand-paid: claiming a profile is
free, the artist receives 100% of deposits (ADR-0007, the client pays the
booking fee), and the day-one artist product is a minimal artist console —
bookings list, availability, payout status. Today no such console exists:
`/dashboard` redirects to the consumer design library, and booking
`statusHistory` is recorded but surfaced nowhere (TAT-24).

The artist SaaS subscription (backend built, dormant; TAT-17) sells
post-launch, once the console gives it something to upsell. Prerequisites for
the free rung are the claim-flow blockers: embedded Connect onboarding never
renders (TAT-16) and claiming has no identity check (TAT-25).

Rejected: requiring a subscription for bookings at launch (kills claim
conversion for an unproven marketplace), and a consumer-only launch (leaves the
claim blockers unfixed while held deposits depend on artists being able to
claim).
