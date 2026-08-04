---
status: accepted
---

# The builder fires on SketchBot's judgment, not a cast-size rule

Grill session, 2026-08-03. Given ADR-0040 (SketchBot picks the tool), the
remaining question was what signal sends a request down the piece-by-piece
path instead of a single render. The measured backdrop: Imagen returns a
complete 3+ cast 92% of the time, so a single render is *usually* right even
for ensembles — which made a cheap deterministic answer genuinely available.

## Decision

SketchBot decides from the conversation — no fixed cast-size threshold, no
mandatory composite-first step. A four-character request may go piece-first
immediately; a six-element request may get one render; the deciding inputs
are what the customer says they want to control, not a count.

Explicitly part of this decision, owner's words: **spend is not the
constraint right now.** The product is being built to learn what works, not
to protect margins. `BUDGET_MAX_SPEND_CENTS` remains the hard backstop;
nothing else is cost-optimized.

## Rejected

- **Hard rule: 3+ named characters → piece-first.** Testable and predictable,
  but hard-codes a guess about which requests need control before any real
  usage exists.
- **One-shot first, escalate on demand** (composite immediately, builder only
  when the customer wants to change one piece). The session's recommendation
  on cost grounds; rejected because it optimizes for margin during a phase
  whose purpose is discovering what customers actually do.

## Consequences

Judgment is untestable until transcripts exist — misfires are expected and
are themselves the learning data. When real usage arrives, this decision
should be revisited against it (the same "invest or delete on real usage"
posture as ADR-0017/0038). The cast-completeness harness
(`scripts/measure-cast.mjs`) stays the acceptance gate for whatever the
render path is on any given day.
