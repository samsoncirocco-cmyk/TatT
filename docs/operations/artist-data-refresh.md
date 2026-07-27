---
status: current
verified_against: 12d8312
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
2. Preview `execution/apify_ig_enrich.py` for that slice, then pass
   `--execute --sweep-id <approved-id>` to authorize paid work. For the full
   queue or parallel slices, use the tracked `execution/enrich_all.sh` or
   `execution/parallel_enrich.sh` wrappers; both require those same gates.
3. Review `refresh-audit.jsonl`, `refresh-status.json`, and
   `apify-run-report.json`.
4. Investigate rejected accounts and any newly stale handles.
5. Dry-run `scripts/apply-artist-refresh-status.mjs` with the status ledger.
6. Execute the status application only after the preview matches the review.
7. Host accepted images with `scripts/host-artist-images.mjs`.
8. Record GCS cost from the billing export alongside the captured Apify cost.

The refresh is retry-safe: stable artist IDs determine profile files and GCS
paths, and a sweep ID contributes at most one refresh observation per handle.
Ledger/report updates merge against the latest file under process locks, and
audit appends are serialized, so parallel slices do not overwrite one
another. Rejected/dead local profiles are quarantined rather than deleted.

Use the same `--sweep-id` for every process or slice in one quarterly sweep.
The cost report deduplicates Apify actor run IDs and accumulates their actual
reported usage under that sweep instead of overwriting the prior batch. If
even one actor run has no reported price, `apifyUsageTotalUsd` remains unknown;
the known subtotal, missing-run count, and incomplete status make the gap
explicit.

Supply `APIFY_TOKEN` through the process environment. It is sent as a bearer
authorization header and must never be put in command arguments, URLs, or
checked-in environment files.

## Status semantics

- `active`: resets the confirmed-dead counter, clears stale, and stamps
  `lastSeenAt`.
- `not_found`: confirmed dead observation.
- `private`: confirmed unavailable observation.
- `transient`: actor timeout, network failure, malformed response, or missing
  row. It is never evidence of disappearance.

Three consecutive `not_found` or `private` observations from distinct sweeps
mark the artist
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
