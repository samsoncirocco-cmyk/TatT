---
status: current
verified_against: 8db5d3e
verified_on: 2026-07-27
---

# Artist-data refresh operations

## Safety boundary

Discovery and refresh produce reviewable local artifacts. They do not write
to Neo4j, Supabase, or production storage. The graph status applier is a
separate command and previews changes unless an operator supplies
`--execute`.

Do not run paid Apify work merely to test this workflow. Unit tests cover the
classifier, actor-result classification, and stale-state transitions without
network access.

## Refresh sequence

1. Select the intended queue slice and approved spend cap.
2. Run `execution/apify_ig_enrich.py` for that slice.
3. Review `refresh-audit.jsonl`, `refresh-status.json`, and
   `apify-run-report.json`.
4. Investigate rejected accounts and any newly stale handles.
5. Dry-run `scripts/apply-artist-refresh-status.mjs` with the status ledger.
6. Execute the status application only after the preview matches the review.
7. Host accepted images with `scripts/host-artist-images.mjs`.
8. Record GCS cost from the billing export alongside the captured Apify cost.

The refresh is idempotent: stable artist IDs determine profile files and GCS
paths, audit entries retain each observation, and state transitions are based
on the prior ledger. Rejected/dead local profiles are quarantined rather than
deleted.

## Status semantics

- `active`: resets the confirmed-dead counter, clears stale, and stamps
  `lastSeenAt`.
- `not_found`: confirmed dead observation.
- `private`: confirmed unavailable observation.
- `transient`: actor timeout, network failure, malformed response, or missing
  row. It is never evidence of disappearance.

Three consecutive `not_found` or `private` observations mark the artist
`stale: true`. A transient observation breaks the counter but does not clear
an already-stale artist. Only a confirmed active profile clears stale.

Public roster and match reads exclude stale artists. No hard deletion occurs;
renamed, restored, or public-again handles can recover on a later confirmed
active refresh.

## Ownership boundary

Scraped data may update only:

- portfolio image URLs and their source/update metadata;
- the audited `looksBookable` verdict and `bookabilityReason`;
- `lastRefreshStatus`, `lastRefreshAt`, and `lastRefreshReason`;
- `consecutiveDeadRefreshes`, `stale`, and `lastSeenAt`.

It must not overwrite artist-managed profile values. In particular,
`artistManagedFields`, `profileManagedAtEpochMs`, immutable Instagram, and
`claimVerificationStatus` are outside the refresh write set.

## Scheduling decision

The quarterly scheduler remains intentionally unimplemented until an actual
full sweep has both its Apify and GCS cost recorded and an owner-approved
spend cap. Do not attach the job to the nightly crew runner.
