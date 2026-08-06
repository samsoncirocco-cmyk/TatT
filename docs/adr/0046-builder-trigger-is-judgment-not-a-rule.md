---
status: accepted
---

# The builder fires on SketchBot's judgment, not a cast-size rule

Grill session, 2026-08-03. Given ADR-0044 (SketchBot picks the tool), the
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

---

## Amendment — 2026-08-04: both supports have moved

Two of this ADR's supports have gone. The decision itself stands; its
stated reasoning no longer does, and a future reader should not inherit
either claim unqualified.

**1. "Spend is not the constraint" is no longer true from the customer's
side.** ADR-0041 — decided the same day, in a different session — gives each
customer **25 lifetime free generations**, enforced server-side on one
counter across SMS and web. Our willingness to spend during a learning phase
is unchanged; what changed is that generations became a scarce resource the
*customer* can exhaust and can see.

That matters specifically for this decision, because the alternative
rejected below — *one-shot first, escalate on demand* — was rejected on the
grounds that it "optimizes for margin." Under ADR-0041 it is not a margin
optimization at all; it is a way of not spending a stranger's lifetime
allowance before they have seen anything. The rejection's reasoning is void
even if its conclusion survives.

The concrete question this raises is already written up and still undecided:
`docs/design/builder-as-conversation.md` §6.2 — a four-piece build with two
redos is 6+ renders, roughly a quarter of a customer's free allowance for
one tattoo. Whether builder pieces count one-for-one, as a fixed number, or
as one is an owner call, not a guess. **This ADR should be revisited at the
same time that call is made**, because "judgment decides, unconstrained" and
"25 lifetime generations" cannot both be fully true.

**2. The 92% figure in the context above measured a model that is being
retired.** It was `imagen-3.0-generate-001`; Google is retiring every
`imagen-*` endpoint (announced 2026-08-17) and the Vertex provider moved to
`gemini-3.1-flash-image` (#277). The re-measurement on the live lanes (#293)
found **Flux 39–49%** and **gemini-3.1-flash-image 100%** on 3+ character
requests, and cast size now routes to the Gemini lane (#314,
`castSize >= 3`).

This *strengthens* the decision rather than weakening it: the quality
argument for going piece-first is now weaker than it looked on 2026-08-03,
which leaves control — not correctness — as the builder's whole
justification. That is the framing `builder-as-conversation.md` already
adopts.
