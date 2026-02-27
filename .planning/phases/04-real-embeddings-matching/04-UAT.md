---
status: testing
phase: 04-real-embeddings-matching
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md
started: 2026-02-20T13:45:00Z
updated: 2026-02-20T13:45:00Z
---

## Current Test

number: 1
name: No mock embeddings in matching pipeline
expected: |
  hybridMatchService.ts no longer contains Math.sin (the old mock).
  Matching pipeline imports vertex-embedding-service, firestore-vector-service, and match-config-service.
awaiting: user response

## Tests

### 1. No mock embeddings in matching pipeline
expected: hybridMatchService.ts no longer contains Math.sin (old mock). Imports vertex-embedding-service, firestore-vector-service, match-config-service.
result: [pending]

### 2. Seed script dry-run executes
expected: Running `npm run seed:embeddings -- --dry-run` starts the script and fails fast with a clear error about missing GCP_PROJECT_ID env var (not a crash — the expected behavior when credentials aren't configured).
result: [pending]

### 3. Semantic match API endpoint exists
expected: GET/POST to `/api/v1/match/semantic` returns a structured JSON response (even if matching returns empty results without live GCP). The route exists and doesn't 404.
result: [pending]

### 4. Live semantic search returns real results (requires GCP + Neo4j)
expected: With GCP_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS, and NEO4J_* env vars set and the seed script run: hitting `/api/v1/match/semantic` with a query returns non-empty artist matches with meaningful scores.
result: [pending]

### 5. Semantic similarity works (requires GCP + Neo4j)
expected: Searching "Japanese traditional" and "Japanese old-school" returns overlapping top artists — proving real semantic embeddings, not keyword matching.
result: [pending]

### 6. Matching completes under 3 seconds (requires GCP + Neo4j)
expected: The `performance.duration_ms` field in the API response is under 3000ms for a typical query.
result: [pending]

### 7. RRF weights are configurable
expected: The `config/matching` document in Firestore controls the graph/vector weighting. When not present, the system falls back to 50/50 defaults — the API still works without the config doc.
result: [pending]

### 8. Neo4j queries respect 5s timeout + 50-result limit
expected: With Neo4j connected, queries to `/api/neo4j/query` or the match pipeline never return more than 50 results. A slow query returns 504 "Query timeout" after 5 seconds rather than hanging.
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0

## Gaps

[none yet]
