# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Real artist matching powered by real embeddings, backed by infrastructure that won't break in front of investors or real users.
**Current focus:** Phase 5 in progress — Analytics + Monitoring

## Current Phase

**Phase:** 5 — Analytics + Monitoring
**Status:** In Progress (Plan 02 at checkpoint)
**Next action:** Verify Plan 05-02 checkpoint, then continue or complete

## Milestone Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Firebase Auth + Secret Manager | Planned |
| 2 | Cloud Run + API Gateway | Planned |
| 3 | Firestore + Cloud Storage | **Complete** |
| 4 | Real Embeddings + Matching | **Complete** |
| 5 | Analytics + Monitoring | **In Progress** (1/2 complete, 1 at checkpoint) |
| 6 | DOE Framework + CI/CD | Not started |

## Key Context

- Brownfield project — full creative pipeline already built and working
- Infrastructure is the weak point: mock embeddings, no auth, browser storage, no real security
- Team: founder + incoming Neo4j expert hire
- Investor demos currently route around broken matching
- DOE (Directives-Orchestration-Execution) framework is the operational philosophy
- Neo4j stays — first hire is an expert

## Phase 4 Deliverables (Complete)

- **Vertex AI Embeddings:** Real multimodal embeddings for designs and artist portfolios
- **Firestore Vector Search:** Native cosine similarity search in Firestore
- **Hybrid Matching:** Reciprocal Rank Fusion combining graph (Neo4j) + vector (Firestore)
- **Match Quality Scoring:** Composite scores with style/location/experience weights
- **Artist Seeding:** 50+ real artists with portfolio embeddings

## Phase 5 Deliverables (In Progress)

### Plan 01: Structured Logging Infrastructure (Complete)
- **Pino logger:** GCP Cloud Logging integration with severity mapping
- **Event instrumentation:** All /api/v1/* routes emit structured JSON logs
- **Budget tracking logs:** Spend events, limit breaches, failures
- **Event types:** generation.*, council.*, match.*, embeddings.*, budget.*

### Plan 02: GCP Observability Infrastructure (At Checkpoint)
- **Monitoring client:** Cloud Monitoring custom metric for budget spend
- **Match tracking:** Event logging for engagement analytics
- **BigQuery sink:** Idempotent setup script for log routing
- **Budget alerts:** Policies at 50/75/90% thresholds
- **Monitoring dashboard:** Error rate, API latency (p95), budget scorecards
- **Status:** Tasks 1-2 complete, Task 3 checkpoint (human-verify) reached

## Recent Decisions

- GCP-only stack (dropping Supabase)
- Keep Neo4j for artist graph
- DOE framework for ops maintainability
- Firestore over Cloud SQL (flexible schema)
- Vertex AI embeddings over third-party
- Cloud Run over Cloud Functions (long-running requests)
- @google-cloud/storage server SDK for image uploads (not firebase/storage client SDK)
- **Pino for structured logging** (manual GCP severity mapping vs @google-cloud/pino-logging-gcp-config)
- **Log prompt_length not prompts** (avoid PII concerns)
- **Default log level 'info'** (DEBUG logs expensive in Cloud Logging)
- **Write budget metric after transaction** (don't hold Firestore lock for monitoring)
- **Fire-and-forget analytics logging** (match tracking shouldn't block responses)
- **Graceful monitoring degradation** (monitoring failures must not break APIs)

---
*Last updated: 2026-02-16 after Phase 5 Plan 02 checkpoint*
