# ADR 0034 — Suppress stale and rejected artist profiles without deleting them

**Status:** Accepted
**Date:** 2026-07-27
**Issues:** TAT-1, TAT-7

## Context

Instagram discovery and refresh are evidence-gathering workflows, not artist
identity or consent. A handle may become private, disappear temporarily, be
renamed, or be misclassified by a heuristic. Hard deletion would destroy review
evidence and make recovery from a rename or false positive needlessly risky.
Leaving every known-dead or clearly non-artist profile public indefinitely is
also dishonest.

The app therefore needs one durable visibility rule that is stricter than
ingest, but does not let scrape automation overwrite artist-owned profile,
ownership, verification, payment, or portfolio fields.

## Decision

1. Refresh observations use `active`, `not_found`, `private`, or `transient`.
   Three consecutive confirmed `not_found` or `private` observations set
   `a.stale = true`. A confirmed active observation clears stale and records
   `lastSeenAt`. A transient result changes neither visibility direction.
2. The status applier writes only refresh health and the audited account-quality
   verdict. It is dry-run by default, requires an exact execution confirmation,
   resolves an artist ID exclusively when present, and refuses missing or
   ambiguous handle matches.
3. Public roster, profile, featured, and match reads share one predicate:
   removed artists, stale artists, and explicit `looksBookable = false`
   verdicts are absent. Missing freshness or classifier properties stay visible
   while the workflow rolls out.
4. Suppression is reversible state, not deletion. Refresh artifacts and rejected
   profiles remain auditable outside the public product. A later confirmed
   active observation restores a stale artist.
5. `--no-filter` is an explicit, audited enrichment/import bypass. It permits a
   deliberate evidence-gathering run but does not silently relabel a negative
   classifier verdict as positive; publishing after a false positive requires a
   reviewed corrected verdict.
6. A named sweep contributes at most one refresh observation per handle.
   Ledger, audit, and cost-report mutations are process-safe so retries and
   parallel slices cannot create false dead counts or overwrite evidence.
7. Paid refresh is opt-in through `--execute`. Apify credentials come only from
   the process environment and travel in an authorization header. A sweep cost
   is complete only when every recorded actor run has reported pricing.

## Consequences

- A single transient failure cannot hide an artist.
- Retries within one sweep cannot advance the dead threshold.
- A stale or rejected profile cannot leak through one public surface while
  disappearing from another.
- Scrape-derived writes cannot replace `artistManagedFields`,
  `profileManagedAtEpochMs`, `claimVerificationStatus`, ownership, payments, or
  immutable identity fields.
- TAT-7 remains operationally incomplete until a full sweep records Apify and
  GCS cost, a spend cap is approved, and a dedicated quarterly schedule is
  created.
