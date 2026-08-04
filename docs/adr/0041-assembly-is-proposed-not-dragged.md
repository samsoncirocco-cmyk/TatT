---
status: accepted
---

# Assembly: SketchBot proposes the layout; the customer reacts in words

Grill session, 2026-08-03. The piece-by-piece builder (the original intent of
/generate, reduced to a repair bench by ADR-0028/0038) ends with approved
pieces that someone must arrange into the final tattoo. The web has a canvas;
SMS has only words and pictures. docs/sleeve-forge-plan.md (2026-05) assumed
the human composes on a canvas, which would strand SMS at the last step.

## Decision

SketchBot proposes the arrangement — a composed canvas sent as an image — and
the customer adjusts it in words ("swap Riku and Sora", "make Roxas bigger"),
identically on SMS and web. The web canvas additionally allows direct
dragging on top of the proposal. Words are the contract; drag is an
enhancement.

## Rejected

- **Web-canvas-only assembly**, with SMS texters handed a link when it is
  time to arrange. Breaks channel parity at the exact moment the customer is
  most engaged, and contradicts ADR-0040.
- **Fully automatic assembly** with no customer input. The arrangement of a
  sleeve is a preference-laden decision the customer is best placed to make,
  and the artist consult still owns final placement — over-building
  automation here buys nothing.

## Consequences

A layout-proposal step needs to exist server-side (compose approved pieces
onto a placement-shaped canvas), and the word-level adjustment vocabulary
("bigger", "swap", "higher") becomes a parsed contract like the pick and
critique vocabularies before it. Known boundary, inherited from the builder
itself: separately generated pieces can be arranged but cannot interact —
crossing keyblades still requires a single render, and SketchBot's tool
choice (ADR-0040) must know that.
