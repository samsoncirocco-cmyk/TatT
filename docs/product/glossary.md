---
status: current
verified_against: 0e2ad0a
verified_on: 2026-07-30
---

# Product glossary

**Intake** — Conversational extraction of placement, style, meaning,
references, and constraints.

**Brief** — The structured record carried toward generation, matching, and the
artist relationship.

**Council** — The module that improves or structures generation intent before
an image provider is called.

**Proposal** — The summary-and-confirmation beat before generation.

**Reveal** — Four deliberately varied tattoo directions.

**Cut** — Current UI language for one generated tattoo direction.

**Refinement** — One bounded post-selection revision path.

**Toolkit** — The set of tools SketchBot selects between per request:
one-shot render, piece-by-piece builder, critique re-cut, stencil,
placement preview. Selection is SketchBot's judgment, never a
customer-facing mode (ADR-0044, ADR-0046).

**One-shot render** — A design generated as a single image in one provider
call. The default tool; also the only tool that can make characters
*interact* (an action scene needs one render).

**Builder** — The piece-by-piece path for larger tattoos: each element
generated and approved individually, then assembled. Decided (ADR-0044–0046)
but not yet built; the layer machinery behind Studio gear 3 is its
foundation.

**Assembly** — The builder's final step: SketchBot proposes a composed
layout and the customer adjusts it in words on any channel; the web canvas
additionally allows dragging (ADR-0045).

**Placement preview** — Static photo compositing or a manually positioned
camera overlay. It does not imply anatomical tracking, depth mapping, or
measurement accuracy.

**AR Mirror** — The live-camera variant of placement preview, at `/visualize`
(`src/features/ar/`). The user drags, scales, and rotates a saved design onto
their own camera feed, then captures a still or short clip to share to a
group chat. _Avoid_: "AR" here means live camera compositing only — do not
imply body tracking, depth estimation, perspective correction, or
measurement-grade accuracy. ADR-0024 removed the MindAR-based tracking spec as
unbuildable and untracked by design.

**Matching** — Design- and preference-aware artist discovery using semantic,
graph, and interaction evidence.

**Smart-match/swipe chain** — The accepted launch matching journey: collect
preferences in `/smart-match`, then review design-aware artist cards in
`/swipe`.

**Forge** — Legacy UI name for the direct design surface currently at
`/generate/stencil`. ADR-0028 retires the name from the launch UI.

**Studio** — The refinery at `/studio` (ADR-0038): where a picked design goes
from *almost* to *yes*. Entered from a picked design (`/studio?design=<id>`),
never from cold, so it appears in no nav or footer — the design library is its
door. `/generate` redirects here.

**Claim** — The process by which an artist takes control of a scraped profile
and becomes eligible for payout onboarding.

**Booking relay** — State used when a customer books an unclaimed artist and
funds must be held pending claim or refunded after expiry.
