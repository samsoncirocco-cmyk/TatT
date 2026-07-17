# Project State

**Division of labor across planning docs** (2026-07-17): this file owns
current truth and decisions. `.planning/ROADMAP.md` owns phases and strategy.
`TODO.md` (repo root) owns the ordered, cross-session work queue — the
concrete next action right now. Check `TODO.md` before starting work; it's
updated more frequently than this file and is the canonical statement of
several rules referenced below (the Phase 1 reconciliation rule, the Phase 4
schema trap).

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Real artist matching powered by real embeddings, backed by infrastructure that won't break in front of investors or real users.
**Current focus:** Phase 1 rescoped 2026-07-17 — the work is no longer "build auth from scratch," it's "reconcile two independent, uncoordinated security-hardening passes (07-14 and 07-17) into one canonical implementation," then finish removing dev-token fallbacks and wiring Secret Manager. See Phase 1 in ROADMAP.md for the full rationale.

## Current Phase

**Phase:** 1 — Firebase Auth + Secret Manager (rescoped)
**Status:** In Progress, blocked on reconciliation (plan 01-01/4 complete; new plan 01-04 — reconciliation — must land before 01-02/01-03 resume)
**Next action:** Execute plan 01-04 (reconciliation, tracked as `TODO.md` item 3). Do not merge `codex/tatt-security-hardening` as-is — it conflicts with 5 files `main` already hardened independently on 2026-07-14. **Reconciliation rule (canonical statement in `TODO.md` item 3):** keep `main`'s current behavior where the two genuinely conflict, but the branch's hardening intent must survive anywhere `main` simply doesn't have it — this is not a blanket "main wins," and `npm test` + `npm run build` are the arbiter, not "which side looks newer." Per-file, here's where they conflict and what each side protects:
- `debug/route.ts` — `main` adds a hard production-404 regardless of auth; the 07-17 branch only adds auth. `main`'s check is strictly additive here, so keep it.
- `webhooks/stripe/route.ts` — `main` gates the unsigned-webhook bypass behind an explicit `STRIPE_WEBHOOK_ALLOW_PLACEHOLDER` flag, blocked in production; the 07-17 branch keys the bypass off the client-visible `NEXT_PUBLIC_DEMO_MODE`, a weaker gate. Keep `main`'s gate; check whether the 07-17 branch's demo-mode check protects anything `main`'s flag doesn't before dropping it entirely.
- `tasks/generate/route.ts` (Cloud Tasks OIDC) — `main`'s implementation correctly treats `x-cloudtasks-taskname` as informational only; the 07-17 branch 401s if that attacker-controlled header is merely missing, which isn't a real security control. Keep `main`'s version; the 07-17 branch's env-var naming isn't inherently better or worse, just different — no need to carry it over unless something else on `main` already expects those names.
- `council/generate/route.ts` — `main` adds rate limiting + budget checks on top of auth; the 07-17 branch has auth only. `main`'s additions are strictly additive, keep them.
- `TATT_ENV_REFERENCE.md` — modified on `main`, deleted on the 07-17 branch. Check what the 07-17 branch's deletion was trying to achieve (likely: stop documenting live-looking values) before deciding whether `main`'s modified version already addresses that, or whether something from the deletion's intent still needs applying to `main`'s version.

Still confirmed outstanding regardless of which side of reconciliation wins:
- `src/middleware.ts` does not exist
- `'dev-token-change-in-production'` fallback still present in 6 files: `src/features/match-pulse/services/neo4jService.ts`, `src/features/generate/services/multiLayerService.ts`, `src/features/generate/services/replicateService.js`, `src/features/inpainting/services/inpaintingService.ts`, `src/components/SmartMatchContent.jsx`, `src/lib/api-auth.ts`
- `SecretManagerServiceClient` wired into only 2 files: `src/lib/secret-manager.ts`, `execution/validate_env.py` — not yet used to eliminate the dev-token fallbacks above (plan 01-03 not started)

The `security-hardening-followups` branch (route-auth-coverage guardrail test + centralized sign-in redirect, built on top of the 07-17 pass) is ready to move once reconciliation picks a base — do not discard that work, just rebase it.

## Milestone Progress

| Phase | Name | Status |
|-------|------|--------|
| 1 | Firebase Auth + Secret Manager | In Progress, blocked on reconciliation (01-01/4 plans complete; 01-04 reconciliation is the next action, 01-02/01-03 not started) |
| 2 | Cloud Run + API Gateway | Planned (blocked on Phase 1's reconciliation gate; not started) |
| 3 | Firestore + Cloud Storage | **Complete** |
| 4 | Real Embeddings + Matching | **Complete, pending re-verification** — see Phase 4 Validation Gate below |
| 5 | Analytics + Monitoring | **Complete** (2/2 plans) |
| 6 | DOE Framework + CI/CD | **Complete** (4/4 plans) |
| — | Data & Graph Track (parallel, not phase-numbered) | **Active** — see below |

## Data & Graph Track (2026-07-14 → ongoing)

Previously logged here as "Out-of-Roadmap Work." Promoted to a named, tracked parallel initiative in ROADMAP.md on 2026-07-17 rather than left as an undocumented aside — it's the single largest chunk of engineering activity in the last week and directly affects whether Phase 4's "Complete" status is still true.

- **Neo4j 9-node schema migration** (PR #34, merged 2026-07-15) — expanded the artist graph from the original 4-node MVP schema to 9 nodes; both schemas coexist. See `NEO4J_MIGRATION.md` at repo root. Match queries updated to serve both schemas, importer no longer wipes the DB by default, and live Aura credentials that had been accidentally committed were removed from the repo (`7b3e0a8`).
- **National artist dataset + scraper** (PRs #29, #30, #31, #32, #38) — Places-API + shop-site crawler (`733efe4`), unattended national scrape scheduler processing one city per tick (`46063b0`), parallelized shop crawling with time-budget ticks (`7c0a114`). Dataset cleaned/deduped over multiple passes so far: 6,434 artists (`f1c801b`) → 8,949 artists / 9,144 shops (PR #38) → **final city sweep in flight as of 2026-07-17** (last ~40 queued cities running on house-brain; see `TODO.md` item 4 for live progress). **Do not write a fixed artist/shop count into this document.** The sweep passed 8,949 within hours of that PR landing and keeps climbing; any number here goes stale immediately. Check `TODO.md` item 4 and the most recent `data/` PR for the current count.
- **Real dataset wired into the product** (PR #40, in review as of 2026-07-17) — swaps the 100 synthetic seed artists for the real scraped dataset across the artist directory, swipe matching, and profiles via a build-time transform. **This is the change that triggers Phase 4's re-verification** — matching was originally verified against the 100-artist synthetic set.
- **Forge UI fix** (PR #33) — mounted `ToastProvider` to stop the Forge UI from crashing.
- **Repo hygiene / dead code removal** (PRs #25, #26, #27) — removed orphaned service twins, duplicate `ErrorBoundary.jsx`, consolidated `stores/` into `store/`, merged duplicate Next configs, deleted dead legacy page trees, redacted live credentials from `TATT_ENV_REFERENCE.md`, added a Next.js build gate to CI.
- **Security/rate-limit fixes on `main`** (PR #24 and related, 2026-07-14) — council pipeline auth/rate-limit/budget guards, rate-limit fails closed on unknown limit types, Cloud Tasks OIDC token verification, Stripe webhook fails closed when signing secret is missing, debug/log endpoint gated + hidden in production. **This is the work that Phase 1's 01-04 reconciliation plan needs to reconcile against the independent 07-17 `codex/tatt-security-hardening` pass** — see Current Phase above.

**Not yet decided:** whether this becomes an official numbered phase or stays a parallel track. Flagged in ROADMAP.md, not resolved there.

## Phase 4 Validation Gate — status: NOT YET RE-RUN

Phase 4 ("Real Embeddings + Matching") was marked Complete before the Neo4j 9-node migration (PR #34) and before the real dataset was wired in (PR #40). A one-time manual/static re-check was done on 2026-07-17 (Cypher traversal correctness, `ArtistRecord` shape stability, vector/graph join key alignment — full details and the re-verification checklist are in ROADMAP.md's Phase 4 section) and passed. **That check does not cover PR #40**, which lands after it and changes the artist ID space, image availability, and null-field patterns matching operates on.

Do not treat Phase 4 as Complete again until the ROADMAP.md checklist has been re-run against PR #40's dataset. The checklist's first three items are the specific trap this schema and dataset combination invites (canonical statement in `TODO.md` item 1) — a check that only confirms Neo4j connectivity and traverses the old synthetic seed would pass while real artists are silently mis-served:
- Real artists tag directly via `TAGGED_WITH` on `Artist`, not via `CREATED→Tattoo→TAGGED_WITH` (that's the seed schema's path) — a query that only supports the seed path returns zero tags for every real artist
- Real artists commonly have `hourlyRate: null` — budget/price filters must treat that as "unknown, don't exclude," not as "fails every budget filter"
- Real artists commonly have no `Tattoo` nodes at all (no scraped portfolio images ingested as graph nodes) — matching must not silently drop artists with zero `Tattoo` nodes

Also check whether Supabase embeddings exist for the real dataset (size still growing — see `TODO.md` item 4 for the current count, do not assume a number from this document) or only for the original 100-artist synthetic seed, since that would silently degrade hybrid matching to graph-only for most of the catalog.

## Key Context

- Brownfield project — full creative pipeline already built and working
- Infrastructure is the weak point: mock embeddings, no auth, browser storage, no real security
- Team: founder + incoming Neo4j expert hire
- Investor demos currently route around broken matching
- DOE (Directives-Orchestration-Execution) framework is the operational philosophy
- Neo4j stays — first hire is an expert
- **(new)** Auth/security work has now happened twice, independently, three days apart, without either effort checking what the other had already done. Treat this as a process gap, not a one-off: before starting new security work, check `main`'s recent history and any open branches touching the same files first.

## Phase 4 Deliverables (Complete, pending re-verification — see gate above)

- **Vertex AI Embeddings:** Real multimodal embeddings for designs and artist portfolios
- **Firestore Vector Search:** Native cosine similarity search in Firestore
- **Hybrid Matching:** Reciprocal Rank Fusion combining graph (Neo4j) + vector (Firestore)
- **Match Quality Scoring:** Composite scores with style/location/experience weights
- **Artist Seeding:** 50+ real artists with portfolio embeddings — **note: this predates PR #40's real-dataset wiring (final size still climbing as the scrape finishes, see `TODO.md` item 4 — do not quote a count from this document); unclear if embeddings were regenerated for the larger set (see Validation Gate above)**

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

## Phase 1 Deliverables (In Progress, blocked on reconciliation)

### Plan 01: Firebase Auth Client Infrastructure (Complete)
- **Firebase client SDK:** `src/lib/firebase-client.ts` — initialized with `browserLocalPersistence` (survives tab close), `getApps()` guard prevents duplicate init
- **useAuth hook:** `src/hooks/useAuth.ts` — signUp/logIn/logOut/getIdToken, error code → user-friendly message mapping, session cookie via /api/login, StorageFactory.setCurrentUser on auth state change, one-time localStorage→Firestore migration trigger
- **AuthProvider:** `src/components/auth/AuthProvider.tsx` — React context provider, exports `useAuthContext` and `useOptionalAuthContext`, wraps app in `src/app/layout.tsx`
- **Login page:** `src/app/(auth)/login/page.tsx` — redirects authenticated users, glass-panel styling
- **Signup page:** `src/app/(auth)/signup/page.tsx` — client-side validation (length, match), redirects authenticated users

### Plan 04: Reconcile independent security-hardening passes (new, not started; `TODO.md` item 3)
- Two uncoordinated implementations exist for: Cloud Tasks OIDC verification, Stripe webhook bypass gating, debug-route production gating, council rate-limit/budget checks
- Apply the reconciliation rule (see Current Phase above): `main`'s current behavior wins where they genuinely conflict; anywhere the 07-17 branch hardens something `main` doesn't touch, that hardening must survive the merge — gate on `npm test` + `npm run build`
- `security-hardening-followups` (route-auth-coverage test + centralized sign-in redirect) rebases onto whichever base results from reconciliation

## Recent Decisions

- **Phase 1 rescoped from "build" to "reconcile"** (2026-07-17) — two independent security-hardening efforts landed 3 days apart without cross-checking; treating the next step as net-new implementation would have either duplicated work or silently regressed security. Reconciliation is now an explicit plan (01-04), not an afterthought.
- **Data & Graph Track promoted to a named parallel initiative** (2026-07-17) — it had been the single largest source of engineering activity for a week with zero roadmap visibility; kept parallel rather than folded into the numbered 1-6 phases since it doesn't block or get blocked by them, but explicitly linked to Phase 4's validation gate since it does affect that phase's correctness.
- **Phase 4 validation gate added** (2026-07-17) — "Complete" was true once, under a dataset and schema that have since changed twice. Re-verification is now a standing checklist in ROADMAP.md, not a one-time audit.
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
*Last updated: 2026-07-17 — rescoped Phase 1 to reconciliation-first, stated as a rule (main wins on genuine conflict, hardening intent survives elsewhere, npm test + build as arbiter) rather than a blanket verdict; promoted the Data & Graph Track from an undocumented aside to a tracked parallel initiative, with dataset counts marked as snapshots pending the in-flight final scrape; added a schema-aware Phase 4 validation gate (tag traversal, null hourlyRate, no-Tattoo-node artists) tied to the 9-node schema migration and the PR #40 real-dataset wiring; added the ROADMAP/STATE/TODO division-of-labor note. Coordinate with `TODO.md` (repo root) — it's updated more frequently and is canonical for the reconciliation rule and the Phase 4 schema trap.*
