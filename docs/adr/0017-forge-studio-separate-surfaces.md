# Forge and Studio are separate surfaces; the Forge is the product

Decided 2026-07-22 (grill session on issue #102, with Samson).

The Forge (`/generate/stencil` — prompt → four cuts → find artists) covers the
entire soft-launch journey on its own and is the surface every CTA and nav
"Forge" link points at. The Studio (`/generate` — multi-layer Konva editor with
placement, transforms, and layer decomposition) remains a separate power tool,
reachable only through explicit doors: the nav/footer "Studio" links, the cut
cards' "Layers" action, and the Forge's "Open Studio" button.

Neither surface pretends to be the other: they have distinct names everywhere
in the UI (nav, dock-less chrome, footer, headlines, error pages) since commit
064504c.

## Considered Options

- **Absorb the Studio into the Forge flow now** — rejected: a large rebuild
  (the Studio is ~1,800 lines around a canvas editor) for zero soft-launch
  gain; the north-star journey (idea → design → artist → booking) never
  requires layer editing.
- **Absorb gradually** (rebuild each wanted editing feature inside the Forge
  until the Studio is empty) — rejected for now: speculative work ahead of
  demand. If real users hit the "Layers" door and ask for editing, that demand
  tells us exactly which features to port — decide then, with evidence.
- **Keep separate** — chosen. Cheapest, honest, reversible. If no real user
  ever opens the Studio, delete it; if they do, port what they asked for.

## Consequences

- The Forge gets all conversion/UX investment (see ADR-0018); the Studio gets
  none until demand shows up.
- Studio usage is the signal to watch: entries via "Layers"/"Open Studio"
  justify either investment or deletion. No new links to `/generate` should be
  added to the main journey.
- The old habit of calling both pages "Forge" is retired; docs and code
  comments should use the two names precisely (see CONTEXT.md).
