# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Real artist matching powered by real embeddings, backed by infrastructure that won't break in front of investors or real users.
**Current focus:** Phase 1 planned — ready for execution

## Current Phase

**Phase:** 1 — Firebase Auth + Secret Manager
**Status:** Planned (3 plans, 3 waves, verified)
**Next action:** `/gsd:execute-phase 1`

## Milestone Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Firebase Auth + Secret Manager | Planned |
| 2 | Cloud Run + API Gateway | Not started |
| 3 | Firestore + Cloud Storage | Not started |
| 4 | Real Embeddings + Matching | Not started |
| 5 | Analytics + Monitoring | Not started |
| 6 | DOE Framework + CI/CD | Not started |

## Key Context

- Brownfield project — full creative pipeline already built and working
- Infrastructure is the weak point: mock embeddings, no auth, browser storage, no real security
- Team: founder + incoming Neo4j expert hire
- Investor demos currently route around broken matching
- DOE (Directives-Orchestration-Execution) framework is the operational philosophy
- Neo4j stays — first hire is an expert

## Recent Decisions

- GCP-only stack (dropping Supabase)
- Keep Neo4j for artist graph
- DOE framework for ops maintainability
- Firestore over Cloud SQL (flexible schema)
- Vertex AI embeddings over third-party
- Cloud Run over Cloud Functions (long-running requests)

---
*Last updated: 2026-02-15 after project initialization*
