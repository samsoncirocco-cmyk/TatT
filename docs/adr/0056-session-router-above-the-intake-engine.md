---
status: accepted
---

# A session router decides who answers; the intake engine stays the intake specialist

Grill session, 2026-08-05. Session `0f6234e9` deadlocked: the customer said
"Redo it again and give me 4 new ones", then "Give me 4 new samples not any
particular number", and got the same canned line three times —
`WHICH_CUT_LINE`, "which one am i fixing?". `resolveCritiqueTarget` resolves a
target from an ordinal, a uniquely-carried pole word, the last critique cut, or
the session pick; none matched, so it returned `undefined` and refused to guess.
Refusing to guess is right — guessing spends a render on the wrong design. The
defect is that the critique lane is the only thing listening after the reveal,
and "re-roll the whole set" has no home in it (ADR-0039 scoped critique to a
per-cut fix).

A judgment seat already exists: `engine.ts` runs `gemini-3.1-flash-lite` on
every intake turn and logs its call — `0f6234e9`'s turn 3 recorded
`firedRule: "judgment", confidence: 0.8`. It covers intake only. Every failure
in that session happened after intake ended.

## Decision

A **session router** classifies every inbound message for the whole life of the
session, on both channels, and dispatches to the agent that should answer. The
classes it decides between: continue intake, commentary on a cut, iterate on a
cut, swap the subject, re-roll the set, start a new Idea, or ambiguous.

`engine.ts` is not replaced. It stays the intake and judgment specialist and
becomes one destination among several. The router does not re-implement its
judgment logic and does not second-guess it. `engine.ts` is only retired once
the router has demonstrably preserved that confidence path while also handling
critique, reveal and re-rolls — not before.

Abandonment is a first-class outcome: "I don't want any of these, make me four
new ones" drops the current generation set and starts another under the same
Idea. Its default is *new pictures, same Idea* (ADR-0055); only a clearly
different tattoo resets the Idea, and a genuinely ambiguous message gets a
question rather than a guess.

Every route decision is recorded with its provenance and confidence, in the
same spirit as the existing `TurnLog`.

The router is **middleware around the model call, not a larger system prompt**.
The turn pipeline is: ingest → classify and retrieve session state from the
graph → build a compact memory envelope → call the model → parse a structured
result (route, reply, proposed memory writes) → persist only the writes that
pass validation. The model stays stateless, and the context builder is the
single place that decides what memory the model is allowed to see. `providers.ts`
already has this seam — a provider chain returning a structured `RawTurnPayload`
that the engine sanitizes before anything is trusted — so the router extends an
existing pattern rather than introducing one.

## Rejected

- **Extend `engine.ts` in place.** Smallest diff, one place to look. Rejected
  because it teaches an intake engine about generation sets, re-rolls and cut
  commentary — concerns it has no business holding — and leaves the post-reveal
  surface still owned by a lane designed for per-cut fixes.
- **Replace `engine.ts` with a new multi-agent stack.** Cleanest end state.
  Rejected as a first move: it discards a working judgment path with a measured
  confidence signal, and lands on top of PR #336, which is already rewriting the
  reveal into two-cut rounds.
- **Keyword rules instead of a classifier.** Cheap and deterministic. Rejected
  on the same grounds as ADR-0046: the product is still learning what customers
  say, and a rule table freezes today's guesses. `CHATTER_PATTERN` is already a
  small instance of this and already fails on messages like "not any particular
  number".

## Consequences

One extra model call per inbound message on both channels, against a live spend
cap (`BUDGET_MAX_SPEND_CENTS`). The router is a classification, so it belongs on
the cheapest lane available — the same class of model `engine.ts` already uses,
not the generation lane.

Two things now decide per turn, and they can disagree. The boundary has to stay
explicit: the router decides *who answers*, `engine.ts` decides *what intake
says*. A router that starts rewriting intake replies has crossed it.

SMS position tracking should collapse into this. `SmsProfile.lastStage` is a
single flat string read or assigned at roughly 26 sites across a 1371-line
adapter, propped up by `IN_FLIGHT_STAGES` + `revealArmedAt` because a crashed
instance leaves it stale. Position in the Idea becomes derived state computed
from the Idea record — the same "one ladder, never two" discipline
`roundPlan.ts` already applies to the round axis. Only the in-flight lock stays
channel-local, because "a render is running on this phone right now" is a
concurrency guard, not a position.
