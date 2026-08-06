# Pick-to-refine — implementation note

Implements ADR-0049 (two cuts a round, and the pick is the signal). Not an
ADR — the decision lives in `docs/adr/0049-*.md`; this is the map of where
the machinery landed.

## Shape

- **A round is two cuts on one axis.** `enhanceStructured` (council) now
  emits round one's pair; `enhanceRound` builds every later round's pair,
  holding all previously picked poles. The axis ladder is fixed
  (`ROUND_AXIS_LADDER` in `src/services/intake/types.ts`): bold-fine →
  color-blackwork → literal-abstract → minimal-ornate, then re-roll on
  locked poles. No hard round cap — the credit meter is the cap.
- **Rounds live on the session** (`DesignSession.rounds`,
  `src/services/designSession/types.ts`): round number, axis, both
  variation ids, picked id, timestamp, frozen flag.
- **The pick is free and changeable** until the next round is charged:
  `recordRoundPick` (orchestrator) / `POST …/[id]/round/pick`. `refineRound`
  freezes the previous pick only after both new cuts delivered.
- **One credit per round**, reserved via `reserveGenerationCredit` before
  the renders and released on failure or an ADR-0048 downgrade — web in
  `POST …/[id]/round`, SMS in `armRefineRound`/`executeRefineRound`. No
  partial-charge path: the two renders settle together and a failed round
  persists nothing.
- **The picked cut seeds the next round** as a reference through the #333
  plumbing: the cut is already a GCS object, its path is signed per render
  by `signedReferenceUrls`, and the customer's own reference photos stay
  attached after it (the picked cut leads).
- **SMS**: cuts deliver as `Cut A — <pole>` / `Cut B — <pole>` MMS with the
  A/B ask; replies A/B record the pick, REFINE arms a charged round
  (linked-account gate — a credit needs an account to belong to), BOOK
  hands off to /smart-match.

## What one render call means

The acceptance list said "one render call producing two cuts
(sampleCount 2)". The two cuts carry *different prompts* (one per pole), so
a single sampleCount=2 call cannot spread an axis — a round is two pinned
render calls treated atomically, exactly the case ADR-0048 anticipated
("if it does not batch, two cuts is two calls").

## What did not change

- ADR-0013's single refinement + Brief (`refine`) and ADR-0039's critique
  lane are untouched; the web "Lock it in" affordance bridges a round pick
  into them (the unpicked cut is the implicit most-not-you).
- ADR-0048's loud-fallback-refund rule — rounds opt into the same
  allowDowngrade + refund path the reveal uses.
