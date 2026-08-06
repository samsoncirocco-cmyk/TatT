---
status: proposed
---

# Mapping an Idea to artists: extend the hybrid matcher, don't rebuild it

Design discussion, 2026-08-05, following the Idea graph decisions
(ADR-0055–0058). Once an Idea carries faceted descriptors and canonical style
tags, the question is how it becomes an artist recommendation — and specifically
whether that runs on vision embeddings of artists' Instagram posts.

The proposal on the table: extract vision embeddings plus structured signals per
consented post, aggregate into an artist profile with confidence and recency,
match the Idea against both portfolio embedding and tag overlap, and score with
interpretable weights (visual 40%, ontology 30%, consistency 15%, practical 10%,
novelty 5%), showing evidence posts and "matched because" tags.

Most of that already exists, which changes the question from *what to build* to
*what to change*.

## What already ships

`src/features/match-pulse/services/hybridMatchService.ts` merges Neo4j graph
traversal with vector search. `src/utils/scoreAggregation.js` scores on
interpretable weights — `visualSimilarity` 0.30, `styleAlignment` 0.25,
`location` 0.15, `rating` 0.15, `budget` 0.10, `randomVariety` 0.05 — and
`generateMatchReasoning()` already emits the "matched because" strings. The
service already zeroes the vector weight when vector search degrades, so a dead
lane doesn't dilute real graph signal.

The proposed weighting (40/30/15/10/5) and the shipped weighting
(30/25/15/15/10/5) are the same design.

## Decision

*(Proposed — four questions below are unresolved and are the owner's calls.)*

Extend the existing hybrid matcher rather than building a second one. The two
additions that do not exist today and are worth having:

- **Artist consistency.** An artist with forty blackwork pieces and one with
  three blackwork among thirty color pieces currently score identically on
  style. Consistency across a portfolio is a real signal and is absent.
- **Negative signals.** Rejected artists and rejected descriptors are not fed
  back at all. ADR-0058's `REJECTED_DESCRIPTOR` is the intended source: "hate
  the first one, too busy" should push down ornate-heavy artists, not merely
  re-roll an image.

## Open questions

1. **Is visual similarity coming back?** `visualSimilarity` is not visual today.
   `vectorDbConfig.js` records the migration — "Changed from 1408 (CLIP) → 768
   (Vertex AI text-embedding-005)" — and `scripts/migrate-to-text-embeddings.js`
   states the reason: better semantic matching between user queries and artist
   specialties. `embeddingService.ts` is text-only and validates 768 dimensions.
   Weighting 40% on vision means reversing that migration, which may well be
   right, but is a decision and not a tuning change. The `DEFAULT_WEIGHTS`
   comment still claims CLIP and is stale either way.

2. **Portfolio image sourcing is out of scope here.** Which posts may be
   embedded, and on what basis, is deferred to the existing portfolio ADRs
   (ADR-0037, ADR-0042, ADR-0043, ADR-0025) rather than re-decided in this one.
   Nothing in this ADR grants a source it does not already have.

3. **How are weights chosen with no interaction data?** Nobody has clicked an
   artist. The shipped weights are guesses; a fifth term at 5% granularity is
   precision nothing has earned. The Idea graph is what eventually makes fitting
   them possible — which argues for fewer terms until it exists.

4. **Does novelty belong in the score at all?** `randomVariety` already injects
   `Math.random()` at 5%, so the same query never ranks quite the same twice.
   The comment owns it as noise rather than signal. "Novelty" in the proposal
   may mean something sharper — deliberate exposure of unfamiliar artists —
   which is a different mechanism from a random tiebreak.

## Rejected

- **A second, separate recommender.** Rediscovers the shipped design under new
  names and leaves two scorers to keep in sync.
- **Pure visual nearest-neighbour** ("which artist image looks most similar").
  Rejected in the proposal itself and rightly: it recommends imitation rather
  than fit, and it cannot explain itself, which the match surface requires.

## Consequences

Evidence posts are the missing half of an explanation that already half-exists —
`generateMatchReasoning` says why, but shows nothing.

If visual similarity stays text-based, the faceted vocabulary of ADR-0058 is
carrying more of the matching load than the proposal assumes, and the ontology
migration becomes the higher-leverage work.
