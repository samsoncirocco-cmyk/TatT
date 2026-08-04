---
status: accepted
---

# SketchBot owns the toolkit; the customer never picks a mode

Grill session, 2026-08-03. The multi-character measurements (ADR-0023's lanes,
measured this week: Imagen 92% cast completeness vs Flux 48%) forced a product
question: when a customer asks for a four-character sleeve, is the answer one
routed render, a piece-by-piece builder, or a customer-facing choice between
them? The stated reference point is talktoveri.com — one consultant that knows
its own tools, not a dashboard of modes.

## Decision

SketchBot is the single intelligence that selects the tool for the request.
One-shot render, piece-by-piece build, critique re-cut, stencil derivation,
and placement preview are tools in its kit — on SMS and web equally — and the
customer never sees or selects a "mode." They describe a tattoo; SketchBot
decides how it gets made.

## Rejected

- **Customer-facing mode selection** (a "builder" button, a "simple/advanced"
  switch). Contradicts the one-door lesson of ADR-0028: co-equal entrances
  leak, and a first-timer cannot be asked to know which machinery their
  request needs.
- **Fixed tier routing** (1–2 subjects → single render; 3+ → builder;
  escalation on demand). Recommended during the session on cost grounds and
  rejected by the owner: the product is in a learning phase, and a
  deterministic tier table hard-codes today's guesses about which requests
  deserve which spend.

## Consequences

Tool selection becomes conversational judgment, which is harder to test than
a routing table — it needs transcript-based evaluation once real sessions
exist. Channel parity becomes a standing requirement: any tool added to one
surface is owed to the other (the SMS parity work of 2026-08-03 is the
floor, not a one-off).
