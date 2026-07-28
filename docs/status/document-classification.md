---
status: current
verified_against: 2131a00
verified_on: 2026-07-27
---

# Document classification

This manifest classifies documentation by authority without forcing a
high-risk mass move that would break inbound links.

## Current entry points

- `README.md`
- `CONTEXT.md`
- `DEMO.md`
- `docs/README.md`
- `docs/product/current-product.md`
- `docs/product/customer-journeys.md`
- `docs/product/glossary.md`
- `docs/product/pitch-facts.md`
- `docs/architecture/current-architecture.md`
- `docs/status/features.yaml`
- `docs/status/known-contradictions.md`
- `docs/operations/documentation-maintenance.md`
- `docs/SITE_MAP.md` for accepted launch route verdicts
- `CLAUDE.md` only where it does not conflict with the entries above

## Durable decisions

`docs/adr/*.md` records decisions. ADRs establish intent, not implementation.
Duplicate numbering and supersession issues are listed in
`docs/status/known-contradictions.md`.

## Procedures

- `directives/*.md`
- `docs/runbooks/*.md`
- Setup and deployment documents that are verified immediately before use

Procedures are authoritative only for the operation they describe. Product
claims embedded in a runbook are not automatically current.

## Historical evidence

The following classes do not establish current product truth:

- `docs/handoffs/**`
- `docs/audits/**`
- `docs/research/**`
- `docs/archive/**`
- Files named `*_SUMMARY*`, `*_COMPLETE*`, `PR_*`, `TASK_*`, `CHANGELOG*`,
  `handoff*`, or `*plan*`
- Pitch scripts and prior-period decks

## Known high-risk legacy references

These files contain or previously contained claims that conflict with current
implementation. They carry historical notices where practical and must be
checked against the feature ledger before reuse:

- `docs/QUICK_START_GCP.md`
- `docs/API_V1_DOCUMENTATION.md`
- `docs/API_REFERENCE.md`
- `docs/PR_REVIEW_ACCEPTANCE_CRITERIA.md`
- `docs/PR_DESCRIPTION.md`
- `docs/brand/tatttester-landing-copy.md`
- `docs/brand/two-door-brand-guide.md`
- `docs/brand/image2ink-landing-copy.md`
- `YC-DEMO-SCRIPT.md`

## Unclassified documents

Anything not listed or covered by a class above is **unclassified**. It may be
useful, but it cannot establish current truth until reviewed and added to this
manifest.
