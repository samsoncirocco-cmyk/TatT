# TatT Phase 2: Cloud Run + API Gateway — Feature Summary

**Phase:** 2 — Cloud Run + API Gateway (`02-cloud-run-api-gateway`)
**Status:** ✅ Complete (Plans 01–04 verified)
**Date Completed:** ~2026-02-15 (research) through ~2026-02-28 (implementation)
**Branch/Commit baseline:** `cb39ce5` (Firebase auth, real embeddings, RRF matching, DOE framework)

---

## Overview

Phase 2 migrated TatT's backend infrastructure from a split Vercel/Railway architecture (Next.js frontend + Express.js proxy) into a unified, production-grade Google Cloud Run deployment fronted by an API Gateway. The primary goals were:

1. Eliminate the dual-server architecture (Express `server.js` + Next.js API routes)
2. Enable containerized deployment with proper secrets management
3. Add per-user rate limiting and budget enforcement (not possible with the old IP-based Express middleware)
4. Harden security with WAF, CORS enforcement, and Cloud Armor policies
5. Prepare the full API surface for GCP-native infrastructure

---

## Features Built

### Plan 01 — Docker + Standalone Build + Node Runtime Consolidation

**What was done:**

- Enabled Next.js `output: 'standalone'` in `next.config.ts`, creating an optimized Docker build artifact (~70% smaller than full build, no dead dev dependencies)
- Wrote a production-grade multi-stage `Dockerfile`:
  - Stage 1 (`deps`): Production npm install only
  - Stage 2 (`builder`): Full build with dev deps
  - Stage 3 (`runner`): Minimal Alpine runtime, non-root user (`nextjs`/`nodejs`), copies only `.next/standalone` + static assets
- Added `.dockerignore` to exclude `node_modules`, `.env`, uploads, and generated artifacts from build context
- **Removed all `export const runtime = 'edge'` declarations** from 6 API route files:
  - `src/app/api/v1/generate/route.ts`
  - `src/app/api/v1/council/enhance/route.ts`
  - `src/app/api/v1/match/semantic/route.ts`
  - `src/app/api/predictions/route.ts`
  - `src/app/api/predictions/[id]/route.ts`
  - `src/app/api/health/route.ts`
- Added `export const dynamic = 'force-dynamic'` to all API routes (prevents static optimization breaking API endpoints)
- Verified `npm run build` succeeds and `.next/standalone/server.js` exists

**Why:** Cloud Run is full Node.js. The Edge runtime declarations were misleading dead config that would cause confusion and potentially break `@google-cloud/*` library imports. Standalone mode reduces Docker image from ~500MB to ~50MB.

---

### Plan 02 — Per-User Rate Limits + Budget Enforcement

**What was done:**

Created three new modules in `src/lib/`:

#### `quota-tracker.ts` (70 lines)
- Firestore-backed per-user quota tracking by endpoint type
- Quota configs:
  - `generation`: 20 requests/hour per user
  - `matching`: 100 requests/hour per user
  - `council`: 20 requests/hour per user
- Uses sliding window with `FieldValue.arrayUnion` for atomic request logging
- Graceful fallback: if Firestore is unavailable (e.g., local dev without credentials), allows requests through

#### `rate-limit.ts` (49 lines)
- Wrapper that calls `quota-tracker.ts` and formats standardized HTTP 429 responses
- Returns `{ allowed: boolean, remaining: number, retryAfter?: number }`
- `rateLimitResponse()` helper produces proper 429 JSON with `Retry-After` header
- Replaced the prior stub that unconditionally returned `true`

#### `budget-tracker.ts` (146 lines)
- Server-side spend tracking for image generation (the one API call with real per-request cost)
- Checks per-user generation budget before calling Replicate/Vertex AI
- Records actual spend atomically via Firestore transactions
- Prevents runaway spend from a single user exhausting the $500 Replicate demo budget
- Graceful fallback on Firestore unavailability

**Why:** The old Express `express-rate-limit` was IP-based — useless for authenticated users on shared networks (university WiFi, offices). API Gateway quotas are per-project, not per-user. The only correct solution is application-layer quota tracking tied to Firebase Auth UIDs stored in Firestore.

---

### Plan 03 — OpenAPI Spec, Cloud Armor WAF, Route Enforcement, CORS

**What was done:**

#### `openapi/api-spec.yaml`
Full OpenAPI 3.0.4 specification for the TatT API:
- Firebase Auth JWT security scheme (`x-google-issuer`, `x-google-jwks_uri`, `x-google-audiences`)
- `x-google-backend` extension pointing to Cloud Run service URL
- All v1 API routes documented with request/response schemas
- Public endpoint: `/api/health` (no auth required)
- Protected endpoints: all `/api/v1/*` routes require Firebase JWT

#### `openapi/cloud-armor-policy.sh`
Cloud Armor WAF policy script:
- XSS protection rule (OWASP preconfigured expression `xss-stable`)
- SQL injection rule (`sqli-stable`)
- IP-based rate limiting: 500 req/min per IP → 429, ban for 600s on exceed
- Attaches policy to API Gateway backend service

#### Middleware CORS enforcement (`middleware.ts`)
- Origin whitelist enforcement: blocks requests from non-whitelisted origins
- Configurable via `ALLOWED_ORIGINS` env var
- Dev defaults allow localhost origins
- Returns 403 for unrecognized origins (not just "no CORS headers")

#### Route-level rate limiting (11 routes wired)
All `/api/v1/*` routes now call `checkRateLimit(userId, endpoint)` post-auth:
- Returns 429 with `Retry-After` header on limit exceeded
- `/api/v1/generate` additionally calls `checkBudget()` before generation and `recordSpend()` on success
- Verified: `grep -R "checkRateLimit" src/app/api/v1` returns 11 unique files

**Why:** The previous CORS handling in `server.js` was permissive (allowed all origins). Moving to middleware-level enforcement with an explicit whitelist follows the principle of least privilege. Wiring rate limiting at the route level (post-auth) ensures per-user enforcement, not per-IP.

---

### Plan 04 — Deployment Scripts

**What was done:**

#### `scripts/deploy-cloud-run.sh`
- Runs `gcloud builds submit` to build Docker image via Cloud Build
- Deploys to Cloud Run with production settings:
  - `--min-instances=1` (avoids cold starts during 120s Replicate polling)
  - `--max-instances=10`
  - `--timeout=300` (5 min, covers longest generation + polling cycle)
  - `--cpu=2 --memory=1Gi`
  - `--concurrency=80`
  - Secrets mounted from Secret Manager: `REPLICATE_API_TOKEN`, `FIREBASE_PRIVATE_KEY`
  - `--allow-unauthenticated` (API Gateway handles auth, Cloud Run trusts it)
- Prints deployed service URL on completion

#### `scripts/deploy-api-gateway.sh`
- Resolves `PROJECT_ID` and `CLOUD_RUN_URL` placeholders in `openapi/api-spec.yaml`
- Creates API Gateway API config from the resolved spec
- Creates or updates the gateway (idempotent)
- Outputs the gateway URL (`https://tattester-gateway-<PROJECT_ID>.uc.gateway.dev`)

**Both scripts pass `bash -n` syntax validation.**

---

## Architecture Decisions

### Decision 1: API Gateway over Load Balancer + Cloud Run
Chose API Gateway for MVP simplicity. API Gateway is fully managed (no ESPv2 proxy), deploys from OpenAPI spec, natively validates Firebase JWTs, and handles CORS preflight. The trade-off is that per-user quota enforcement must live in application code (Firestore) rather than infrastructure. Accepted trade-off for MVP phase.

### Decision 2: Per-user quotas in Firestore (not API Gateway)
API Gateway quotas are per-project. We need per-authenticated-user limits so one power user can't exhaust the Replicate budget for everyone. Firestore with atomic increments + sliding window is the correct distributed solution. Firestore availability is not required for basic functionality (fail-open design for local dev).

### Decision 3: Min instances = 1 for Cloud Run
Image generation uses Replicate polling: every 2 seconds for up to 120 seconds. A cold start mid-poll (2-5 seconds) loses polling state and fails the generation. Keeping one warm instance costs ~$13/month idle — acceptable at MVP scale. Revisit when committed use discount becomes available.

### Decision 4: Standalone Next.js build for Docker
Next.js standalone output copies only runtime-required files. Full `.next` + `node_modules` = ~500MB Docker image. Standalone = ~50MB. Faster cold starts, smaller attack surface, lower GCS/Artifact Registry storage costs.

### Decision 5: Secrets via Secret Manager, not env vars
Environment variable secrets are fetched once at instance startup and don't refresh on rotation. Secret Manager volume mounts (Path: `/secrets/`) refresh automatically. Adopted for `REPLICATE_API_TOKEN` and `FIREBASE_PRIVATE_KEY`. All other config remains as env vars.

### Decision 6: Remove Edge runtime declarations
`export const runtime = 'edge'` was present in API routes from early Vercel optimization attempts. Cloud Run is full Node.js — Edge runtime declarations are silently ignored in self-hosted deployments but create misleading type expectations. All route files migrated to Node.js runtime with `dynamic = 'force-dynamic'`.

---

## API Endpoints

All routes follow `/api/v1/{resource}/{action}` convention.

| Route | Method | Auth | Rate Limit | Budget Check | Purpose |
|---|---|---|---|---|---|
| `/api/health` | GET | None | None | No | Liveness probe for Cloud Run health check |
| `/api/v1/generate` | POST | Firebase JWT | 20/hr | ✅ Yes | Generate tattoo images via Replicate/Vertex AI |
| `/api/v1/council/enhance` | POST | Firebase JWT | 20/hr | No | Enhance user prompt via LLM Council (3 models) |
| `/api/v1/match/semantic` | POST | Firebase JWT | 100/hr | No | Semantic artist matching (hybrid vector + keyword) |
| `/api/v1/match/update` | POST | Firebase JWT | 100/hr | No | Update real-time match scores |
| `/api/v1/layers/decompose` | POST | Firebase JWT | 20/hr | No | Decompose image into layers via Vertex AI segmentation |
| `/api/v1/stencil/export` | POST | Firebase JWT | 20/hr | No | Export stencil at 300 DPI for thermal printers |
| `/api/v1/storage/upload` | POST | Firebase JWT | 20/hr | No | Upload file to GCS bucket |
| `/api/v1/storage/get-signed-url` | POST | Firebase JWT | 100/hr | No | Get signed GCS URL for asset access |
| `/api/v1/embeddings/generate` | POST | Firebase JWT | 20/hr | No | Generate vector embeddings (768-dim, Vertex AI) |
| `/api/v1/ar/visualize` | POST | Firebase JWT | 20/hr | No | AR visualization processing |
| `/api/predictions` | POST | Firebase JWT | 20/hr | No | Create Replicate prediction (polling start) |
| `/api/predictions/:id` | GET | Firebase JWT | 100/hr | No | Poll Replicate prediction status |

---

## Data Models

### Firestore: `quotas/{userId}/endpoints/{endpoint}`
```typescript
interface QuotaDocument {
  requests: number[];       // Array of Unix timestamps (ms) in current window
  updatedAt: Timestamp;     // Server timestamp of last write
}
```

### Firestore: `budgets/{userId}`
```typescript
interface BudgetDocument {
  totalSpend: number;       // Cumulative spend in USD (atomic increment)
  requestCount: number;     // Total generation requests
  lastUpdated: Timestamp;
}
```

### Firestore: `budgets/global`
```typescript
interface GlobalBudget {
  totalSpend: number;       // Cross-user cumulative spend
  dailySpend: number;       // Rolling 24h spend (for alerts)
  limit: number;            // Hard limit (default: $500 Replicate budget)
}
```

---

## New Files Added in Phase 2

```
Dockerfile                          # Multi-stage Cloud Run build
.dockerignore                       # Build context exclusions
openapi/
  api-spec.yaml                     # OpenAPI 3.0.4 spec for API Gateway
  cloud-armor-policy.sh             # WAF policy creation script
scripts/
  deploy-cloud-run.sh               # Cloud Run deployment script
  deploy-api-gateway.sh             # API Gateway deployment script
src/lib/
  quota-tracker.ts                  # Per-user Firestore quota tracking
  rate-limit.ts                     # HTTP 429 rate limit enforcement
  budget-tracker.ts                 # Server-side spend tracking
```

---

## Modified Files in Phase 2

```
next.config.ts                      # Added output: 'standalone'
middleware.ts                       # Added Origin whitelist enforcement
src/app/api/v1/generate/route.ts    # Removed edge runtime, added rate limit + budget check
src/app/api/v1/council/enhance/route.ts   # Removed edge runtime, added rate limit
src/app/api/v1/match/semantic/route.ts    # Removed edge runtime, added rate limit
src/app/api/predictions/route.ts    # Removed edge runtime, added rate limit
src/app/api/predictions/[id]/route.ts     # Removed edge runtime, added rate limit
src/app/api/health/route.ts         # Removed edge runtime, added startup health endpoint
```
*(Plus 5 additional v1 routes with rate limiting wired — see Plan 03)*

---

## Known Issues

### 1. API Gateway + Cloud Armor Integration Unverified
The `cloud-armor-policy.sh` script attaches the WAF policy to "the API Gateway backend service" — but API Gateway auto-creates its own backend service with a non-deterministic name. The attachment step may fail or attach to the wrong resource. **Mitigation:** Before production deploy, resolve the backend service name via `gcloud compute backend-services list` and hardcode it in the script. Alternatively, switch to Load Balancer + NEG → Cloud Run for full Cloud Armor control.

### 2. Quota Tracker Race Condition on High Concurrency
The quota tracker uses `FieldValue.arrayUnion` which is atomic for individual operations, but the read-then-write pattern (read current requests → check count → write new timestamp) is not wrapped in a Firestore transaction. Under very high concurrency (unlikely at MVP scale), two simultaneous requests could both pass the quota check before either write completes. **Mitigation:** Wrap `checkQuota` in a `runTransaction` for strict enforcement. Current fail-open behavior is acceptable for MVP.

### 3. Budget Tracker Hard Limit Not Wired to Emergency Stop
`budget-tracker.ts` checks `globalBudget.totalSpend >= globalBudget.limit` and returns `{ allowed: false }` — but the calling code in `generate/route.ts` must correctly handle this response and return 402/429. If a future code change ignores the return value, spend can exceed the limit. **Mitigation:** Add unit test asserting generation route returns 402 when budget tracker returns `allowed: false`.

### 4. Replicate Credentials Not Yet Injected in Production
`REPLICATE_API_TOKEN` is referenced in deploy scripts as a Secret Manager secret, but the secret has not been created in GCP project `tatt-pro` yet (credentials pending). Deploy will fail on the `--update-secrets` flag until this is done. Same for Firebase service account private key. **Status:** Blocked on credential provisioning.

### 5. Cold Start Still Possible at Scale-Out
`min-instances=1` prevents cold starts for the first instance, but scaling from 1 → 2 instances (e.g., during a load spike) will trigger a cold start on the new instance. If a generation request lands on the new instance, it will experience 2-5s cold start latency. **Mitigation:** Enable `startup-cpu-boost` annotation (already in deploy script) to reduce cold start to ~1s. For >MVP scale, increase min-instances to 2.

### 6. Edge Runtime Declarations May Reappear
The `export const runtime = 'edge'` removal was done manually across 6 files. Any new API route added by a developer may inadvertently include this declaration (common Vercel boilerplate). **Mitigation:** Add a CI check (`grep -R "runtime = 'edge'" src/app/api` must return 0 results) to the GitHub Actions workflow added in Phase 6.

---

## Verification Checklist (from Phase 2 Plans)

- [x] `npm run build` succeeds
- [x] `.next/standalone/server.js` exists after build
- [x] `grep -R "runtime = 'edge'" src/app/api` returns 0 matches
- [x] `src/lib/rate-limit.ts` no longer contains unconditional `return true`
- [x] `grep -R "checkRateLimit" src/app/api/v1 | wc -l` == 11
- [x] `bash -n scripts/deploy-cloud-run.sh` passes
- [x] `bash -n scripts/deploy-api-gateway.sh` passes
- [x] `bash -n openapi/cloud-armor-policy.sh` passes
- [ ] Actual GCP deployment end-to-end (requires `gcloud` auth + enabled APIs + credentials)

---

## Cost Implications

| Item | Cost | Notes |
|---|---|---|
| Cloud Run (min-instances=1, 1 CPU) | ~$13/month idle | Required to avoid cold start failures in Replicate polling |
| Cloud Run (compute) | Pay-per-request | $0.00002400/vCPU-second, $0.00000250/GiB-second |
| API Gateway | $3.50/million API calls | Negligible at MVP scale |
| Firestore (quota tracking) | ~$0.10/million reads | Quota check = 1 read + 1 write per API call |
| Cloud Armor | $5/month (Standard tier) | Enables WAF + DDoS protection |
| Secret Manager | $0.06/10K access ops | Accessed once per cold start |
| **Total estimated overhead** | **~$20/month** | Versus $0 (Railway free tier) — justified by security + reliability |

---

## Relationship to Other Phases

| Phase | Dependency on Phase 2 |
|---|---|
| Phase 1 (Firebase Auth) | Phase 2 consumes Firebase JWTs validated in Phase 1 auth middleware |
| Phase 3 (Firestore + Cloud Storage) | Phase 2 writes quota/budget data to Firestore; Phase 3 expands Firestore schema |
| Phase 4 (Real Embeddings) | Phase 2's rate limiting wraps Phase 4's embedding generation endpoints |
| Phase 5 (Analytics) | Phase 2's structured logging (Phase 5) instruments the rate-limited routes |
| Phase 6 (DOE + CI/CD) | Phase 6 CI pipeline runs `grep` checks enforced by Phase 2 decisions |

---

*Generated: 2026-03-01 | Source: `.planning/phases/02-cloud-run-api-gateway/`, `CHANGELOG.md`, `ARCHITECTURE.md`, source files*
