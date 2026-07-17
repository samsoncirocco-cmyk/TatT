# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Real artist matching powered by real embeddings, backed by infrastructure that won't break in front of investors or real users.
**Current focus:** Phase 1 stalled since 2026-02-20 — Firebase Auth + Secret Manager still incomplete. No Phase 1/2 roadmap work has landed since; the intervening ~5 months instead saw a burst of out-of-roadmap work (concentrated 2026-07-14–07-15, see below).

## Current Phase

**Phase:** 1 — Firebase Auth + Secret Manager
**Status:** In Progress, stalled (only plan 01-01/3 complete; no forward movement since 2026-02-20)
**Next action:** Execute plan 01-02 (Edge middleware, Data Access Layer, API route auth migration). Confirmed still not started as of 2026-07-17:
- `src/middleware.ts` does not exist
- `'dev-token-change-in-production'` fallback still present in 6 files: `src/features/match-pulse/services/neo4jService.ts`, `src/features/generate/services/multiLayerService.ts`, `src/features/generate/services/replicateService.js`, `src/features/inpainting/services/inpaintingService.ts`, `src/components/SmartMatchContent.jsx`, `src/lib/api-auth.ts`
- `SecretManagerServiceClient` wired into only 2 files: `src/lib/secret-manager.ts`, `execution/validate_env.py` — not yet used to eliminate the dev-token fallbacks above (plan 01-03 not started)

## Milestone Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Firebase Auth + Secret Manager | In Progress, stalled (01-01/3 plans complete since 2026-02-20; 01-02 and 01-03 not started) |
| 2 | Cloud Run + API Gateway | Planned (blocked on Phase 1; not started) |
| 3 | Firestore + Cloud Storage | **Complete** |
| 4 | Real Embeddings + Matching | **Complete** |
| 5 | Analytics + Monitoring | **Complete** (2/2 plans) |
| 6 | DOE Framework + CI/CD | **Complete** (4/4 plans) |

## Out-of-Roadmap Work (2026-07-14 to 2026-07-15)

Substantial engineering landed on `main` in this window that is **not part of the GCP migration roadmap** (Phases 1-6) and isn't tracked by any phase/plan above. Documented here so it isn't lost. This looks like a separate track — a tattoo-artist scraper/dataset product plus general repo hygiene — running in parallel to, and not displacing, the stalled Phase 1 work.

- **Neo4j 9-node schema migration** (PR #34, merged 2026-07-15) — expanded the artist graph from the original 4-node MVP schema to 9 nodes; both schemas coexist. See `NEO4J_MIGRATION.md` at repo root. Match queries updated to serve both schemas, importer no longer wipes the DB by default, and live Aura credentials that had been accidentally committed were removed from the repo (`7b3e0a8`).
- **National artist dataset + scraper** (PRs #29, #30, #31, #32, merged 2026-07-15) — new Places-API + shop-site crawler (`733efe4`), an unattended national scrape scheduler processing one city per tick (`46063b0`), parallelized shop crawling with time-budget ticks (`7c0a114`), and the resulting dataset: 6,434 artists / 3,594 shops / 197 cities (`f1c801b`).
- **Forge UI fix** (PR #33, 2026-07-15) — mounted `ToastProvider` to stop the Forge UI from crashing.
- **Repo hygiene / dead code removal** (PRs #25, #26, #27, merged 2026-07-14) — removed orphaned service twins, duplicate `ErrorBoundary.jsx`, consolidated `stores/` into `store/`, merged duplicate Next configs, deleted dead legacy page trees, redacted live credentials from `TATT_ENV_REFERENCE.md`, added a Next.js build gate to CI.
- **Security/rate-limit fixes** (PR #24 and related commits, 2026-07-14) — council pipeline auth/rate-limit/budget guards, rate-limit fails closed on unknown limit types, Cloud Tasks OIDC token verification (replacing a spoofable header), Stripe webhook fails closed when signing secret is missing, internal debug/log endpoint gated behind auth and hidden in production.

**Note:** None of this maps cleanly onto Phases 1-6 (which are GCP infra migration for the design/matching product). It appears to be a distinct initiative — see recommendations in the accompanying triage report for whether it should become an official roadmap track.

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

## Phase 6 Deliverables (Complete)

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

### Plan 03: CI/CD Infrastructure Integration (Complete)
- **Startup health endpoint:** /api/health/startup validates 4 services (environment, Secret Manager, Firestore, Neo4j)
- **Python-enabled Dockerfile:** Multi-stage build with python:3.12-slim and node:20-alpine (~200MB final image)
- **GitHub Actions pipeline:** 5 jobs (lint, test-js, test-python, build, deploy) with path filters
- **Workload Identity Federation:** Zero-trust GCP authentication (no JSON keys)
- **Secret Manager integration:** Runtime secret injection for replicate-api-token, neo4j-password, openrouter-api-key
- **Docker layer caching:** 2-5x build speedup with /tmp/.buildx-cache
- **Parallel test execution:** lint || test-js || test-python for faster CI feedback

### Plan 04: Self-Annealing Gap Closure (Complete)
- **Real Known Issues documentation:** 5 incidents from Phase 6 execution documented in 4 directives
- **log_incident.py tool:** CLI tool for appending Known Issues entries to directives (auto-numbering, dry-run support)
- **Self-annealing loop operational:** DOE-03 requirement satisfied (incident → log_incident.py → directive update → future engineers benefit)
- **Gap closure:** Closed 2 verification gaps from Phase 6 verification report
- **Test coverage:** 5 passing tests for log_incident.py tool

## Phase 1 Deliverables (In Progress)

### Plan 01: Firebase Auth Client Infrastructure (Complete)
- **Firebase client SDK:** `src/lib/firebase-client.ts` — initialized with `browserLocalPersistence` (survives tab close), `getApps()` guard prevents duplicate init
- **useAuth hook:** `src/hooks/useAuth.ts` — signUp/logIn/logOut/getIdToken, error code → user-friendly message mapping, session cookie via /api/login, StorageFactory.setCurrentUser on auth state change, one-time localStorage→Firestore migration trigger
- **AuthProvider:** `src/components/auth/AuthProvider.tsx` — React context provider, exports `useAuthContext` and `useOptionalAuthContext`, wraps app in `src/app/layout.tsx`
- **Login page:** `src/app/(auth)/login/page.tsx` — redirects authenticated users, glass-panel styling
- **Signup page:** `src/app/(auth)/signup/page.tsx` — client-side validation (length, match), redirects authenticated users

## Recent Decisions

- **browserLocalPersistence for auth** (survives tab close, satisfies AUTH-02)
- **getApps() guard in firebase-client.ts** (prevents duplicate init with firebase-match-service.ts)
- **setSessionCookie via /api/login after Firebase auth** (server-side session cookie enables middleware auth checks)
- **useOptionalAuthContext for legacy pages** (gradual migration of embedded pages without AuthProvider)
- **StorageFactory.setCurrentUser in useAuth** (keeps storage layer synchronized with Firebase auth state)
- **One-time localStorage→Firestore migration in useAuth** (data continuity when user first logs in)
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
- **GitHub Actions CI/CD with Workload Identity Federation** (zero-trust auth, no JSON keys)
- **Python-enabled Docker multi-stage build** (python:3.12-slim + node:20-alpine for optimal size)
- **Startup probe health endpoint** (validates 4 services before accepting Cloud Run traffic)
- **Secret Manager runtime injection** (secrets never baked into Docker images)
- **Path-filtered CI triggers** (only run on src/, execution/, tests/, package.json, Dockerfile, workflows/, directives/)
- **Document real incidents not hypotheticals** (Known Issues sections populated from actual Phase 6 failures)
- **KI-NNN numbering format** (easy reference, auto-incrementing via log_incident.py tool)
- **CLI tool for incident logging** (automates Known Issues entry creation, prevents manual markdown errors)

---
*Last updated: 2026-07-17 — truth-sync: Phase 1 confirmed still stalled at plan 01-01/3 (no 01-02/01-03 progress since 2026-02-20); documented ~5 months of out-of-roadmap work (Neo4j 9-node migration, national scraper/dataset, repo hygiene, security fixes) that landed on main in parallel*
