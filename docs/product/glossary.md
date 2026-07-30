---
status: current
verified_against: 2131a00
verified_on: 2026-07-27
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

**Studio** — The multi-layer editing surface currently at `/generate`. It is a
power tool, not the accepted primary launch entry.

**Claim** — The process by which an artist takes control of a scraped profile
and becomes eligible for payout onboarding.

**Booking relay** — State used when a customer books an unclaimed artist and
funds must be held pending claim or refunded after expiry.
