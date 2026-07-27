---
status: accepted
---

# One door: /design is the only consumer design entry

Launch-scope triage grill, 2026-07-27. Three generations of design surface had
accumulated as parallel destinations: the conversational design session
(`/design`, ADR-0019+), the input-first Forge (`/generate/stencil`, ADR-0018),
and the legacy guided flow (`/journey`). We collapse them into one adaptive
entry at `/design`: a single input that accepts talking or typing. Vague input
runs the bot's intake; a complete prompt skips the conversation — never the
Council. Direct prompts route through `enhanceStructured` before generation
(today's Forge bypasses the Council entirely, which is how vague one-shot
results happen), and Council extraction still produces the artist Brief on the
fast lane, with the proposal beat asking at most one confirming question when
something critical like placement is missing.

## Consequences

- Every CTA points at `/design`. This supersedes ADR-0018's "every CTA and nav
  'Forge' link points at the Forge."
- The Forge retires as a destination; it survives as the direct path and the
  shared four-cut reveal component. The name leaves the UI.
- `/journey` is deleted.
- ADR-0017 stands: the Studio remains a power room behind explicit doors, now
  reachable from any picked design.
- Route naming cleanup (the Studio at `/generate` and the Forge at
  `/generate/stencil` have crossed names/paths) is tracked in Linear, not
  blocking.
