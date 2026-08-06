---
status: accepted
---

# The vocabulary is faceted, not a style list; canonical terms stay human-governed

Grill session, 2026-08-05. Session `0f6234e9` produced two kinds of words.
`blackwork` is a real style tag: it is in `data/style-ontology.json`, it joins
straight to `:Artist SPECIALIZES_IN`. But `punk`, `crying`, `hard dark lines`
and `not a lot of detail` are at least as good a description of the tattoo the
customer actually wanted, and none of them match anything in the graph.

Filing all four under "style" is what makes them unmatchable. They are not the
same kind of word: one is a style, one is a mood, one is linework, one is a
detail constraint. A single flat style list has nowhere to put three of them.

ADR-0011 already governs the ontology: nothing enters `style-ontology.json`
except through human review — `propose-ontology-candidates.mjs --approve`,
`--merge`, `--reject`, run by a person, every time.

## Decision

**The vocabulary is faceted.** Every term is filed under one of:

| Facet | Example from `0f6234e9` |
|---|---|
| style | `blackwork` |
| subject / character | `Nelson Muntz`, `Homer Simpson` |
| motif | `tear` |
| composition | vertical, runs the length of the arm |
| linework | `hard dark lines`, `simple linework` |
| color | monochrome |
| texture / detail | `not a lot of detail` |
| mood / action | `punk`, `crying` |
| placement | `right arm` |
| scale | — |
| hard constraint | `must not clash with greek myth work` |

Four of these facets already exist in the code as variation axes:
`bold-fine` is linework, `color-blackwork` is color, `minimal-ornate` is
texture/detail, `literal-abstract` is mood/abstraction. The axis ladder and the
ontology are the same vocabulary seen from two directions, and they should not
drift into two vocabularies.

**Two tiers cut across every facet.** Canonical terms are closed and
human-governed under ADR-0011, and are the only vocabulary artist matching runs
on. Idea-level **descriptors** are free text, carry a facet, steer prompt
generation, and never join artists. Each descriptor records provenance (turn,
agent, channel), confidence, and recurrence.

**Relations are named, so the router can see what changed:**

- `INSPIRED_BY` — the reference that started it ("a tattoo of Nelson I saw")
- `DEPICTS` — Idea to its current subject
- `USES_STYLE` — Idea to a canonical style term
- `HAS_CONSTRAINT` — the hard constraints that must survive every iteration
- `REJECTED_DESCRIPTOR` — what they moved off, and when

Recurring descriptors are queued as candidates for ADR-0011 human review, per
facet. "punk" can become canonical eventually; it cannot become canonical
tonight, and not without a person. Promotion needs a kill switch: an approved
term that turns out to be noise must be demotable, and demotion must revert what
it changed.

## Rejected

- **A flat style list, ontology terms only.** What exists today. Rejected
  because it discards most of what customers say — `0f6234e9` would have kept
  `blackwork` and thrown away nearly the entire brief — and because it has no
  slot for the words it discards even if we wanted to keep them.
- **Free descriptors with no facet.** Simpler to write. Rejected because an
  unfaceted bag cannot tell the router that "simple linework" changed the same
  dimension the `bold-fine` axis is already varying, which is precisely the
  contradiction that needs detecting.
- **One tier with automatic promotion.** Fastest-growing vocabulary, no human in
  the path. Rejected because it overrides ADR-0011 by side effect; if we ever
  want it, that ADR gets amended deliberately.
- **Free descriptors treated as weak style tags for matching.** Rejected because
  it degrades matching with unvetted vocabulary, and matching is where being
  wrong costs a real booking.

## Consequences

The gap between what an Idea *declares* and what its cuts *actually* contain
becomes measurable per facet. `0f6234e9` is the live example: intake recorded
`styleTags: ["blackwork"]` while simultaneously listing `color-blackwork` as
unresolved, and the reveal acted on both — every prompt led with "Monochrome,
black and grey ink only, zero color" while two of four also asked for "vibrant
full-color palette". Under a faceted vocabulary that is a color-facet conflict
detectable before spending a render, rather than something a human notices in
the output.

`data/style-ontology.json` is now one facet of a larger vocabulary, not the
vocabulary. Either it grows facets or the faceted terms live beside it — that
migration is unresolved and is the first real implementation question.

The review queue is load-bearing. If nobody works it, descriptors accumulate and
the vocabulary stops growing — slower than sludge, still a failure.
