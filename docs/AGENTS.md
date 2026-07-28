# Documentation agent notes

The canonical documentation entry is `docs/README.md`.

## Evidence order

1. Source, tests, configuration, and schemas establish built behavior.
2. Accepted ADRs establish intended direction.
3. `docs/status/features.yaml` reconciles the two.
4. Current product and architecture documents explain that reconciliation.
5. Handoffs, audits, research, plans, and pitch scripts are historical evidence.

Do not promote an accepted-but-unimplemented ADR to “built.” Do not override an
accepted decision merely because an old route still exists.

## Required updates

When changing a public capability, journey, interface, dependency, or durable
decision:

- Update `docs/status/features.yaml`.
- Update the relevant current document.
- Add or supersede an ADR when the decision is durable.
- Add source and test evidence for material claims.

## Claim safety

- TatT is pre-launch.
- Scraped profiles are not onboarded artists.
- Payment code is not revenue.
- Generated output is not a finished tattoo.
- Placement preview is not anatomical tracking.
- Counts must be recomputed and dated.
- Brand and fundraising remain recorded contradictions.

## Graph-based navigation

Use a current-code Graphify index to locate module interfaces, callers,
adapters, and tests. Keep historical documents in a separate graph so stale
plans do not rank alongside implementation. Verify important graph conclusions
against source before editing current documentation.
