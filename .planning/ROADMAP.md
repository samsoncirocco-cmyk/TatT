# Roadmap: TatTester GCP Migration

**Created:** 2026-02-15
**Milestone:** v1 — Production-Ready Infrastructure

## Phase Overview

| Phase | Name | Goal | Requirements |
|-------|------|------|-------------|
| 1 | Firebase Auth + Secret Manager | Users can sign up and all secrets are managed properly | AUTH-01–04, SEC-01–02 |
| 2 | Cloud Run + API Gateway | Unified backend with real security and rate limiting | INFRA-01–04, SEC-03–05 |
| 3 | Firestore + Cloud Storage | User data persists server-side, images on CDN | DATA-01–05, INFRA-05–06 |
| 4 | Real Embeddings + Matching | Artist matching works with real semantic similarity | MATCH-01–06 |
| 5 | Analytics + Monitoring | Usage tracking, budget alerts, match quality metrics | MON-01–05 |
| 6 | DOE Framework + CI/CD | Operational excellence, self-annealing, onboarding-ready | DOE-01–05, CICD-01–03 |

---

## Phase 1: Firebase Auth + Secret Manager

**Goal:** Users can create accounts and sign in. All secrets moved out of source code into Secret Manager. This unblocks every subsequent phase (auth is needed for Firestore rules, API protection, per-user rate limiting).

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, SEC-01, SEC-02

**Key deliverables:**
- Firebase Auth integration with email/password signup
- Session persistence across refresh/tab close via onAuthStateChanged
- Middleware auth guard on all /api/v1/* routes (replace shared bearer token)
- All secrets migrated to Secret Manager (Replicate token, Neo4j creds, Firebase config, OpenRouter key)
- Remove all hardcoded 'dev-token-change-in-production' fallbacks
- No NEXT_PUBLIC_ env vars containing actual secrets

**Dependencies:** None — this is the foundation.

**Plans:** 3 plans

Plans:
- [ ] 01-01-PLAN.md — Firebase Auth client setup, signup/login UI, AuthProvider
- [ ] 01-02-PLAN.md — Edge middleware, Data Access Layer, API route auth migration
- [ ] 01-03-PLAN.md — Secret Manager client, hardcoded dev token removal across repo

**Risks:**
- Next.js 16 SSR + Firebase Auth session cookies may need careful handling
- Removing hardcoded tokens breaks dev workflow — need local dev token injection pattern

**Success criteria:**
- New user can sign up, refresh page, still be signed in
- API returns 401 for unauthenticated requests
- `grep -r 'dev-token-change-in-production' src/` returns zero results
- All secrets retrievable from Secret Manager, none in .env committed to git

---

## Phase 2: Cloud Run + API Gateway

**Goal:** Single Cloud Run service replaces Express proxy + scattered API routes. API Gateway enforces rate limits and CORS. Cloud Armor protects against abuse.

**Requirements:** INFRA-01, INFRA-02, INFRA-03, INFRA-04, SEC-03, SEC-04, SEC-05

**Key deliverables:**
- Dockerized Next.js app deployed to Cloud Run (min instances=1, timeout=300s)
- API Gateway with per-endpoint rate limits:
  - Generation: 20 requests/hr per user
  - Matching: 100 requests/hr per user
  - Council: 20 requests/hr per user
- Cloud Armor WAF rules enabled
- CORS restricted to specific production domain(s)
- Server-side budget enforcement (replace client-side localStorage tracking)
- Rate limiting actually enforced (replace always-return-true stub)
- Firebase Auth tokens validated on every API request

**Dependencies:** Phase 1 (Firebase Auth needed for per-user rate limiting and token validation)

**Plans:** 4 plans

Plans:
- [ ] 02-01-PLAN.md — Dockerfile, standalone build config, Edge Runtime removal
- [ ] 02-02-PLAN.md — Firestore per-user quota tracking, server-side budget enforcement
- [ ] 02-03-PLAN.md — OpenAPI spec, Cloud Armor WAF policy, rate limit wiring into API routes
- [ ] 02-04-PLAN.md — Deployment scripts, end-to-end verification

**Risks:**
- Cloud Run cold starts could add latency to first request
- Image generation polling (120s) needs adequate request timeout
- Migration from Vercel to Cloud Run may require build config changes

**Success criteria:**
- All API endpoints served from Cloud Run
- Rate limit hit returns 429 with retry-after header
- CORS rejects requests from unauthorized origins
- Budget tracking is server-side and cannot be bypassed from browser

---

## Phase 3: Firestore + Cloud Storage

**Goal:** User designs, versions, and preferences live in Firestore. Generated images served via Cloud CDN. No more localStorage dependency for important data.

**Requirements:** DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, INFRA-05, INFRA-06

**Key deliverables:**
- Firestore data model: `users/{uid}/designs/{designId}/versions/{versionId}`
- Design documents with layers array, metadata, timestamps
- Version history with branching/merging support in Firestore
- Cloud Tasks for async generation queuing (max 3 concurrent per user)
- Generated images uploaded to Cloud Storage, served via Cloud CDN
- Progressive migration: authenticated users use Firestore, anonymous users fall back to localStorage
- Storage service abstraction layer (swap backend without changing hooks)

**Dependencies:** Phase 1 (auth for Firestore security rules), Phase 2 (Cloud Run for server-side operations)

**Plans:** 4 plans

Plans:
- [ ] 03-01-PLAN.md — Storage abstraction layer: types, interface, LocalStorage + Firestore adapters
- [ ] 03-02-PLAN.md — Cloud Storage image service + Cloud Tasks generation queue
- [ ] 03-03-PLAN.md — StorageFactory, Zustand Firestore adapter, version service migration
- [ ] 03-04-PLAN.md — Security rules, progressive migration service, integration verification

**Risks:**
- Firestore document size limit (1MB) could be hit by designs with many large layers
- Version branching/merging logic is complex — needs careful Firestore transaction design
- Migration from localStorage must not lose existing user data

**Success criteria:**
- Authenticated user's designs persist across devices
- Version branching and merging works identically to current localStorage implementation
- No localStorage quota errors — heavy users can save 50+ designs without freezing
- Anonymous users still functional (localStorage fallback)

---

## Phase 4: Real Embeddings + Matching

**Goal:** Artist matching uses real semantic embeddings. The hybrid matching system (graph + vector) works end-to-end with real data. Investors can poke at matching without it falling apart.

**Requirements:** MATCH-01, MATCH-02, MATCH-03, MATCH-04, MATCH-05, MATCH-06

**Key deliverables:**
- Vertex AI text-embedding-004 integration replacing Math.sin mock
- Real embeddings generated for all artist portfolios (seed script in execution/)
- Embeddings stored in Firestore (MVP scale <10K artists) with cosine similarity computation
- CLIP image embeddings for visual portfolio similarity via Vertex AI multimodal
- RRF weights configurable via Firestore config document (default 50/50, adjustable)
- Neo4j queries with 5s timeout and LIMIT 50 pagination
- Neo4j connection pooling from Cloud Run
- Hybrid matching works in live demo: search → real results → meaningful ranking

**Dependencies:** Phase 2 (Cloud Run for embedding generation), Phase 3 (Firestore for storing embeddings)

**Risks:**
- Vertex AI embedding costs could add up for batch operations — need cost monitoring
- Embedding dimension mismatch between text (768) and image (1408) needs normalization
- Neo4j Aura free tier may have connection limits

**Success criteria:**
- Search "Japanese traditional" returns same artists as "Japanese old-school"
- Top 5 matches are relevant to query (manual validation)
- Matching completes in <3 seconds end-to-end
- No mock/fake data in matching pipeline

---

## Phase 5: Analytics + Monitoring

**Goal:** Know what's happening: API usage, spend, errors, and match quality. Budget alerts prevent surprises. Match quality data feeds back into weight tuning.

**Requirements:** MON-01, MON-02, MON-03, MON-04, MON-05

**Key deliverables:**
- BigQuery dataset with tables: api_events, generation_costs, match_events, error_logs
- Cloud Run streams events to BigQuery via Cloud Logging sink
- Per-model cost tracking (Replicate SDXL vs Vertex Imagen per generation)
- Cloud Monitoring dashboards: error rate, p95 latency, generation queue depth
- Budget alerts at 50%, 75%, 90% of $500 Replicate limit
- Match quality tracking: log which matches users click/engage with
- Weekly summary query for match engagement rate

**Dependencies:** Phase 2 (Cloud Run for event emission), Phase 4 (matching events to track)

**Risks:**
- BigQuery streaming insert costs at high volume
- Dashboard maintenance overhead for small team
- Match quality metrics need baseline before they're useful

**Success criteria:**
- Can answer "how much have we spent on Replicate this week?" from BigQuery
- Budget alert fires before reaching limit
- Error rate spike triggers alert within 5 minutes
- Match engagement data visible in dashboard

---

## Phase 6: DOE Framework + CI/CD

**Goal:** Operational excellence. New team members can onboard quickly. System self-anneals when things break. Deployments are automated and safe.

**Requirements:** DOE-01, DOE-02, DOE-03, DOE-04, DOE-05, CICD-01, CICD-02, CICD-03

**Key deliverables:**
- `directives/` directory with SOPs:
  - deploy.md, seed-artists.md, generate-embeddings.md, migrate-data.md
  - monitor-budget.md, onboard-engineer.md, rotate-secrets.md
- `execution/` directory with Python scripts:
  - seed_artists.py, generate_embeddings.py, validate_env.py
  - check_budget.py, migrate_localStorage.py, run_health_checks.py
- Self-annealing: each directive has "Known Issues" section, updated when scripts fail
- validate_env.py runs on startup, checks all services reachable
- GitHub Actions pipeline: lint → test → build container → deploy to Cloud Run
- Execution scripts tested in CI (unit tests for each script)
- Secrets injected from Secret Manager at deploy time
- Onboarding directive: new engineer reads directives/ → runs validate_env.py → deploys to staging → productive in 1 day

**Dependencies:** All prior phases (DOE documents the system that's been built)

**Risks:**
- Directive maintenance burden if team doesn't adopt the practice
- Python execution scripts alongside Node.js app adds complexity
- Self-annealing requires discipline to update directives after every fix

**Success criteria:**
- New team member follows onboard-engineer.md and has local dev running in <2 hours
- validate_env.py catches missing secrets before deployment
- CI pipeline blocks merge on test failure
- At least 3 directives have "Known Issues" entries from real incidents

---

## Phase Dependency Graph

```
Phase 1 (Auth + Secrets)
   ↓
Phase 2 (Cloud Run + Gateway)
   ↓
Phase 3 (Firestore + Storage)
   ↓
Phase 4 (Embeddings + Matching)
   ↓
Phase 5 (Analytics + Monitoring)
   ↓
Phase 6 (DOE + CI/CD)
```

All phases are sequential. Each builds on the previous. Phase 1 is the foundation — everything else depends on auth and secret management being in place.

---
*Roadmap created: 2026-02-15*
*Last updated: 2026-02-15 after initial definition*
