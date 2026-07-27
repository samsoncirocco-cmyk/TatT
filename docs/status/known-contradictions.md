---
status: current
verified_against: 8db5d3e
verified_on: 2026-07-27
---

# Known contradictions

These conflicts are visible rather than “resolved” through whichever document
an author happened to open first.

## Brand

- Current UI: TatT, “Think it. Ink it.”
- ADR-0004: TattTester is the accepted primary mark.
- Old pitch deck: TatT is a working name.

Required decision: reaffirm and implement ADR-0004, or supersede it and retain
TatT. Until then, current-state documentation names the implemented UI and
links the accepted but unimplemented brand decision.

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

## ADR numbering

Two files currently use the `0026` prefix:

- `0026-money-in-cents-reject-out-of-range.md`
- `0026-reinstatement-self-signup.md`

Required decision: renumber one ADR without changing its substantive history,
then update inbound references.
