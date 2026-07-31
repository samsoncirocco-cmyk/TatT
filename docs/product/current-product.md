---
status: current
verified_against: a8ada4c
verified_on: 2026-07-30
---

# Current product

TatT is a pre-launch tattoo decision and booking platform. A consumer can
develop an idea into generated tattoo directions, carry a selected direction
into placement review and artist matching, and continue into booking. Artists
can be discovered before joining TatT; the repository also contains claim,
availability, payout-onboarding, booking, deposit, takedown, and reinstatement
flows.

This description is deliberately broader than “AI tattoo generator” and more
careful than “tattoo operating system.” Both phrases hide where the repository
has real depth and where launch work remains.

## Product state

- Dated operator-state claims about customers, transactions, public surfaces,
  and hosted data are maintained in `docs/product/pitch-facts.md`.
- AI-provider calls and hosted data represent real cost or legal exposure when
  their configured production adapters are used.
- The route, matching, pricing, and artist-console decisions in ADR-0028
  through ADR-0031 materially landed in PRs #210 through #214.
- Product claims must still distinguish repository implementation from
  production operation and measured results.

## Consumer value

The consumer product reduces uncertainty between “I might want this tattoo”
and “I am prepared to speak with the right artist.” Its current building
blocks are:

1. Conversational or direct design input.
2. Structured intake containing placement, style, meaning, and constraints.
3. Four generated tattoo directions (“cuts” in the current UI).
4. Selection and one bounded refinement path.
5. Static placement compositing and a user-positioned live-camera overlay.
6. Artist matching and browsing.
7. Booking, reservation, deposit, and saved/shared design flows.

The generated image is not represented as the finished tattoo. The artist
owns the final tattoo design and execution; TatT carries a prepared brief and
visual direction into that relationship.

## Artist value

TatT currently supports or partially supports:

- Public artist profiles backed by a scraped national dataset.
- Artist discovery and design-aware matching.
- Human-reviewed profile claim and Stripe Connect onboarding.
- Artist-managed profile copy, location, shop, and booking link.
- Availability windows and Google Calendar conflict checking.
- Booking requests, reservation holds, deposits, and payout state.
- Public takedown and reinstatement paths.

`/console` is the free day-one artist console accepted by ADR-0031. It
consolidates bookings and status history, availability, and payout state.
Identity resolves from the signed-in user; paid business tools remain a later
expansion.

Public claim requests now stop in `pending_verification`. A signed-in first
finder cannot edit a profile, open its Connect account, route a destination
charge, or release held deposits. ADR-0033 records the Instagram-code/manual
review approval path and the artist-managed-data precedence rule.

## Brand and accepted launch direction

Brand and claim conflicts are tracked in
`docs/status/known-contradictions.md`. Implementation status and remaining
verification gaps are tracked in `docs/status/features.yaml`.

`docs/SITE_MAP.md` records the accepted launch verdict for every current page.

## Evidence

- `src/app/page.tsx`
- `src/app/design/page.tsx`
- `src/services/designConversation/index.ts`
- `src/services/designSession/index.ts`
- `src/services/generation/index.ts`
- `src/features/design-session/`
- `src/app/smart-match/page.tsx`
- `src/app/swipe/page.tsx`
- `src/app/matches/page.tsx`
- `src/app/visualize/page.tsx`
- `src/features/ar/`
- `src/app/pricing/page.tsx`
- `src/app/console/page.tsx`
- `src/app/api/checkout/route.ts`
- `src/app/api/v1/artist/availability/route.ts`
- `src/lib/artist-calendar.ts`
- `docs/adr/0024-live-ar-is-untracked.md`
- `docs/adr/0028-one-door-design-surface.md`
- `docs/adr/0029-match-step-is-the-deck-chain.md`
- `docs/adr/0030-launch-monetization-honest-pricing.md`
- `docs/adr/0031-business-offer-land-free-expand-later.md`
- `docs/adr/0033-artist-ownership-is-human-verified.md`
