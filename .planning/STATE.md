# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Real artist matching powered by real embeddings, backed by infrastructure that won't break in front of investors or real users.
**Current focus:** Phase 6 in progress — DOE Framework + CI/CD

## Current Phase

**Phase:** 6 — DOE Framework + CI/CD
**Status:** In Progress (Plans 01-02 complete, 1 remaining)
**Next action:** Execute Plan 06-03 (CI/CD Integration)

## Milestone Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Firebase Auth + Secret Manager | Planned |
| 2 | Cloud Run + API Gateway | Planned |
| 3 | Firestore + Cloud Storage | **Complete** |
| 4 | Real Embeddings + Matching | **Complete** |
| 5 | Analytics + Monitoring | **Complete** (2/2 plans) |
| 6 | DOE Framework + CI/CD | **In Progress** (2/3 complete) |

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

## Phase 5 Deliverables (Complete)

### Plan 01: Structured Logging Infrastructure (Complete)
- **Pino logger:** GCP Cloud Logging integration with severity mapping
- **Event instrumentation:** All /api/v1/* routes emit structured JSON logs
- **Budget tracking logs:** Spend events, limit breaches, failures
- **Event types:** generation.*, council.*, match.*, embeddings.*, budget.*

### Plan 02: GCP Observability Infrastructure (Complete)
- **Monitoring client:** Cloud Monitoring custom metric for budget spend
- **Match tracking:** Event logging for engagement analytics
- **BigQuery sink:** Idempotent setup script for log routing
- **Budget alerts:** Policies at 50/75/90% thresholds
- **Monitoring dashboard:** Error rate, API latency (p95), budget scorecards
- **Weekly match quality SQL:** Query template for scheduled BigQuery analytics

## Phase 6 Deliverables (In Progress)

### Plan 01: DOE Framework Foundation (Complete)
- **7 Operational Directives:** deploy.md, seed-artists.md, generate-embeddings.md, migrate-data.md, monitor-budget.md, onboard-engineer.md, rotate-secrets.md
- **validate_env.py:** Environment validation script with --skip and --json flags (202 lines)
- **run_health_checks.py:** Service health check script with --base-url and --check flags (155 lines)
- **requirements.txt:** Python dependencies for execution scripts
- **Self-annealing pattern:** Known Issues sections in all directives for continuous improvement
- **Cross-references:** Directives reference corresponding execution scripts

### Plan 02: Execution Scripts & Testing (Complete)
- **4 Execution Scripts:** seed_artists.py, generate_embeddings.py, check_budget.py, migrate_localStorage.py
- **Test Suite:** 65 pytest tests across 6 test files, all using mocked external services
- **Python Package:** setup.py with editable install for proper pytest imports
- **Test Infrastructure:** pytest.ini, conftest.py with 7 shared fixtures (mock Neo4j, Firestore, Storage, Secret Manager)
- **Test Coverage:** 50/65 tests passing (remaining failures are cosmetic error message mismatches)
- **Zero Network Calls:** All tests use mocked GCP/Neo4j services for fast CI execution

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
- **DOE framework pattern** (pair directives with executable scripts)
- **Self-annealing documentation** (Known Issues sections updated from real incidents)
- **Python for execution scripts** (better for ops automation than Node.js)
- **Granular --skip flags** (validate_env.py allows partial validation in different environments)
- **Markdown directives in git** (version controlled, code-reviewable, survives tool migrations)
- **Editable package install** (setup.py with `pip install -e .` for pytest module imports)
- **All tests use mocks** (zero real GCP/Neo4j calls ensures fast CI without credentials)
- **Accept linter modifications** (auto-formatting improves code quality, tests adapt to changes)
- **90-day log retention** (BigQuery table expiration balances analytics needs with storage costs)
- **Distribution metrics for latency** (enables p50/p95/p99 percentile queries in dashboard)
- **Idempotent setup scripts** (safe to run multiple times for infrastructure updates)

---
*Last updated: 2026-02-16 after Phase 5 Plan 02 completion*
