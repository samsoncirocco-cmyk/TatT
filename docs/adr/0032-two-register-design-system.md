---
status: accepted
---

# Two-register design system: punk face, calm hands

Facelift grill, 2026-07-27. The site's customer is an anxious first-timer about
to make a permanent decision and hand over a deposit; the brand is pop-punk
(loosely anchored on the *Tickets to My Downfall* era: pink-on-black, DIY tape
and scrawl, vulnerability under the attitude — **aesthetic inspiration only**,
no artist references, artwork echoes, or lyric borrowings anywhere). Those two
facts resolve into one system: **one brand, two volumes.**

- **Loud (the punk face)** — home, `/design` session shell, the reveal,
  `/gallery`, `/artists` browse, `/visualize`, `/about`, and the `/swipe` deck.
- **Quiet (the calm hands)** — every commitment surface: `/book` + slot
  picking, deposit checkout, `/book/success`, `/bookings`, `/claim` +
  onboarding, `/console`, `/settings`, `/pricing`, `/legal/*`, `/login`,
  `/signup`. The register flips the moment a screen asks for commitment —
  money, identity, or legal — and not before.
- **Hybrids, deliberately:** the swipe deck stays loud but its Book CTA and
  confirm sheet speak quiet; the artist profile is loud showcase above a quiet
  booking module.
- **Quiet means quiet dark** — the same black world with the volume down (warm
  grays, generous space, no pink shouting, no tape), never a light-theme flip
  mid-funnel. A light "receipt" card is permitted as the single accent for a
  final money summary. Rejected: full light calm screens (theme flip right
  before the Stripe-hosted checkout reads as leaving the site, and costs a
  light fork of shared components).
- **Copy obeys the same registers.** Voice everywhere is the *pop-punk
  confidant* — the tattooed friend who's been through it: attitude on loud
  surfaces, plainly warm exactness on quiet ones, one persona in both.

Process rule while the facelift runs: **preview gate** — every facelift PR
carries its Vercel preview link and the list of changed routes; Samson approves
the look before merge (code review does not substitute for taste approval).

Working spec for implementers: `docs/design/facelift-spec.md`.
