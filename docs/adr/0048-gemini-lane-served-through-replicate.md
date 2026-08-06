---
status: accepted
---

# The Gemini lane is served through Replicate, and a silent downgrade refunds

Owner interview, 2026-08-05 (TattTester Buzz channel). Decided by Samson.
Answers the routing letter left open since the #293 bake-off.

## Context

The #293 bake-off measured three lanes on the same corpus (n≈20 per arm),
scoring whether every requested character appeared:

| lane | gets the whole cast | writes unwanted words |
|---|---|---|
| Gemini 3.1 Flash Image | 100% | 30% |
| Imagen 4 via Replicate | 85% | 22% |
| Flux dev (then in production) | 39-49% | 20% |

Text intrusion is universal, so it is the render text guard's problem
(ADR-0047), not a routing tiebreak. On cast completeness Gemini wins outright,
and #314 shipped that routing: `castSize >= 3` pins to the model key
`imagen3`, which `inferProvider` sends to `vertex-ai`, which
`vertexImagen.ts` resolves to `gemini-3.1-flash-image`.

Two objections were on the record against that choice and neither was
answered before it merged:

- **Vertex quota.** The bake-off hit 429s at roughly twenty images per arm.
  Nothing in the route says what a customer sees when that happens.
- **A second provider bill and a Google dependency**, which was the whole case
  for the Imagen-via-Replicate alternative at 85% completeness.

## The decision

**Serve the Gemini lane through Replicate (`google/nano-banana-2`), not
Vertex.** `google/nano-banana-2` *is* Gemini 3.1 Flash Image — the same model
the bake-off measured, behind a different front door.

Both objections dissolve rather than being traded off:

- The 429s were a **serving-layer** property, not a model property. Replicate
  absorbs quota management.
- There is no second bill and no direct Google dependency, so the
  Imagen-via-Replicate alternative is strictly dominated: same provider, same
  plumbing, 15 points worse on the only axis that separated the lanes.

**And a downgrade is never silent.** When the cast route falls back off the
Gemini lane, the customer is told and the reserved credit is released
(`releaseGenerationCredit`). This is a rule, not an implementation detail:
under ADR-0049 a round is metered, so a quiet fallback to a lane that drops
three characters in five is charging someone for a worse product.

*Correction to an earlier reading of this file, found while implementing:* the
reveal path sets `allowProviderFallback: false` (`orchestrator.ts`), so there
is no silent downgrade to make loud — today a cast-lane failure fails the whole
reveal. The rule above therefore specifies a **new** behaviour, loud from
birth, rather than fixing an existing quiet one. The decision is unchanged; the
premise was wrong.

`imagen3` is retained as a config alias but is no longer the cast route's
model key; the name never described what it resolved to.

## Rejected alternatives

- **Imagen 4 via Replicate (letter option B).** Its only advantage was
  avoiding Vertex. Routing Gemini through Replicate takes that advantage
  without giving up 15 points of cast completeness.
- **Keep Flux for everything (letter option C).** Loses three of every five
  characters on ensemble requests. Under ADR-0049's two cuts per round there
  are fewer chances to get the cast right, not more, so this got worse.
- **A bespoke 429 handler on the Vertex path.** `MODEL_FALLBACK_CHAIN` already
  exists. The gap was never the fallback mechanism; it was that the mechanism
  is silent.
- **Silent fallback to Flux.** The default behaviour if nobody specifies, and
  the one that reintroduces the exact failure this routing exists to fix.

## What is deliberately not settled here

- **Price per image on Replicate** is not published on the model page. One
  test run settles it; the decision does not turn on it, because the Vertex
  path was not free either.
- **Whether nano-banana-2 returns multiple images per call.** If it does not,
  two cuts is two calls — a latency-budget question for the confirm route's
  300s ceiling, not a routing question.
- **Whether 100% cast completeness transfers from Vertex to Replicate.** Same
  weights, different serving layer and possibly different defaults. Re-running
  the #293 cast corpus through Replicate before the switch is cheap and is the
  precondition for this ADR taking effect in code.

## Consequences

- The render text guard keeps working across the switch for a reason worth
  naming: `resolveImagePayload` was hardened for Replicate's hosted HTTPS
  URLs after it was found silently skipping every Flux render. The Replicate
  path is the payload shape the guard was fixed against.
- ADR-0049's reference-image round gets first-class support —
  nano-banana-2 accepts reference images for editing.
- The route result needs to carry whether a downgrade happened, so the reveal
  can say so and the credit can be released. That flag is new; the refund
  primitive is not.
