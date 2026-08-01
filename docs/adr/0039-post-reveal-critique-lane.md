---
status: accepted
---

# The chat survives the reveal: a bounded critique lane in the one door

TAT-58, owner request 2026-07-31: *"i also want to be able to continue the
chat on the website after the first 4 cuts are delivered. that way i can tell
them whats wrong with it!!"*

Today the conversation dies at the reveal, twice over. `converse()` refuses any
turn once the phase leaves `'intake'`, and the reveal UI renders no reply box
at all — the only inputs left are two taps (pick, most-not-you) and one canned
question ("Too bold, or not bold enough?") whose answer is regex-matched into a
fixed template. A person looking at four cuts and thinking *riku's missing* has
nowhere to put that sentence, and if they force it into the refinement box it
scores as neither "intensify" nor "soften" and silently becomes "a cleaner,
more considered execution of the same treatment". The critique is not merely
unanswered; it is discarded.

## Decision

The reply box stays on screen after the reveal. Post-reveal messages run
through a **critique lane** — a new, deliberately deterministic turn inside the
design session (`internal/critique.ts`) — which resolves *which cut* the
critique is about, folds the user's own words into that cut's prompt, and
regenerates **one** image on the session's pinned model (ADR-0016). The new cut
lands beside the four and is pickable, so the loop closes where it started.

## Why not the Studio, which is already the refinery

ADR-0038 is right that refinement belongs in the Studio, and this ADR does not
reopen it — but the Studio's gear 1 is *point and say*: circle a region, redraw
that region, masked inpainting underneath. That machinery is spatial. It fixes
a mangled hand. It cannot act on the three sentences the owner actually typed:

- *"riku's missing"* — there is no region to circle; the fix is a **composition
  that never contained him**.
- *"too busy"* — the complaint is the whole frame, not a square inch of it.
- *"the third one but less color"* — this is not a fix to an image at all, it
  is a **re-cut of a different variation**.

All three are prompt-level, and all three arrive *before* a design has been
picked — which is exactly the moment the Studio, by its own rule, refuses to
open ("entered from a picked design, never from cold"). Routing them to the
Studio would mean telling someone to pick a cut they just said was wrong. So
this is genuinely missing from `/design` rather than duplicated from `/studio`,
and the split holds: **`/design` re-cuts the composition, `/studio` repairs the
image.**

## Why not the conversation engine

`designConversation` does one job well: an LLM turn that doubles as incremental
extraction into an `IntakeRecord`, governed by the ADR-0021 cadence toward a
proposal. Post-reveal there is no record left to fill and no proposal left to
reach; feeding critique through it would mean a second persona, a second result
shape, and a cadence counter that means nothing here. The critique lane is
therefore deterministic — the same choice `internal/refinement.ts` and
`designConversation/internal/intent.ts` already make, for the same reason: a
fixed vocabulary is cheaper, testable, and cannot hallucinate a fix. It is not a
second chat engine: it speaks in SketchBot's voice, writes to the same
transcript, and renders through the same bubbles.

The default is to **act**. Only a tight set of non-actionable messages (bare
thanks, a bare affirmation, a greeting) is treated as chatter; everything else
is a fix request, because someone who typed a sentence at a design they dislike
meant it. The user's words are appended verbatim (ADR-0010), with a concrete
directive added when the critique matches a known cue ("too busy" → fewer
elements and more negative space).

## ADR-0013 is narrowed, not repealed

ADR-0013's hard stop exists so the product does not become "an AI toy people
play with and never book from", and its enforcement point is *the Brief*: pick
→ one refinement question → one regen → handoff, exactly once. That stays
untouched. What changes is that the ADR-0013 round is no longer the **only**
place a sentence can land, because ADR-0038 already conceded the underlying
point — a design carries a bounded, env-tunable fix allowance, and the ceiling
is a booking prompt, not a paywall. This ADR applies that same allowance one
room earlier.

Consequently the critique lane is closed at phase `'complete'`: once the Brief
exists, the hard stop has fired and the Studio and the artist own everything
after.

## Bounded, metered, and spoken

- The allowance is the **same knob** as the Studio's —
  `resolveFixAllowance()` / `NEXT_PUBLIC_STUDIO_FIX_ALLOWANCE`, default 25 — but
  counted **server-side on the session record** rather than in `localStorage`,
  because unlike the Studio this room has a server session to count on, and a
  fence in front of paid renders should not be a browser value.
- Every cut is one image on the pinned model, through
  `/api/v1/design-session/[id]/critique`, which carries the same auth, the same
  generation rate limit, and the same `checkBudget`/`recordSpend` policy as
  `/confirm` and `/refine`. Spend is recorded only when a render actually ran —
  a chatter turn costs nothing.
- The ceiling is spoken in voice and ends in the artist, per ADR-0038. It is
  never a meter and never a purchase prompt (ADR-0030).

Worst case a session now costs four reveal renders + 25 fixes + one refinement
= 30 renders instead of five. That is the price of the sentence landing, and
it is bounded, metered, and tunable to zero by env. ADR-0038 records Samson's
2026-08-01 allowance decision and the global-budget rationale.

## Considered and rejected

- **Re-cutting all four on every critique** — 4× the spend per sentence, and it
  throws away the cuts the user did not complain about.
- **Sending the critique back through Council for a full re-enhance** — a
  second paid model call per turn to rewrite a prompt that the user already
  wrote the fix for.
- **An LLM critique classifier** — cost and a hallucination surface in front of
  a paid render, for a job a cue table does deterministically.
- **Letting the critique lane also produce the Brief** — that is ADR-0013's
  round, and collapsing them would leave no moment where the product says the
  artist is next.
