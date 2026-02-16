---
phase: 05-analytics-monitoring
plan: 02
subsystem: observability
tags: [monitoring, bigquery, cloud-logging, alerts, dashboard, gcp]
dependency_graph:
  requires:
    - 05-01-structured-logging
  provides:
    - bigquery-log-sink
    - budget-alerts
    - monitoring-dashboard
    - match-tracking
  affects:
    - lib/budget-tracker
    - api/v1/match/semantic
tech_stack:
  added:
    - "@google-cloud/monitoring": 4.4.0
  patterns:
    - cloud-monitoring-custom-metrics
    - log-based-metrics
    - bigquery-log-sink
key_files:
  created:
    - src/lib/monitoring-client.ts
    - src/services/match-tracking.ts
    - scripts/setup-bigquery-sink.sh
    - scripts/setup-monitoring.sh
    - scripts/sql/weekly-match-quality.sql
  modified:
    - src/lib/budget-tracker.ts
    - src/app/api/v1/match/semantic/route.ts
    - package.json
    - package-lock.json
decisions:
  - decision: Write budget metric after Firestore transaction completes
    rationale: Don't hold transaction open for monitoring write
  - decision: Log match results in fire-and-forget pattern
    rationale: Analytics logging should not block API response
  - decision: Graceful degradation for monitoring writes
    rationale: Monitoring failures must not break API requests
metrics:
  duration_seconds: 294
  tasks_completed: 2
  files_created: 5
  files_modified: 4
  commits: 2
  checkpoint_at: task-3
  completed_at: "2026-02-16T15:59:51Z"
---

# Phase 5 Plan 2: GCP Observability Infrastructure Summary (PARTIAL)

**Status:** CHECKPOINT REACHED - Awaiting human verification before completion

**One-liner:** Cloud Monitoring custom metrics, BigQuery log sink, budget alerts at 50/75/90%, match engagement tracking, and monitoring dashboard.

## Objective Progress

Created the complete GCP observability infrastructure for TatTester:
1. Cloud Monitoring custom metric writer for budget spend
2. Match engagement tracking service for analytics
3. BigQuery dataset + log sink setup script (idempotent)
4. Log-based metrics + budget alert policies + dashboard setup script (idempotent)
5. Weekly match quality SQL query for scheduled reporting

Tasks 1 and 2 complete. Task 3 (checkpoint:human-verify) reached.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create monitoring client, match tracking service, and budget metric integration | db53abc | monitoring-client.ts, match-tracking.ts, budget-tracker.ts, match semantic route, package.json |
| 2 | Create GCP infrastructure setup scripts | b3360ba | setup-bigquery-sink.sh, setup-monitoring.sh, weekly-match-quality.sql |

## Implementation Details

### Task 1: Monitoring Client and Match Tracking

**1. Monitoring Client (`src/lib/monitoring-client.ts`):**
- Installed `@google-cloud/monitoring` dependency
- Exports `writeBudgetMetric(spentCents)` function
- Writes GAUGE metric `custom.googleapis.com/budget/spent_cents` to Cloud Monitoring
- Labels: `{ period: 'monthly' }`
- Resource: `global` with `project_id` label
- Graceful degradation: logs warning on failure, never throws
- Checks `GCP_PROJECT_ID` env var, skips write if not set (local dev)

**2. Match Tracking Service (`src/services/match-tracking.ts`):**
- Exports `logMatchEngagement()` for user actions (view, click, contact)
- Exports `logMatchResults()` for query result summaries
- Emits structured events via Pino logger:
  - `match.engagement`: user_id, match_id, artist_id, action, rank_position, match_score, sources
  - `match.results`: user_id, query_length (not raw query - PII protection), match_count, top_scores (first 5), sources
- Pure logging functions - BigQuery receives via log sink, no direct insert

**3. Budget Tracker Integration:**
- Updated `recordSpend()` to track `newTotalCents` during transaction
- Calls `writeBudgetMetric(newTotalCents)` AFTER transaction completes
- Monitoring write is outside transaction to avoid holding lock

**4. Match Semantic Route Integration:**
- Imports `logMatchResults` from match-tracking service
- Imports `getUserFromRequest` to extract userId
- Logs match results after completion (fire-and-forget pattern)
- Extracts top 5 match scores from result
- Only logs if user authenticated (graceful skip otherwise)

### Task 2: GCP Infrastructure Setup Scripts

**1. BigQuery Sink Setup (`scripts/setup-bigquery-sink.sh`):**
- Creates BigQuery dataset `api_events` in `us-central1`
- Sets 90-day table expiration (`--default_table_expiration=7776000`)
- Creates Cloud Logging sink `api-events-sink`
- Filter: `jsonPayload.event_type=~"^(generation|match|council|embeddings|budget)\."`
- Idempotent: safe to run multiple times (checks if exists, updates if needed)
- Auto-configures IAM: grants sink writer identity `roles/bigquery.dataEditor`
- Outputs: dataset name, sink name, writer identity

**2. Monitoring Setup (`scripts/setup-monitoring.sh`):**
- Creates 4 log-based metrics:
  - `api_errors`: counter for ERROR severity + `*.failed` event types
  - `generation_count`: counter for `generation.completed` events
  - `budget_limit_reached`: counter for `budget.limit_reached` events
  - `api_latency_ms`: distribution metric on `jsonPayload.duration_ms` field
- Creates email notification channel for alerts
- Creates 3 budget alert policies:
  - 50% threshold: >$250 (25000 cents)
  - 75% threshold: >$375 (37500 cents)
  - 90% threshold: >$450 (45000 cents)
- Alert config: 60s duration, ALIGN_MAX aligner, 24hr auto-close
- Creates monitoring dashboard JSON with 6 tiles:
  - API Error Rate (xyChart with ALIGN_RATE)
  - API Latency Percentiles (xyChart with p50/p95/p99 via REDUCE_PERCENTILE)
  - Budget Spend scorecards (3 tiles with color thresholds: yellow/orange/red)
- Idempotent: checks if resources exist before creating
- Outputs: next steps for viewing dashboard and setting up scheduled query

**3. Weekly Match Quality SQL (`scripts/sql/weekly-match-quality.sql`):**
- Analyzes match engagement events from past 7 days
- Groups by matching sources (neo4j, vector, hybrid)
- Calculates engagement funnel: viewed → clicked → contacted
- Computes engagement rate, median match score, avg rank position
- Includes setup instructions for BigQuery scheduled query
- Note: Requires updating `PROJECT_ID` placeholder in FROM clause

## Verification Results (Tasks 1-2)

All verification steps passed:

- ✅ `npm run build` succeeds (compiled successfully in 11.5s)
- ✅ `writeBudgetMetric` called in budget-tracker.ts
- ✅ `match.engagement` event type confirmed in match-tracking.ts
- ✅ setup-bigquery-sink.sh syntax valid (`bash -n`)
- ✅ setup-monitoring.sh syntax valid (`bash -n`)
- ✅ Both scripts are executable (`test -x`)
- ✅ weekly-match-quality.sql exists

## Deviations from Plan

None - Tasks 1 and 2 executed exactly as written.

## Known Limitations

1. **GCP_PROJECT_ID required:** Monitoring client gracefully skips if not set (local dev), but must be set in production
2. **SQL placeholder:** weekly-match-quality.sql requires manual PROJECT_ID replacement before use
3. **Dashboard idempotency:** If dashboard exists, script suggests manual deletion (gcloud monitoring dashboards delete)
4. **Alert policy idempotency:** Policies can't be updated by name, so re-running creates duplicates if display name changes

## Next Steps (After Checkpoint Approval)

- Task 3: Human verification of observability pipeline
- Run test builds and syntax checks
- Review script configurations and thresholds
- Optional: Run scripts with GCP project to verify end-to-end

---

## Self-Check: PASSED

**Created files exist:**
```
FOUND: src/lib/monitoring-client.ts
FOUND: src/services/match-tracking.ts
FOUND: scripts/setup-bigquery-sink.sh
FOUND: scripts/setup-monitoring.sh
FOUND: scripts/sql/weekly-match-quality.sql
```

**Modified files exist:**
```
FOUND: src/lib/budget-tracker.ts
FOUND: src/app/api/v1/match/semantic/route.ts
```

**Commits exist:**
```
FOUND: db53abc
FOUND: b3360ba
```

**Build verification:**
```
✓ Compiled successfully
✓ All routes built successfully
```

**Script verification:**
```
✓ setup-bigquery-sink.sh syntax valid
✓ setup-monitoring.sh syntax valid
✓ Both scripts executable
```
