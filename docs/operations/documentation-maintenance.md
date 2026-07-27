---
status: current
verified_against: 2131a00
verified_on: 2026-07-27
---

# Documentation maintenance

## Update rule

A product or architecture change is incomplete when it changes an interface,
journey, public claim, external dependency, or operational invariant without
updating:

1. `docs/status/features.yaml`
2. The relevant current product or architecture document
3. An ADR when the change records a durable decision

## Verification method

For every built-state claim:

- Link code or configuration for built behavior.
- Link tests for important invariants.
- Link an accepted ADR for intended behavior.
- Use `accepted_not_implemented` when an ADR is ahead of the code.

For external operator-state claims such as customers, revenue, deployed
configuration, or dataset counts, include the dated operational source and
reconfirm before external publication. Source code cannot prove external
absence or production state.

Do not use handoffs, pitch scripts, plans, research, or completion summaries as
the sole evidence for current behavior.

## Graphify guidance

When rebuilding Graphify indexes, prefer two separate corpora:

- Current graph: source, tests, configuration, schemas, active directives, and
  accepted ADRs.
- History graph: archived documents, handoffs, audits, research, and plans.

Exclude dependencies, build output, caches, generated data payloads, scraped
datasets, images, and `graphify-out` itself. A combined graph makes rejected
ideas and current implementation look equally authoritative.

This is optional navigation guidance, not a release requirement. Use the
current graph to locate interfaces, callers, adapters, tests, and cross-module
dependencies, then verify important conclusions against source.

## Review checklist

The `docs:check` CI step is advisory during its initial proving period:
failures remain visible but do not block a merge. Promoting it to a required
gate is an explicit repository-owner decision after normal changes have shown
the rules do not produce disruptive false positives.

- Does every “built” claim have source evidence?
- Are accepted-but-unimplemented decisions labeled?
- Are public claims compatible with `docs/product/pitch-facts.md`?
- Are route names and links still present?
- Are external systems described as adapters rather than sources of product
  truth?
- Are monetary values expressed in integer cents where required?
- Are artist-data and pre-launch limitations stated honestly?
- Are historical documents clearly separated from current guidance?

## Historical documents

Historical documents may remain in place when moving them would break useful
links, but they must not be listed as current entry points. When a historical
document is actively misleading, add a clear status notice or move it under
`docs/archive/` in a dedicated cleanup PR.
