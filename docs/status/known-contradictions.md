---
status: current
verified_against: 86e1c18
verified_on: 2026-07-30
---

# Known contradictions

These conflicts are visible rather than “resolved” through whichever document
an author happened to open first.

## Brand — RESOLVED 2026-07-27

- Commits `6cb6dd4` ("flip every user-facing TatT to TattTester", TAT-43) and
  `d5c0d7c` (canonical URL tags point at tatttester.com) implemented
  ADR-0004/ADR-0033: `src/app/layout.tsx` now titles the app "TattTester —
  Think it. Ink it.", `TattTesterWordmark.tsx` renders the TattTester mark,
  and the marketing copy across the app follows the same law.
- `TatT` survives only as internal/code-identifier usage (`package.json` name
  `tatt-app`, code comments, route/module names) — the commit message
  explicitly scopes that carve-out.
- This section previously described the brand as unresolved based on a
  verification snapshot from `8db5d3e` (2026-07-27, same day as the fix but
  apparently just before it landed). No further decision is required unless
  the carve-out itself needs revisiting.

## Fundraising ask

- Google Slides deck: $750K Seed.
- Retired repository pitch page: $500K Seed.
- YC demo script: $2.5M Seed.

Required decision: founder-confirmed amount, round label, use of funds, runway,
and milestones.

## Placement terminology

- Current honest implementation: static photo compositing and manually
  positioned camera overlay.
- Older documents: AR body tracking, depth mapping, and placement accuracy.

Resolution: ADR-0024 is authoritative. Older claims are historical and must
not be repeated.

## Artist and image counts

Counts vary among `README.md`, `CLAUDE.md`, handoffs, cleanup reports, and
research material.

Required procedure: compute counts from the active production source at the
time of publication and include the query date. Do not copy a number from a
handoff.

## Artist verification

- Archived session recap: fake `Math.random()` artist verification was replaced
  by real Gemini calls.
- Repository at `8db5d3e`: both legacy validator scripts still simulated every
  result, including the branch selected when `GEMINI_API_KEY` was present.
- ADR-0032: those validators and their direct automation are retired. Current
  acquisition yields discovered candidates, not verified professionals.

Resolution: do not reuse a `verified` value produced by the retired pipeline.
Future verification must include its evidence and method; identity and media
consent remain separate gates.

## Deposit amount — RESOLVED 2026-08-03

- The 2026-07-20 grill recorded a flat ~$25 booking deposit; the shipped code
  (`DEPOSIT_CENTS_BY_SIZE` in `src/lib/booking.ts`) charges $75/$150/$300/$500
  by tattoo size.
- ADR-0040 (2026-08-03 grill) is authoritative: deposits are tiered by size,
  exactly as shipped. The flat-$25 decision is struck and must not be
  repeated.

## Consumer free tier and subscription copy — RESOLVED 2026-08-03

- Older copy and design artifacts describe "5 generations / month free" (or 3
  designs/month) plus a "$19 Pro" (or $12 Pro) consumer subscription. No code
  ever backed these.
- ADR-0041 (2026-08-03 grill) is authoritative: 25 free generations lifetime
  per user, identical across web and SMS and enforced server-side, then a
  single $10/25-generation credit pack via one-off Stripe Checkout. There is
  no consumer subscription; that lane is parked. Enforcement build work is
  tracked in GitHub issue #80.
- Old pitch scripts and design specs retain the dead copy as history with
  superseded notices; do not reuse it.

## ADR numbering — RESOLVED 2026-07-30

Two files used the `0026` prefix. `0026-reinstatement-self-signup.md` has 11
inbound references across code and docs and kept its number.
`0026-money-in-cents-reject-out-of-range.md` had no inbound references beyond
this file, so it was renamed to `0038-money-in-cents-reject-out-of-range.md`
(the next free number; ADRs run through `0037`). No other file required a
reference update.
