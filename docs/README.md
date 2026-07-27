# TatT documentation

This directory separates verified repository state from product decisions and
historical context. A document sounding confident does not make it current.

## Authority order

Use this order when two sources disagree:

1. Running code, configuration, schemas, and tests establish what is built.
2. Accepted ADRs establish intended product decisions.
3. `docs/status/features.yaml` records the reconciliation between built state
   and accepted direction.
4. The current product and architecture documents explain that reconciliation.
5. Handoffs, audits, plans, pitch scripts, and archived documents are evidence
   of history only.

An accepted ADR may intentionally describe work that is not implemented yet.
That work must remain `accepted_not_implemented` in the feature ledger until
the repository proves otherwise.

## Start here

- [Current product](product/current-product.md)
- [Customer journeys](product/customer-journeys.md)
- [Product glossary](product/glossary.md)
- [Pitch facts](product/pitch-facts.md)
- [Architecture overview](architecture/current-architecture.md)
- [Feature ledger](status/features.yaml)
- [Known contradictions](status/known-contradictions.md)
- [Document classification](status/document-classification.md)
- [Accepted launch route verdicts](SITE_MAP.md)
- [Documentation maintenance](operations/documentation-maintenance.md)

## Document classes

| Class | Purpose | Can establish current truth? |
| --- | --- | --- |
| Current | Verified description of the repository and accepted direction | Yes |
| ADR | Immutable record of a decision and its consequences | Yes, for intent |
| Runbook/directive | Repeatable operational procedure | Only for its procedure |
| Handoff/audit | Dated evidence and unresolved work | No |
| Plan/pitch/research | Proposed narrative or future work | No |
| Archive | Superseded or historical material | No |

## Verification snapshot

The current documents introduced by the documentation rebuild were verified
against `origin/main` at commit `2131a00` on 2026-07-27. Built-state claims
identify source or test evidence; operator-state claims identify their dated
source.
