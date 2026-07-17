# Roadmap: TatTester GCP Migration

**Created:** 2026-02-15
**Milestone:** v1 — Production-Ready Infrastructure

**Division of labor across planning docs** (2026-07-17): this file (ROADMAP.md)
owns phases and strategy — the *why* and the dependency structure. STATE.md
owns current truth and decisions — what's actually shipped and what's still
open. `TODO.md` (repo root) owns the ordered, cross-session work queue — the
concrete *next action* right now, including work items that don't map to a
roadmap phase at all. Do not duplicate the work queue here; link to `TODO.md`
instead. If `TODO.md`'s queue ever gets folded into STATE.md, update this
note.

## Phase Overview

| Phase | Name | Goal | Requirements |
|-------|------|------|-------------|
| 1 | Firebase Auth + Secret Manager | Reconcile the auth/security work already shipped (twice, independently) into one consistent, complete implementation | AUTH-01–04, SEC-01–02 |
| 2 | Cloud Run + API Gateway | Unified backend with real security and rate limiting | INFRA-01–04, SEC-03–05 |
| 3 | Firestore + Cloud Storage | User data persists server-side, images on CDN | DATA-01–05, INFRA-05–06 |
| 4 | Real Embeddings + Matching | Artist matching works with real semantic similarity | MATCH-01–06 |
| 5 | Analytics + Monitoring | Usage tracking, budget alerts, match quality metrics | MON-01–05 |
| 6 | DOE Framework + CI/CD | Operational excellence, self-annealing, onboarding-ready | DOE-01–05, CICD-01–03 |

**Data & Graph Track** (parallel, not phase-numbered — see below): artist scraper, national dataset, and Neo4j schema evolution. Runs alongside Phases 1–6, not blocked by or blocking them, but Phase 4's "Complete" status depends on it (see Phase 4's validation gate).

---

## Phase 1: Firebase Auth + Secret Manager

**Goal (rescoped 2026-07-17):** This phase was originally scoped as "build auth from scratch." It isn't — auth and security work has already happened twice, independently and without cross-checking:

1. **2026-07-14:** council pipeline auth/rate-limit/budget guards, rate-limit fail-closed behavior, Cloud Tasks OIDC token verification, Stripe webhook fail-closed on missing signing secret, debug/log endpoint gated + hidden in production. Landed directly on `main`, outside this roadmap.
2. **2026-07-17:** a second, independent pass (`codex/tatt-security-hardening` branch) re-solved several of the *same* problems differently — its own Cloud Tasks OIDC check (different env var names, different header-trust semantics), its own Stripe placeholder-bypass gate (weaker: keyed off the client-visible `NEXT_PUBLIC_DEMO_MODE` rather than a dedicated flag), and no production-404 guard on the debug route that `main` already had.

Comparing the two directly (see PR review notes, 2026-07-17), `main`'s current behavior is equal-or-stronger everywhere the two genuinely conflict. But that's not the same as "main wins, full stop" — the reconciliation rule (see `TODO.md` item 3, the canonical statement of this) is: **`main`'s current behavior wins where the two genuinely conflict, but the security branch's hardening intent must survive anywhere `main` simply doesn't have it.** Applying it means diffing concern-by-concern, not file-by-file-wholesale — a file can keep `main`'s structure and still need something folded in from the other branch. `npm test` + `npm run build` are the arbiter for whether a reconciled version is safe to land, not "which branch is newer." **The actual next action in this phase is reconciliation under that rule — not new implementation.**

**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, SEC-01, SEC-02

**Key deliverables:**
- Reconcile `debug/route.ts`, `webhooks/stripe/route.ts`, `tasks/generate/route.ts` (Cloud Tasks OIDC), and `council/generate/route.ts` between `main`'s 07-14 hardening and the `codex/tatt-security-hardening` 07-17 pass, per the reconciliation rule above — one canonical implementation per route, not two competing ones, and not a blind file-level pick of one side. Tracked as `TODO.md` item 3.
- Firebase Auth integration with email/password signup (already shipped — plan 01-01, unaffected by the above)
- Session persistence across refresh/tab close via onAuthStateChanged (shipped — plan 01-01)
- Auth check on every `/api/v1/*` route — confirmed present on 23/26 routes as of 2026-07-17 (3 are legitimately exempt: public share-link view, Stripe HMAC-verified webhook, public health check); add the automated route-coverage guardrail test that already exists on `security-hardening-followups` so this can't silently regress
- All secrets migrated to Secret Manager (Replicate token, Neo4j creds, Firebase config, OpenRouter key) — confirmed **not done**: `SecretManagerServiceClient` wired into only 2 files as of 2026-07-17
- Remove all hardcoded `dev-token-change-in-production` fallbacks — confirmed **not done** as of 2026-07-17 in the 6 files listed in Key Context below, independent of which security-hardening pass wins reconciliation
- No `NEXT_PUBLIC_*` env vars containing actual secrets
- Centralized sign-in redirect on 401/no-session instead of each of the 9 call sites reinventing (or skipping) it — already built on `security-hardening-followups`, needs to move with whichever reconciled base is chosen

**Dependencies:** None — this is the foundation.

**Plans:** 4 plans (was 3 — added 01-04 for reconciliation)

Plans:
- [x] 01-01-PLAN.md — Firebase Auth client setup, signup/login UI, AuthProvider
- [ ] 01-04-PLAN.md — **(new, do this next)** Reconcile the two independent 07-14/07-17 security-hardening passes into one canonical implementation per route; land the result on `main`
- [ ] 01-02-PLAN.md — Edge middleware, Data Access Layer, remaining API route auth migration (routes not already covered by the reconciled 01-04 work)
- [ ] 01-03-PLAN.md — Secret Manager client, hardcoded dev-token removal across the 6 remaining files

**Risks:**
- Next.js 16 SSR + Firebase Auth session cookies may need careful handling
- Removing hardcoded tokens breaks dev workflow — need local dev token injection pattern
- **Reconciliation risk (new):** a blanket "main wins" resolution would drop real hardening the other branch adds that `main` lacks. Resolve concern-by-concern against what each version specifically protects, apply the rule above (main wins on genuine conflict, hardening intent survives where main lacks it), and gate on `npm test` + `npm run build`.
- **Recurrence risk (new):** without this reconciliation step, future independent auth work will keep colliding the same way. The 01-04 plan should end with the two branches actually merged or one explicitly closed, not just documented as "still diverged."

**Success criteria:**
- New user can sign up, refresh page, still be signed in
- API returns 401 for unauthenticated requests
- `grep -r 'dev-token-change-in-production' src/` returns zero results
- All secrets retrievable from Secret Manager, none in `.env` committed to git
- **(new)** Only one implementation of Cloud Tasks OIDC verification, Stripe webhook bypass gating, and debug-route production gating exists in the codebase — no parallel/competing versions on unmerged branches
- **(new)** Route auth coverage guardrail test is merged and passing in CI

---

## Data & Graph Track (parallel initiative — not phase-numbered)

**Status as of 2026-07-17:** active, shipping, previously invisible to this roadmap. Added here because it was substantial enough to be the single biggest chunk of engineering activity in the last week and had zero tracking.

This is not a phase in the Phase 1→6 dependency chain — it doesn't block Cloud Run/Firestore/monitoring work and isn't blocked by it. It's tracked here so it isn't lost again and so its interaction with Phase 4 (matching) is explicit.

**What's shipped:**
- **Scraper + national dataset** (PRs #29–32, #38, 2026-07-15 through ongoing): Places-API + shop-site crawler, unattended national scrape scheduler (one city per tick), parallelized shop crawling with time-budget ticks. Dataset has gone through multiple cleaning passes: 6,434 artists → 8,949 artists / 9,144 shops (deduped/cleaned, PR #38) → **final city sweep in flight as of 2026-07-17** (see `TODO.md` item 4 for live progress). **Do not write a fixed count into this document** — the sweep passed 8,949 within hours of that PR and keeps climbing; check `TODO.md` item 4 and the most recent `data/` PR for the current number.
- **Neo4j 9-node schema migration** (PR #34, merged 2026-07-15): expanded the artist graph from the original 4-node MVP shape (`Artist, City, Style, Tag`) to 9 nodes (`State, City, Shop, Artist, Style, Tattoo, Instagram, Tag, Website`). Both schemas coexist in the live database; match queries were rewritten to serve both. See `NEO4J_MIGRATION.md`.
- **Real dataset wired into the product** (PR #40, in review as of 2026-07-17): swaps the 100 synthetic seed artists for the real scraped dataset across the artist directory, swipe matching, and profiles via a build-time transform.

**Open questions this track raises for the roadmap:**
- Should this become an official numbered phase, or stay a parallel track? (No decision made yet — flagging, not deciding, here.)
- The scraper/dataset work and the Phase 1 security work have now each independently touched overlapping concerns (e.g. credentials handling — `7b3e0a8` removed committed Aura credentials from the repo). Worth a periodic cross-check between tracks rather than assuming they're fully isolated.

**Dependencies on other phases:** None directly, but see Phase 4's validation gate below — Phase 4's "Complete" status was declared before the schema migration and needs re-verification against it.

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

**Dependencies:** Phase 1 (Firebase Auth needed for per-user rate limiting and token validation) — **blocked until Phase 1's reconciliation (01-04) lands**, since Phase 2's rate-limiting work would otherwise build on top of whichever unreconciled auth implementation happens to be on `main` at the time.

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
- [x] 03-01-PLAN.md — Storage abstraction layer: types, interface, LocalStorage + Firestore adapters
- [x] 03-02-PLAN.md — Cloud Storage image service + Cloud Tasks generation queue
- [x] 03-03-PLAN.md — StorageFactory, Zustand Firestore adapter, version service migration
- [x] 03-04-PLAN.md — Security rules, progressive migration service, integration verification

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

**Status:** Marked Complete (2026-02-xx), predating the Data & Graph Track's Neo4j 9-node schema migration (PR #34, 2026-07-15) and the real-dataset wiring (PR #40, in review). **Re-verification required before this phase can be trusted as still Complete** — see Validation Gate below.

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

**Plans:** 5 plans (was 4 — added 04-05 validation gate)

Plans:
- [ ] 04-01-PLAN.md — Vertex AI embedding service, normalization utilities, Neo4j driver hardening
- [ ] 04-02-PLAN.md — Firestore vector search service, configurable RRF weight service
- [ ] 04-03-PLAN.md — Rewire hybrid matching pipeline, artist embedding seed script
- [ ] 04-04-PLAN.md — Neo4j pagination defaults, end-to-end verification checkpoint
- [ ] 04-05-PLAN.md — **(new) Validation gate: re-verify against the 9-node schema and real dataset**

### Validation Gate: Phase 4 vs. the 9-node schema (new, 2026-07-17)

Phase 4 was verified once, manually, on 2026-07-17, against the 9-node migration:
`neo4jService.ts`'s Cypher was confirmed to correctly traverse the new schema (`SPECIALIZES_IN` for styles, `CREATED→Tattoo→TAGGED_WITH` for tags, no leftover `LOCATED_IN` usage), the `ArtistRecord` shape returned to `hybridMatchService.ts` is unchanged, and the vector/graph join key (`id`) still lines up between Supabase and Neo4j. Full test suite passed (432/434, 2 pre-existing unrelated failures). **This was static/code-level review — no automated test exercises a live or mocked Neo4j instance, and it has not been re-run since.**

This gate does not stay satisfied automatically. Re-run it whenever:
- The Neo4j schema changes again
- The dataset backing matching changes (e.g. PR #40's real-dataset wiring, which changes artist ID space, image availability, and null-field patterns — none of which existed when Phase 4 was first verified)
- A meaningful window of time passes without anyone touching matching code (schema drift can happen silently via data changes, not just code changes)

**Re-verification checklist.** The first three items are the specific trap PR #34 could fall into and PR #40 could repeat (see `TODO.md` item 1, the canonical statement of this risk) — a check that only confirms connectivity and traverses the old synthetic seed would pass while real artists are silently mis-served:
1. **Tag traversal:** confirm real artists tag directly via `TAGGED_WITH` on `Artist` (the national-dataset schema), not only via `CREATED→Tattoo→TAGGED_WITH` (the 9-node seed schema) — a query that only supports the latter path will silently return zero tags for every real artist.
2. **Budget filtering with null rates:** confirm real artists with `hourlyRate: null` (common — most scraped shops don't publish rates) are never excluded by budget/price filters. A filter that treats `null` as "doesn't match any budget" instead of "unknown, don't exclude" will silently drop most of the real catalog from budget-constrained searches.
3. **No-Tattoo-node artists:** confirm artists with zero `Tattoo` nodes (i.e., no scraped portfolio images ingested as graph nodes) still return from `findMatchingArtists`/`findArtistMatchesForPulse` and aren't silently filtered out by any join that assumes every artist has at least one `Tattoo` node.
4. `node scripts/test-neo4j-connection.js` against the live Aura instance
5. A manual `State→City→Shop→Artist→Style` traversal returns real, current data (not the old seed set) — insufficient on its own per items 1-3 above, but confirms basic connectivity first
6. Confirm `findMatchingArtists`/`findArtistMatchesForPulse` return non-empty results against the real dataset from PR #40, not just the 100-artist synthetic seed
7. Confirm the vector/graph join still works once Supabase embeddings exist for the real dataset (they were seeded against the synthetic 100 — check whether they've been regenerated for the current real dataset, whatever size it's grown to; see `TODO.md` for the live count)
8. Full `npm test` — 0 new failures beyond the known pre-existing ones

**Risks:**
- Vertex AI embedding costs could add up for batch operations — need cost monitoring
- Embedding dimension mismatch between text (768) and image (1408) needs normalization
- Neo4j Aura free tier may have connection limits
- **(new)** Embeddings may still be seeded only against the 100-artist synthetic set — PR #40 wiring in the real, still-growing dataset (see `TODO.md` item 4 for current size) could mean most of them have no embeddings at all, which would make hybrid matching silently degrade to graph-only for most of the catalog. Check as part of the validation gate above.

**Success criteria:**
- Search "Japanese traditional" returns same artists as "Japanese old-school"
- Top 5 matches are relevant to query (manual validation)
- Matching completes in <3 seconds end-to-end
- No mock/fake data in matching pipeline
- **(new)** Validation gate checklist above passes against the current schema and current dataset, not the state Phase 4 was originally verified under

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

**Plans:** 2 plans

Plans:
- [x] 05-01-PLAN.md — Pino structured logger + instrument all API routes with event logging
- [x] 05-02-PLAN.md — GCP infra (BigQuery sink, budget alerts, dashboards, match engagement tracking)

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

**Plans:** 4 plans

Plans:
- [ ] 06-01-PLAN.md — Directives (7 SOPs) + validate_env.py + run_health_checks.py
- [ ] 06-02-PLAN.md — Remaining execution scripts (4) + Python tests for all 6 scripts
- [ ] 06-03-PLAN.md — Startup health endpoint, Dockerfile Python stage, GitHub Actions CI/CD pipeline
- [ ] 06-04-PLAN.md — Gap closure: populate Known Issues with real incidents, self-annealing tooling

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
   |  [reconciliation gate: 01-04 must land before Phase 2 proceeds]
Phase 2 (Cloud Run + Gateway)
   |
Phase 3 (Firestore + Storage)
   |
Phase 4 (Embeddings + Matching)  <---- Data & Graph Track (parallel, not blocking)
   |  [validation gate: 04-05 must pass before Phase 4 is trusted as Complete]
Phase 5 (Analytics + Monitoring)
   |
Phase 6 (DOE + CI/CD)

Data & Graph Track: scraper, national dataset, Neo4j schema — runs in
parallel to Phases 1-6, not on the sequential dependency chain, but feeds
into Phase 4's validation gate whenever the schema or dataset changes.
```

All phases are sequential. Each builds on the previous. Phase 1 is the foundation — everything else depends on auth and secret management being in place, which is why Phase 1's reconciliation work (01-04) blocks Phase 2 rather than running in parallel with it.

---
*Roadmap created: 2026-02-15*
*Last updated: 2026-07-17 — rescoped Phase 1 from "build" to "reconcile two independent security-hardening passes" (rule, not verdict — main wins on genuine conflict, hardening intent survives elsewhere); added the Data & Graph Track as a tracked parallel initiative; added Phase 4's schema-aware validation gate; added the ROADMAP/STATE/TODO division-of-labor note at the top of this file. Coordinate with `TODO.md` (repo root) — it's updated more frequently and is canonical for the reconciliation rule and the Phase 4 schema trap.*
