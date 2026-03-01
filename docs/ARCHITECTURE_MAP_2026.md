# TatT Architecture Map — February 2026
**Prepared by @architect subagent | Audit Date: 2026-02-27**

---

## 1. System Overview

### What TatT Is

TatT (codename "manama" / "pangyo") is a **full-stack tattoo design platform** targeting three user experiences:

1. **AI Design Generation** — User describes a tattoo concept; AI generates 4 variations using Replicate (SDXL, DreamShaper, Flash Art) or Vertex AI Imagen 3. An "LLM Council" (3 AI models via Vertex AI Gemini) enhances the prompt first.
2. **Artist Matching ("Neural Ink")** — Hybrid vector + graph search finds tattoo artists by style, location, and budget. Uses Neo4j for graph traversal and Supabase pgvector for semantic similarity.
3. **Forge Canvas** — A Konva-based layer editor for composing/editing designs, with stencil export at 300 DPI.

**Secondary features:** AR visualization (MindAR), SwipeMatch (Tinder-like), Design Library, Version History.

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS v4 |
| State Management | Zustand v5 (persisted to localStorage) |
| Animation | Framer Motion v12 |
| Canvas | Konva + react-konva |
| Auth | Firebase Auth v12 + next-firebase-auth-edge |
| Primary AI (images) | Vertex AI Imagen 3 (imagegeneration@006) |
| Secondary AI (images) | Replicate (SDXL, DreamShaper, Niji SE, Flash Art) |
| LLM Council | Vertex AI Gemini 2.0 Flash (primary), OpenRouter (fallback) |
| Graph Database | Neo4j Aura (neo4j+s://36767c9d.databases.neo4j.io) |
| Relational/Vector DB | Supabase (PostgreSQL + pgvector) |
| File Storage | Google Cloud Storage |
| Document DB / RT | Firebase Firestore + Realtime Database |
| Embeddings | Vertex AI multimodalembedding@001 (1408-dim) |
| Monitoring | GCP Cloud Monitoring + pino logger |
| Backend Proxy | Express.js server (server.js) — being phased out |
| Build/Deploy CI | GitHub Actions → Cloud Run (`pangyo-production`) |

### Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         PLANNED PRODUCTION                       │
│                                                                  │
│  GitHub → CI/CD (GitHub Actions) → GCR → Cloud Run (GCP)        │
│  Service: pangyo-production | Region: us-central1                │
│  CPU: 2 | Memory: 2Gi | Min: 1 | Max: 10 instances              │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        CURRENT DEV/STAGING                       │
│  Vercel (frontend) → Railway (Express proxy) → External APIs     │
│  This is the ORIGINAL deployment model, being replaced by        │
│  the all-in-one Next.js → Cloud Run model above.                 │
└──────────────────────────────────────────────────────────────────┘

⚠️  There are TWO competing deployment models. This is a P0 issue.
```

---

## 2. Component Map

### 2a. Frontend Layer (Pages & Routes)

```
src/app/                       ← Next.js App Router (ACTIVE)
├── page.tsx                   ← Home / Landing
├── generate/page.tsx          ← Forge (canvas + generation)
├── smart-match/page.tsx       ← Neural Ink artist matching
├── swipe/page.tsx             ← SwipeMatch (Tinder-style)
├── artists/page.tsx           ← Artist browse
├── artists/[id]/page.tsx      ← Artist detail
├── dashboard/page.tsx         ← User dashboard
├── demo/page.tsx              ← Demo showcase
├── journey/page.tsx           ← User journey guide
├── philosophy/page.tsx        ← Brand/philosophy page
├── (auth)/login/page.tsx      ← Login form
├── (auth)/signup/page.tsx     ← Signup form
└── visualize/page.tsx         ← AR visualization

src/pages/                     ← ⚠️ VITE REMNANTS (dead code)
├── Generate.jsx               ← Duplicate of app/generate
├── SmartMatch.tsx             ← Duplicate of app/smart-match
├── SwipeMatch.tsx             ← Duplicate of app/swipe
├── Artists.jsx, ArtistProfile.jsx
├── Journey.jsx, Philosophy.jsx, Visualize.jsx
└── _app.tsx                   ← Vite _app wrapper (unused in Next.js)

src/features/                  ← ⚠️ ALSO DUPLICATE (another layer of dead code)
└── Generate.jsx, Artists.jsx, SmartMatch.jsx, etc.

src/App.jsx                    ← ⚠️ VITE ROOT (dead code in Next.js)
src/main.jsx                   ← ⚠️ VITE ENTRY POINT (dead code)
```

**Key Components:**
- `ForgeCanvas.tsx` — Konva canvas, layers, transforms
- `NeuralPromptEditor.tsx` — Enhanced prompt UI
- `LayerStack.tsx`, `LayerItem.tsx` — Layer management UI
- `MatchPulseSidebar.jsx` / `MatchPulse.tsx` — Real-time match updates
- `ArtistCard.jsx` — Artist result card
- `AuthProvider.tsx` — Firebase auth wrapper
- `HolyGrailLayout.tsx` — Main layout with collapsible sidebars

### 2b. Backend / API Layer

```
Next.js App Router APIs (src/app/api/)     ← ACTIVE (Cloud Run deployment)
├── /api/v1/generate                       ← Imagen 3 via Vertex AI
├── /api/v1/council/enhance                ← Gemini 2.0 Flash prompt enhancement
├── /api/v1/match/semantic                 ← Hybrid Neo4j + pgvector matching
├── /api/v1/match/update                   ← Update match scores
├── /api/v1/layers/decompose               ← Vertex AI segmentation
├── /api/v1/stencil/export                 ← 300 DPI stencil export
├── /api/v1/storage/upload                 ← GCS upload
├── /api/v1/storage/get-signed-url         ← GCS signed URLs
├── /api/v1/embeddings/generate            ← Vertex multimodal embeddings
├── /api/v1/ar/visualize                   ← AR preprocessing
├── /api/v1/upload-layer                   ← Canvas layer upload
├── /api/v1/tasks/generate                 ← Cloud Tasks async queue
├── /api/predictions                       ← Replicate prediction polling
├── /api/predictions/[id]                  ← Replicate prediction status
├── /api/neo4j/query                       ← Neo4j query proxy
├── /api/health                            ← Health check + service status
└── /api/health/startup                    ← Startup health probe

Express.js Proxy (server.js, port 3002)    ← LEGACY (Railway deployment)
├── Proxies same routes as above
├── Talks directly to Replicate, Neo4j
├── Validates FRONTEND_AUTH_TOKEN shared secret
└── Rate limiting (30 req/min global, 100 req/hr semantic match)
```

### 2c. Service Layer

```
src/services/
├── replicateService.ts          ← Replicate SDXL/DreamShaper/etc.
├── councilService.ts            ← LLM prompt enhancement (routes to Vertex/OpenRouter)
├── vertexAICouncil.js           ← Vertex AI Gemini enhancement
├── openRouterCouncil.js         ← OpenRouter fallback
├── vertex-ai-edge.ts            ← REST-based Vertex API (Edge compatible)
├── hybridMatchService.ts        ← Neo4j + pgvector fusion
├── neo4jService.ts              ← Neo4j graph queries
├── matchService.ts              ← Keyword-based matching
├── firebase-match-service.ts    ← Firebase Realtime DB integration
├── firestore-vector-service.ts  ← Firestore vector search
├── vertex-embedding-service.ts  ← 1408-dim multimodal embeddings
├── vectorDbService.ts           ← Supabase pgvector queries
├── generationRouter.ts          ← Routes to Replicate vs Vertex
├── versionService.ts            ← Canvas undo/redo history
├── stencilService.ts            ← 300 DPI stencil export        ⚠️ DUPLICATE (see .js)
├── stencilService.js            ← ⚠️ DUPLICATE of above
├── multiLayerService.ts         ← Multi-layer operations         ⚠️ DUPLICATE (see .js)
├── multiLayerService.js         ← ⚠️ DUPLICATE of above
├── layerDecompositionService.js ← Vertex AI image segmentation
├── designLibraryService.ts      ← localStorage design library
├── storageService.ts            ← Storage abstraction
├── inpaintingService.ts         ← Inpainting (feature-flagged off)
├── canvasService.ts             ← Canvas utilities
├── imageProcessingService.js    ← Image manipulation utilities
├── demoMatchService.js          ← Mock match data
└── storage/
    ├── IDesignStorage.ts        ← Storage interface
    ├── LocalStorageAdapter.ts   ← localStorage backend
    ├── FirestoreAdapter.ts      ← Firestore backend
    ├── StorageFactory.ts        ← Picks adapter based on auth state
    └── migrationService.ts      ← localStorage → Firestore migration
```

### 2d. Data Layer

| Store | Purpose | Status |
|---|---|---|
| **Firebase Firestore** | Design library (authenticated users), match data | ✅ Configured, service account present |
| **Firebase Realtime DB** | Real-time match pulse scores | ✅ Configured |
| **Firebase Auth** | User authentication | ✅ Configured |
| **Supabase (PostgreSQL)** | `tattoo_artists` table (100 artists), pgvector embeddings | ✅ Configured, keys present |
| **Supabase pgvector** | `portfolio_embeddings` table, semantic similarity | ✅ Configured, 1408-dim |
| **Neo4j Aura** | Artist-style graph, relationship traversal | ✅ Configured, password present |
| **Google Cloud Storage** | Generated images, layer uploads | ⚠️ Bucket name not in .env (GCS_BUCKET missing) |
| **localStorage** | Design library (unauthenticated), budget tracking, auth token | ⚠️ Not durable, XSS risk |

**Generated seed data (checked in):**
- `generated/tattoo-artists-supabase.json` — 100 artists
- `generated/tattoo-artists-neo4j.cypher` — Cypher for Neo4j
- `generated/create-table.sql` — DDL for Supabase

### 2e. AI / ML Layer

```
Image Generation:
  Vertex AI Imagen 3      ← PRIMARY path (/api/v1/generate → vertex-ai-edge.ts)
  Replicate SDXL          ← SECONDARY path (replicateService.ts → /api/predictions)
  Replicate DreamShaper   ← Fast preview model
  Replicate Niji SE       ← Anime style
  Replicate Flash Art     ← Traditional tattoo flash
  Replicate Blackwork     ← Blackwork/linework

Prompt Enhancement (LLM Council):
  Vertex AI Gemini 2.0 Flash  ← PRIMARY (free, 60 RPM)
  OpenRouter (Claude+GPT+Gem) ← SECONDARY (paid, needs OPENROUTER_API_KEY)
  Council Backend (:8001)     ← LEGACY (not deployed anywhere)
  Mock/Demo                   ← FALLBACK

Artist Matching:
  Vertex AI multimodalembedding@001  ← 1408-dim embeddings
  Supabase pgvector                  ← Cosine similarity ANN search
  Neo4j Cypher                       ← Graph traversal
  Reciprocal Rank Fusion (RRF)       ← Score fusion

Segmentation (Forge layers):
  Vertex AI segmentation endpoint    ← PRIMARY
  Replicate SAM                      ← FALLBACK
```

### 2f. Infrastructure

| Service | Provider | Purpose |
|---|---|---|
| Hosting | Cloud Run (GCP) `us-central1` | Next.js SSR, API routes |
| Container Registry | GCR (`gcr.io/tatt-pro/pangyo`) | Docker images |
| Legacy Frontend | Vercel | Previous deployment target |
| Legacy Backend | Railway | Express.js proxy |
| Secrets | GCP Secret Manager | API tokens in production |
| Storage | Google Cloud Storage | Images, layers |
| CI/CD | GitHub Actions | Build → push → Cloud Run deploy |
| DNS/Auth | Firebase (tatt-pro GCP project) | Auth, Firestore, RTDB |
| Monitoring | GCP Cloud Monitoring | Metrics, alerts |
| Mobile | Expo (mobile/) | ⚠️ STUB ONLY — no app screens exist |

---

## 3. Data Flow Diagrams

### 3a. Image Generation Flow

```
User Types Prompt
       │
       ▼
NeuralPromptEditor (frontend)
       │
       ▼
POST /api/v1/council/enhance          ← LLM Council
       │     (Vertex AI Gemini 2.0 Flash)
       │     Returns: simple / detailed / ultra prompts
       ▼
User Selects Prompt Level
       │
       ▼
useImageGeneration hook
       │
       ├─► POST /api/v1/generate      ← Vertex Imagen 3 (primary)
       │         │
       │         ▼
       │   vertex-ai-edge.ts
       │         │
       │         ▼
       │   GCP Access Token (GOOGLE_APPLICATION_CREDENTIALS)
       │         │
       │         ▼
       │   Vertex AI Imagen 3 REST API
       │         │
       │         ▼
       │   base64 images returned
       │
       └─► POST /api/predictions      ← Replicate (fallback / explicit model)
                 │
                 ▼
           Replicate API (poll for completion)
                 │
                 ▼
           Image URLs returned

       ▼
Image displayed in Generate page
       │
       ▼
User saves → designLibraryService (localStorage OR Firestore via StorageFactory)
```

### 3b. Artist Matching Flow

```
User enters style + location + budget
       │
       ▼
useArtistMatching hook
       │
       ▼
POST /api/v1/match/semantic
       │
       ▼
hybridMatchService.findMatchingArtists()
       │
       ├─► executeVectorSearch(query)
       │       │
       │       ├─► vertex-embedding-service.getQueryEmbedding()
       │       │         └─► Vertex AI multimodalembedding@001
       │       │
       │       └─► firestore-vector-service.searchSimilarArtists()
       │                 └─► Supabase pgvector cosine_similarity()
       │
       ├─► executeGraphQuery(preferences)
       │       └─► neo4jService.findMatchingArtists()
       │                 └─► Neo4j Cypher query
       │
       ▼
Reciprocal Rank Fusion (RRF) score fusion
       │
       ▼
calculateCompositeScore() → ranked artist list
       │
       ▼
Returned to SmartMatch page → ArtistCard components
       │
       ▼
useRealtimeMatchPulse (Supabase Realtime) → live score updates
```

### 3c. Auth Flow

```
User clicks Login
       │
       ▼
LoginForm.tsx → firebase-client.ts
       │
       ▼
Firebase Auth (signInWithEmailAndPassword OR Google OAuth)
       │
       ▼
Firebase ID Token issued
       │
       ▼
useAuth hook → AuthProvider.tsx
       │
       ▼
Token stored in useAuthStore (Zustand → localStorage)
       │
       ├─► Client requests include: Authorization: Bearer <token>
       │
       ├─► Next.js API routes: verifyApiAuth() → src/lib/api-auth.ts
       │       (checks FRONTEND_AUTH_TOKEN shared secret OR Firebase token)
       │
       └─► StorageFactory: switches from LocalStorageAdapter → FirestoreAdapter
                  │
                  ▼
           Designs migrate from localStorage → Firestore
```

---

## 4. Dependency Map

### External Services & Credential Status

| Service | Credential in .env | Status | Notes |
|---|---|---|---|
| **Firebase Auth** | `NEXT_PUBLIC_FIREBASE_API_KEY` etc. | ✅ Real keys present | All 7 vars populated |
| **Firebase Admin SDK** | `firebase-service-account.json` | ✅ REAL private key checked in | 🚨 SECURITY RISK |
| **Vertex AI / GCP** | `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json` | ✅ Works (same SA) | tatt-pro project |
| **Replicate** | `REPLICATE_API_TOKEN=r8_cxZn...` | ✅ Real token present | $0.001-0.03/image |
| **Neo4j Aura** | `NEO4J_PASSWORD=hULhcSIK...` | ✅ Real credentials | neo4j+s://36767c9d.databases.neo4j.io |
| **Supabase** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` | ✅ Real keys present | yfcmysjmoehcyszvkxsr |
| **OpenRouter** | `VITE_OPENROUTER_API_KEY` | ❌ NOT SET | Commented out in .env.example |
| **GCS Bucket** | `GCS_BUCKET` | ❌ NOT SET | `vertex-ai-edge.ts` needs this for image upload |
| **Cloud Run Deploy** | `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` | ❌ GitHub secrets missing | CI/CD will fail |
| **GCP Secret Manager secrets** | `replicate-api-token`, `neo4j-password`, `openrouter-api-key` | ❓ Unknown | Must be manually created in GCP |
| **FRONTEND_AUTH_TOKEN** | `.env` | ❌ EMPTY in .env.example, required by server.js | server.js throws on startup without it |
| **Gemini API Key** | `GEMINI_API_KEY=1b5808b7...` | ✅ Present | Used directly, not via SA |
| **Google Places API** | `GOOGLE_PLACES_API_KEY=AIzaS...` | ✅ Present | Used for location search |

### Critical vs Optional Dependencies

**Critical (app won't function without):**
- Firebase (auth) — users can't log in
- Vertex AI (Imagen 3) — no image generation
- Replicate — no fallback generation
- Supabase — no artist matching
- Neo4j — no graph matching

**Optional (degraded UX):**
- OpenRouter — council falls back to Vertex AI Gemini (which is primary anyway)
- GCS — image storage fails, but generation still works (returns base64)
- Firebase Realtime DB — match pulse won't update live
- AR / MindAR — AR preview feature-flagged off

---

## 5. Issues & Risks

### 🔴 P0 — Blocks Everything

**P0-1: REAL CREDENTIALS IN GIT REPO**
- `firebase-service-account.json` with a live GCP service account private key is tracked in the repo (it's in `.gitignore` but the file exists locally and was referenced in commits).
- `.env` file has all production secrets including `NEO4J_PASSWORD`, `REPLICATE_API_TOKEN`, `SUPABASE_SERVICE_KEY`.
- Anyone with repo access has full service account access to the `tatt-pro` GCP project.
- **Fix: Rotate all keys IMMEDIATELY. Remove from repo. Use GCP Secret Manager exclusively.**

**P0-2: `.env.local` sets `NEXT_PUBLIC_DEMO_MODE=true`**
- The local development env has demo mode ON, which means when built for production without explicitly overriding this, the app serves mock Unsplash images instead of generating real tattoos.
- The CI/CD pipeline doesn't inject this override, so production builds will likely be in demo mode.
- **Fix: Explicitly set `NEXT_PUBLIC_DEMO_MODE=false` in Vercel/Cloud Run environment.**

**P0-3: Dual Deployment Model — Architecture Conflict**
- CI/CD (GitHub Actions) deploys to **Cloud Run** (`pangyo-production`) via Docker
- Legacy docs + `server.js` + `DEPLOYMENT_QUICK_REFERENCE.md` point to **Railway + Vercel**
- Both systems have different CORS allowlists, auth mechanisms, and URL assumptions
- The `server.js` Express proxy hardcodes `https://tattester.vercel.app` and `https://tatt-app.vercel.app` in CORS — neither URL is current
- **Fix: Pick one. The Cloud Run path is the right one. Fully retire Railway/Vercel or document which is live.**

**P0-4: `GCS_BUCKET` environment variable missing**
- `vertex-ai-edge.ts` and storage routes reference `process.env.GCS_BUCKET` but it's not set anywhere in `.env`, `.env.example`, or CI/CD
- Image uploads and signed URL generation will fail silently or crash
- The health check reports `hasGcsConfig: false` 
- **Fix: Create GCS bucket in tatt-pro project, add `GCS_BUCKET=...` to all env configs.**

**P0-5: CI/CD GitHub Secrets Not Configured**
- `ci-cd.yml` requires `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`, and all `NEXT_PUBLIC_FIREBASE_*` secrets in GitHub repository secrets
- None of these are confirmed to exist — the CI/CD pipeline will fail on the `build` job
- **Fix: Configure Workload Identity Federation and set all required GitHub secrets.**

---

### 🟠 P1 — Major Functionality Broken

**P1-1: VITE_ vs NEXT_PUBLIC_ Environment Variable Chaos**
- The `.env` file contains BOTH `VITE_FIREBASE_*` and `NEXT_PUBLIC_FIREBASE_*` keys
- `VITE_PROXY_URL`, `VITE_DEMO_MODE`, `VITE_COUNCIL_DEMO_MODE`, etc. are used in some old components
- Next.js only exposes `NEXT_PUBLIC_*` to the browser — `VITE_*` variables are silently ignored
- The `replicateService.ts` reads `process.env.NEXT_PUBLIC_DEMO_MODE` but `.env` sets `VITE_DEMO_MODE=false`
- `councilService.ts` reads `NEXT_PUBLIC_COUNCIL_DEMO_MODE` but `.env` has `VITE_COUNCIL_DEMO_MODE=true` → council always runs in demo mode!
- **Fix: Audit every `VITE_*` reference, replace with `NEXT_PUBLIC_*`, update `.env` to match.**

**P1-2: Embedding Dimension Mismatch**
- `ARCHITECTURE.md` claims 4096-dim CLIP vectors
- `vertex-embedding-service.ts` uses `multimodalembedding@001` which returns **1408 dimensions**
- `src/db/migrations/001_update_embedding_dimensions.sql` exists (suggesting this was already broken once)
- If the Supabase `portfolio_embeddings` table was created for one dimension and embeddings generated with another, all vector searches return garbage
- **Fix: Verify actual dimension in Supabase schema. Re-generate embeddings if mismatch.**

**P1-3: `FRONTEND_AUTH_TOKEN` Missing → server.js Crashes on Start**
- `server.js` line: `if (!FRONTEND_AUTH_TOKEN) { throw new Error('[Server] Missing required environment variable: FRONTEND_AUTH_TOKEN'); }`
- `.env` doesn't have this set (it's in the VITE section comments but blank in .env.example)
- Railway deployment will immediately fail on startup
- **Fix: Generate a strong token and set in both Railway and Vercel environments.**

**P1-4: Dead Code Trifecta — Three Parallel Page Systems**
- `src/app/` (Next.js App Router) — the real pages
- `src/pages/` (Vite-era React Router pages) — dead, never reached
- `src/features/` (another layer of Vite-era components) — dead
- Plus `src/App.jsx` and `src/main.jsx` (Vite entry points) — dead
- This causes confusion about which code is authoritative and inflates bundle size analysis
- **Fix: Delete `src/pages/`, `src/features/`, `src/App.jsx`, `src/main.jsx`.**

**P1-5: TypeScript Errors Suppressed Globally**
- `next.config.ts` has `typescript: { ignoreBuildErrors: true }`
- The codebase is ~40% TypeScript but TS errors are silently ignored in builds
- Real type errors in API routes or services will reach production undetected
- **Fix: Remove `ignoreBuildErrors`, fix all TS errors, then enable `strict: true` gradually.**

**P1-6: Auth Token Stored in localStorage (XSS Risk)**
- `useAuthStore.ts` persists the Firebase token to localStorage via Zustand persist middleware
- Any XSS vulnerability in the app gives attackers the auth token
- Standard practice is httpOnly cookies (which `next-firebase-auth-edge` supports)
- **Fix: Switch to httpOnly cookie-based auth via next-firebase-auth-edge. Remove token from Zustand localStorage.**

**P1-7: LLM Council Always in Demo Mode**
- `VITE_COUNCIL_DEMO_MODE=true` in `.env` (the VITE prefix means it's never read by Next.js)
- `NEXT_PUBLIC_COUNCIL_DEMO_MODE` is not set anywhere
- `councilService.ts` defaults to `process.env.NEXT_PUBLIC_COUNCIL_DEMO_MODE === 'true'`
- Vertex AI path tries first but `NEXT_PUBLIC_VERTEX_AI_ENABLED` is also not set (only `VITE_VERTEX_AI_ENABLED=true`)
- Result: Council falls all the way to mock demo responses
- **Fix: Set `NEXT_PUBLIC_VERTEX_AI_ENABLED=true` and `NEXT_PUBLIC_COUNCIL_DEMO_MODE=false` explicitly.**

**P1-8: Budget Tracking in localStorage — No Server-Side Enforcement**
- `replicateService.ts` tracks API spend in `localStorage.tattester_api_usage`
- This is purely client-side. Any user can clear it. There's no server-side spend cap.
- A single user could blow the entire Replicate budget by clearing localStorage
- `budget-tracker.ts` exists but it's not wired to the Replicate service path
- **Fix: Enforce budget tracking server-side in the Next.js API route. Remove client-side tracking.**

---

### 🟡 P2 — Technical Debt / Nice to Fix

**P2-1: Duplicate Service Files (.js + .ts)**
- `stencilService.js` and `stencilService.ts` — two implementations
- `multiLayerService.js`, `multiLayerService.ts`, `multiLayerService.test.js` — three files
- `vertex-imagen-client.js` and `vertex-imagen-client.ts` — two implementations
- Unclear which is authoritative. Import paths may differ across consumers.
- **Fix: Delete the `.js` versions once `.ts` versions are complete.**

**P2-2: Package Name Mismatch**
- `package.json` name: `"manama-next"` (old codename)
- CI/CD Docker image: `gcr.io/tatt-pro/pangyo` (another codename)
- Service name in Cloud Run: `pangyo-production`
- Repo name: `TatT`
- **Fix: Standardize all naming to `tatt` or `tatt-pro`.**

**P2-3: Mobile App is a Stub**
- `mobile/` directory contains only `.expo` scaffolding and no screens
- `docs/APP_STORE_LAUNCH_GUIDE.md` exists (implying mobile is a priority)
- No Expo app was ever built — it's an empty directory
- **Fix: Either build out the mobile app or remove the directory to avoid confusion.**

**P2-4: Three LLM Council Implementations**
- Legacy: Python backend at port 8001 (referenced in `COUNCIL_QUICKSTART.md`, never deployed)
- OpenRouter: `openRouterCouncil.js` (API key not configured)
- Vertex AI: `vertexAICouncil.js` (the actual primary path)
- Council routing logic in `councilService.ts` tries all three in sequence
- **Fix: Remove the legacy backend path. Keep Vertex AI primary + OpenRouter fallback clearly documented.**

**P2-5: `my-project/` Directory**
- `my-project/CLAUDE.md` exists in the repo root
- Appears to be a leftover from a different agent session or scaffolding
- **Fix: Delete it.**

**P2-6: CORS Origins Out of Date**
- `server.js` CORS allowlist hardcodes: `https://tattester.vercel.app`, `https://tatt-app.vercel.app`
- Neither of these is the current production URL
- The current deployment URL mentioned in docs is `https://tat-t-3x8t.vercel.app`
- **Fix: Either dynamically load CORS origins from env vars (already partially done with `ALLOWED_ORIGINS`) or update hardcoded list.**

**P2-7: `Dockerfile` includes `firebase-service-account.json` COPY**
- The Dockerfile copies credentials into the container image
- Container images in GCR should use Workload Identity, not service account key files
- **Fix: Remove the COPY of the service account JSON. Use Workload Identity in Cloud Run.**

**P2-8: No Error Monitoring / Alerting**
- Sentry DSN is in `.env.example` as a comment (`# VITE_SENTRY_DSN=...`)
- GCP Cloud Monitoring is configured but only for metrics
- No error boundary reporting, no alerting on P50/P95 latency, no uptime monitoring
- **Fix: Wire up Sentry (or GCP Error Reporting). Set up uptime checks.**

**P2-9: `DesignGenerator.jsx.backup` in Source Tree**
- A `.backup` file committed to `src/components/`
- **Fix: Delete it. That's what git history is for.**

---

## 6. Recommended Fix Priority

### P0 — Fix Before Any Production Traffic

| # | Issue | Owner | Est. Time |
|---|---|---|---|
| P0-1 | Rotate all secrets. Remove `firebase-service-account.json` from repo. Use Secret Manager. | DevOps | 2 hrs |
| P0-2 | Set `NEXT_PUBLIC_DEMO_MODE=false` in Cloud Run / Vercel env | DevOps | 15 min |
| P0-3 | Decide: Cloud Run OR Railway/Vercel. Document the single production deployment. Archive the other. | Tech Lead | 1 hr |
| P0-4 | Create GCS bucket, add `GCS_BUCKET` env var everywhere | DevOps | 30 min |
| P0-5 | Configure GitHub repo secrets for CI/CD (WIF, GCP_PROJECT_ID, Firebase vars) | DevOps | 1 hr |

### P1 — Fix in Next Sprint

| # | Issue | Est. Time |
|---|---|---|
| P1-1 | Audit all `VITE_*` env references → replace with `NEXT_PUBLIC_*` | 2 hrs |
| P1-2 | Verify embedding dimensions in Supabase. Re-seed if needed. | 1 hr |
| P1-3 | Generate `FRONTEND_AUTH_TOKEN` and set in Railway env | 15 min |
| P1-4 | Delete `src/pages/`, `src/features/`, `src/App.jsx`, `src/main.jsx` | 1 hr |
| P1-5 | Remove `ignoreBuildErrors: true`, fix TS errors | 3-4 hrs |
| P1-6 | Auth token → httpOnly cookies via next-firebase-auth-edge | 2 hrs |
| P1-7 | Set `NEXT_PUBLIC_VERTEX_AI_ENABLED=true`, `NEXT_PUBLIC_COUNCIL_DEMO_MODE=false` | 15 min |
| P1-8 | Move budget tracking to server-side API route middleware | 2 hrs |

### P2 — Cleanup Sprint

| # | Issue | Est. Time |
|---|---|---|
| P2-1 | Delete `.js` duplicates of `.ts` service files | 30 min |
| P2-2 | Standardize all naming to `tatt` | 30 min |
| P2-3 | Remove or build out `mobile/` directory | Decision needed |
| P2-4 | Remove legacy council backend path | 30 min |
| P2-5 | Delete `my-project/`, `DesignGenerator.jsx.backup` | 5 min |
| P2-6 | Move CORS origins to env vars only | 30 min |
| P2-7 | Remove service account JSON from Dockerfile, use Workload Identity | 1 hr |
| P2-8 | Wire up Sentry or GCP Error Reporting | 2 hrs |

---

## 7. Summary Assessment

**The good news:** TatT has a well-designed architecture. The Vite→Next.js migration was completed (Jan 2026). Firebase auth, Vertex AI Imagen 3, Neo4j, and Supabase are all wired up with real credentials. The hybrid matching system (RRF fusion of graph + vector) is architecturally sound. The Forge canvas with layers is solid. Test coverage exists (Vitest + pytest).

**The bad news:** The codebase is at "demo-ready but not production-ready" status. The two critical blockers that need to be addressed before anyone pays for this app are: (1) production secrets exposed in git, and (2) the demo mode flag silently turning off all real AI calls. Everything else is technical debt that should be cleaned up but won't break the demo.

**Overall production readiness: 6/10.** Fix the P0s (4-5 hours of DevOps work) and P1-1/P1-7 (env var cleanup, 2-3 hours) and the app is genuinely deployable. The feature set is impressive; the operational hygiene just needs a focused cleanup sprint.

---

*Generated by @architect subagent | `/home/samson/.openclaw/workspace/repos/TatT/docs/ARCHITECTURE_MAP_2026.md`*
