---
status: accepted
---

# Two cuts a round, and the pick is the signal

Owner interview, 2026-08-05 (TattTester Buzz channel). Decided by Samson:
*"why don't we switch it to 2 cuts across the board vs 4 and use that as
information for which way the customer is leaning as we make the next round of
cuts... now that we have a reference image they somewhat like."*

## Context

The reveal hands back four cuts at once. `revealCutNames.ts` names them from
their axis positions — the bold one, the fine-line one, the full-color one,
the blackwork one — so four cuts spread the customer across **two axes
simultaneously**. They pick one and the run is essentially over: ADR-0039's
critique lane can re-cut from words they type, but a **silent pick** — a tap
with no complaint attached — carries no information anywhere. The next render
does not know which cut they chose, and does not see it.

That is a lottery, not a conversation. Four tickets, one draw.

## The decision

**A round is two cuts, spread on one axis. The pick chooses a pole, and the
picked image seeds the next round as a reference.**

Round one spreads on a single axis and asks, implicitly, one question: this
way or that way. The pick answers it. Round two holds the chosen pole, spreads
on the next axis, and passes the picked image in as a reference so the second
pair is a refinement of something they already half-like rather than a fresh
draw from the same prompt.

The design space is searched by halving it, and the customer never has to
articulate why — the tap is the answer.

**Each round costs one generation credit.** ADR-0041's 25 lifetime free
generations are unchanged in count; what a credit buys changes from "one
reveal of four cuts" to "one round of two cuts".

## Why per-round metering, given it buys the customer less per credit

It was argued here that one credit should buy the whole loop — that a credit
should buy an outcome, not a button press. Samson chose per-round, on the
grounds that 25 is a generous start. The stronger argument is the one about
cost rather than generosity:

| | images a free user can consume |
|---|---|
| today (25 credits × 4 cuts) | 100 |
| per-round (25 credits × 2 cuts) | 50 |

Per-round metering **halves worst-case free-tier exposure** while keeping the
rule explainable in one sentence: one credit, one round, two cuts. Bundling
the refine round would have kept exposure at today's level and made the meter
harder to describe.

## Consequences

- **A silent pick becomes a recorded signal.** This is the genuinely new
  machinery; the rest is adjustment. ADR-0039 stands unchanged — typed
  critique still re-cuts — this adds the case where nothing is typed.
- **Round two is image-to-image.** Under ADR-0048 the cast lane is
  `google/nano-banana-2`, which takes reference images natively, so the
  picked cut is a first-class input rather than a bolt-on.
- **Cast completeness matters more, not less.** Two cuts is two chances to
  get an ensemble right where there were four. This tightened rather than
  relaxed the ADR-0048 routing argument.
- **"Four cuts" is load-bearing copy in sixteen source files**, plus the SMS
  MMS delivery, the share flow, `revealCutNames.ts`, ADR-0017 and the
  facelift spec. `sampleCount` is already a parameter capped at 4
  (`generate/route.ts`), so the render call is a one-line change and the copy
  is the actual work.
- **The confirm route's 300s timeout comment is sized for "four renders +
  council"** and needs re-reading, in the direction of more headroom rather
  than less if the Replicate lane turns out not to batch.

## What is deliberately not settled here

- **Which axis leads.** Round one has to spread on *some* axis, and nothing
  measured says which question is most worth asking first. Bold/fine is the
  obvious candidate because it is the most visible difference to an untrained
  eye, but that is taste, not evidence.
- **How many rounds before the loop ends.** Two rounds is what was described;
  nothing here caps a third.
