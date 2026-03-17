<p align="center">
  <img src="public/tatt-logo.svg" alt="TatT" width="120" />
</p>

<h1 align="center">TatT</h1>

<p align="center">
  <strong>AI-native tattoo design platform.</strong><br/>
  Design → Preview → Match → Book. In minutes, not months.
</p>

<p align="center">
  <a href="https://tatt-production.up.railway.app">🌐 Live Demo</a> ·
  <a href="#getting-started">🚀 Quick Start</a> ·
  <a href="#api-reference">📡 API Docs</a> ·
  <a href="#architecture">🏗 Architecture</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-149eca?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Vertex_AI-Imagen_3_+_Gemini-4285F4?logo=googlecloud" alt="Vertex AI" />
  <img src="https://img.shields.io/badge/Supabase-pgvector-3ecf8e?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Neo4j-GraphDB-4581c3?logo=neo4j" alt="Neo4j" />
  <img src="https://img.shields.io/badge/Railway-Production-0b0d0e?logo=railway" alt="Railway" />
</p>

---

## Why TatT Exists

Tattoos are a **$10B+ global market**, but the design process is stuck in the analog era:

| Problem | Impact |
|---------|--------|
| **Commitment anxiety** | People want permanent ink but have no way to iterate before the needle |
| **~40% regret rate** | No tools exist to visualize placement, scale, or style before committing |
| **Fragmented workflow** | Pinterest → DM an artist → wait weeks → hope for the best |
| **No artist discovery** | Finding the right artist for your style is trial and error |

**TatT fixes this.** One platform that takes you from vague idea to visual confidence to artist booking — in a single session.

---

## What It Does

### 1. 🎨 Design (The Forge)
AI-powered design studio with multi-layer canvas editing.

- **AI Council** — Three specialized AI agents (Creative Director, Technical Expert, Style Specialist) refine your prompt before generation
- **Multi-model generation** — Vertex AI Imagen 3 primary, Replicate SDXL fallback
- **Layer compositing** — Blend modes, transforms, z-ordering, drag-and-drop reorder via dnd-kit
- **Inpainting** — Selective region editing without regenerating the full design
- **Version history** — Snapshot + transform dual history with undo/redo (20-entry cap)
- **Keyboard shortcuts** — Full shortcut system for power users

### 2. 👁 Preview (AR Visualization)
See your design on your body before you commit.

- Body-part-aware placement with anatomical mapping
- Depth-aware rendering with fallback modes
- Real-time scale and position adjustment

### 3. 🤝 Match (Artist Discovery)
Find the perfect artist using hybrid intelligence.

- **Vector search** — Supabase pgvector semantic similarity on artist portfolios
- **Graph search** — Neo4j relationship scoring (style lineage, collaborations, specializations)
- **Reciprocal Rank Fusion** — Combines both signals for better-than-either matching
- **Real-time updates** — Firebase-powered live match state

### 4. 📋 Stencil Export
Production-ready output for the tattoo shop.

- Edge detection pipeline for stencil-ready simplification
- PDF export with calibrated sizing
- Print-ready artifacts

### 5. 💳 Booking
End-to-end consultation flow.

- Artist profile pages with portfolio display
- Stripe-powered consultation deposits
- Booking request system

---

## Architecture

TatT follows a **3-layer DOE (Directive-Orchestration-Execution) framework** that separates intent from decision-making from implementation:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                 │
│  Next.js 16 App Router · React 19 · Tailwind · Framer Motion   │
│  Zustand (persisted) · Konva (canvas) · dnd-kit (layers)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      API LAYER                                   │
│  Next.js API Routes (src/app/api/v1/)                           │
│  Bearer token auth · Rate limiting (Upstash Redis)              │
│                                                                  │
│  /council/enhance    — AI prompt enhancement                     │
│  /generate           — Image generation                          │
│  /match/semantic     — Hybrid artist matching                    │
│  /match/update       — Real-time match state                     │
│  /ar/visualize       — AR preview metadata                       │
│  /stencil/export     — Stencil generation                        │
│  /layers/decompose   — AI layer decomposition                    │
│  /storage/*          — GCS upload + signed URLs                  │
│  /embeddings/generate — Embedding vector creation                │
│  /upload-layer       — Layer image upload                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    SERVICE LAYER                                  │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Council Service  │  │ Generation Svc   │  │ Match Service  │  │
│  │ (Gemini 2.0)    │  │ (Imagen 3/SDXL)  │  │ (RRF Fusion)  │  │
│  │                 │  │                  │  │               │  │
│  │ 3-agent prompt  │  │ Multi-model with │  │ pgvector +    │  │
│  │ enhancement     │  │ retry + backoff  │  │ Neo4j graph   │  │
│  └─────────────────┘  └──────────────────┘  └───────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ Canvas Service  │  │ Stencil Service  │  │ GCS Service    │  │
│  │ (compositing)   │  │ (edge + PDF)     │  │ (storage)      │  │
│  └─────────────────┘  └──────────────────┘  └───────────────┘  │
│                                                                  │
│  ┌─────────────────┐  ┌──────────────────┐                     │
│  │ Image Registry  │  │ Layer Decomp     │                     │
│  │ (ref-counted)   │  │ (Vision API)     │                     │
│  └─────────────────┘  └──────────────────┘                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│                                                                  │
│  Google Vertex AI     — Imagen 3, Gemini 2.0 Flash, Vision API  │
│  Replicate            — SDXL models (4 variants, fallback)      │
│  Supabase             — Postgres + pgvector embeddings           │
│  Neo4j                — Graph DB (artist relationships/styles)   │
│  Firebase             — Real-time sync, auth                     │
│  Google Cloud Storage — Layer/export asset storage                │
│  Stripe               — Payment processing                       │
│  Upstash Redis        — Distributed rate limiting                │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Why |
|----------|-----|
| **Hybrid RRF matching** | Graph DB captures style lineage & artist relationships; vector DB captures visual similarity. Fusion outperforms either alone. |
| **AI Council (3-agent prompt enhancement)** | One-shot prompting produces inconsistent tattoo designs. Multi-agent refinement fixes composition, technical constraints, and style consistency before generation. |
| **Ref-counted image registry** | Long editing sessions leak blob URLs. Registry tracks references and auto-revokes when count hits zero. |
| **Snapshot + transform history** | Full snapshots guarantee undo reliability; transform diffs save storage. Dual system gives both. |
| **Vertex AI primary, Replicate fallback** | Imagen 3 produces superior RGBA output; SDXL is cheaper and faster when Vertex is unavailable. |
| **Canvas ops < 16ms** | Layer manipulation must run at 60fps for smooth UX. |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router) | Server components, API routes, SSR |
| **UI** | React 19, Tailwind CSS 3, Framer Motion | Responsive UI with animations |
| **Canvas** | Konva / React-Konva, dnd-kit | Layer manipulation, drag-and-drop |
| **State** | Zustand (persisted) | Client state with localStorage persistence |
| **AI Generation** | Vertex AI Imagen 3, Replicate SDXL | Multi-model image generation |
| **AI Enhancement** | Vertex AI Gemini 2.0 Flash | Council prompt refinement |
| **AI Vision** | Vertex AI Vision API | Layer decomposition / segmentation |
| **Vector Search** | Supabase pgvector | Semantic artist portfolio matching |
| **Graph DB** | Neo4j | Artist relationships, style hierarchies |
| **Real-time** | Firebase Realtime Database | Live match updates, user presence |
| **Auth** | Firebase Auth | User authentication |
| **Storage** | Google Cloud Storage | Layer images, design exports |
| **Payments** | Stripe | Consultation booking deposits |
| **Rate Limiting** | Upstash Redis | Distributed API rate limiting |
| **Deployment** | Railway (prod), Vercel (previews) | Global CDN, serverless functions |
| **Testing** | Vitest, Testing Library, Supertest | 221 tests across 18 suites |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (20 recommended)
- **npm** 9+
- **Google Cloud** project with Vertex AI enabled + service account JSON
- **Supabase** project (free tier works)
- **Neo4j** instance (Aura free tier or local)
- **Firebase** project (for auth + real-time sync)

### 1. Clone & Install

```bash
git clone https://github.com/samsoncirocco-cmyk/TatT.git
cd TatT
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Fill in the required variables (see [Environment Variables](#environment-variables) below).

### 3. Initialize Databases

```bash
# Set up Supabase schema (vector tables + functions)
node scripts/setup-supabase-vector-schema.js

# Import artist data to Neo4j
node scripts/import-to-neo4j.js

# Generate embeddings for artist portfolio matching
node scripts/generate-vertex-embeddings.js
```

### 4. Run

```bash
# Development (Next.js dev server)
npm run dev

# Or with the Express proxy (for production-like setup)
npm run server    # starts server.js on port 3001
npm run dev       # starts Next.js on port 3000
```

App runs at **http://localhost:3000**.

### 5. Run Tests

```bash
npm test              # Run all tests (vitest)
npm run test:watch    # Watch mode
npm run lint          # ESLint
```

### Docker (Alternative)

```bash
# Development with hot-reload
docker compose up dev

# Production build test
docker compose --profile production up prod
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON | `/path/to/service-account.json` |
| `GCP_PROJECT_ID` | Google Cloud project ID | `tatt-pro` |
| `GCP_REGION` | Vertex AI region | `us-central1` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | `eyJ...` |
| `NEO4J_URI` | Neo4j connection URI | `neo4j+s://xxx.databases.neo4j.io` |
| `NEO4J_USERNAME` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | `***` |
| `TATT_API_KEY` | Bearer token for API auth | `your-secret-key` |
| `FRONTEND_AUTH_TOKEN` | Shared secret between frontend and backend proxy | `your-auth-token` |

### AI Models

| Variable | Description | Default |
|----------|-------------|---------|
| `REPLICATE_API_TOKEN` | Replicate API token (SDXL fallback) | — |
| `NEXT_PUBLIC_VERTEX_AI_PROJECT_ID` | Client-side GCP project reference | Same as `GCP_PROJECT_ID` |
| `OPENROUTER_API_KEY` | OpenRouter key (Council fallback) | — |

### Firebase

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Firebase Realtime Database URL |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |

### Rate Limiting (Optional)

| Variable | Description |
|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (falls back to in-memory without) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

### Payments (Optional)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_DEMO_MODE` | `false` | Use mock data instead of real APIs |
| `NEXT_PUBLIC_COUNCIL_DEMO_MODE` | `false` | Use mock Council responses |
| `VITE_ENABLE_INPAINTING` | `true` | Enable inpainting editor |
| `VITE_ENABLE_STENCIL_EXPORT` | `true` | Enable stencil export |
| `VITE_ENABLE_AR_PREVIEW` | `false` | Enable AR preview (experimental) |

### Budget Controls

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_MAX_DAILY_SPEND` | `10.00` | Maximum daily API spend (USD) |
| `VITE_TOTAL_BUDGET` | `500.00` | Total budget cap (USD) |

---

## API Reference

**Base URL:** `https://tatt-production.up.railway.app/api/v1`

All protected routes require:
```http
Authorization: Bearer <TATT_API_KEY>
```

### Rate Limits

| Endpoint Group | Limit |
|----------------|-------|
| `/generate` | 10 requests/min |
| `/council/*` | 20 requests/hr |
| `/match/*` | 100 requests/hr |
| All others | 60 requests/min |

### Endpoints

#### `POST /generate`
Generate tattoo images from a prompt.

```bash
curl -X POST /api/v1/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TATT_API_KEY" \
  -d '{
    "prompt": "fine-line phoenix wrapping forearm with smoke detailing",
    "style": "fine-line",
    "bodyPart": "forearm",
    "sampleCount": 2
  }'
```

**Response:** Array of image URLs with model metadata.

#### `POST /council/enhance`
Enhance a prompt using the 3-agent AI Council.

```bash
curl -X POST /api/v1/council/enhance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TATT_API_KEY" \
  -d '{
    "user_prompt": "koi fish and peony sleeve",
    "style": "japanese",
    "body_part": "arm"
  }'
```

**Response:** Enhanced prompt variants from Creative Director, Technical Expert, and Style Specialist agents + fused final prompt.

#### `POST /match/semantic`
Hybrid vector + graph artist matching.

```bash
curl -X POST /api/v1/match/semantic \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TATT_API_KEY" \
  -d '{
    "query": "blackwork geometric sleeve",
    "location": "San Francisco",
    "radius": 25,
    "max_results": 10
  }'
```

**Response:** Ranked artist list with match scores and reasoning.

#### `POST /match/update`
Write match state updates to real-time backend.

#### `POST /ar/visualize`
Generate AR placement visualization metadata for a design + body part.

#### `POST /stencil/export`
Generate stencil export artifacts (edge detection + PDF).

#### `POST /layers/decompose`
Decompose an image into layer candidates using Vision API segmentation.

#### `POST /storage/upload`
Upload a file to Google Cloud Storage.

#### `POST /storage/get-signed-url`
Generate signed read/write URLs for stored assets.

#### `POST /embeddings/generate`
Generate and store embedding vectors for matching workflows.

#### `POST /upload-layer`
Upload a layer image directly.

#### `GET /health`
Health check endpoint — no auth required.

```bash
curl https://tatt-production.up.railway.app/api/health
```

---

## Project Structure

```
TatT/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── v1/             # Versioned API endpoints
│   │   │   │   ├── ar/         # AR visualization
│   │   │   │   ├── council/    # AI Council enhancement
│   │   │   │   ├── embeddings/ # Embedding generation
│   │   │   │   ├── generate/   # Image generation
│   │   │   │   ├── layers/     # Layer decomposition
│   │   │   │   ├── match/      # Artist matching (semantic + update)
│   │   │   │   ├── stencil/    # Stencil export
│   │   │   │   ├── storage/    # GCS upload + signed URLs
│   │   │   │   └── upload-layer/
│   │   │   ├── checkout/       # Stripe payment
│   │   │   ├── health/         # Health check
│   │   │   └── webhooks/       # Stripe webhooks
│   │   ├── artists/            # Artist listing page
│   │   ├── book/               # Booking flow page
│   │   ├── demo/               # Demo landing page
│   │   ├── generate/           # The Forge (design studio)
│   │   ├── pitch/              # YC pitch page
│   │   ├── uploads/            # Upload management
│   │   ├── visualize/          # AR preview page
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page
│   │
│   ├── features/               # Domain-specific feature modules
│   │   ├── generate/           # Forge: components, hooks, services
│   │   │   ├── components/
│   │   │   │   └── Forge/      # Canvas, layer stack, controls
│   │   │   ├── hooks/          # useLayerManagement, useVersionHistory
│   │   │   └── services/       # canvasService, versionService
│   │   ├── inpainting/         # Selective region editing
│   │   ├── match-pulse/        # Real-time artist matching
│   │   │   ├── components/     # Match UI, sidebars
│   │   │   ├── hooks/          # Match hooks
│   │   │   ├── services/       # hybridMatch, vectorDb, neo4j, embedding
│   │   │   └── store/          # useMatchStore
│   │   └── stencil/            # Stencil export
│   │       ├── components/     # Export UI
│   │       ├── services/       # Edge detection, stencil service
│   │       └── utils/          # Calibration, PDF generation
│   │
│   ├── services/               # Shared services (cross-feature)
│   │   ├── councilService.ts   # AI Council (3-agent prompt enhancement)
│   │   ├── generationService.ts # Multi-model image gen with retry
│   │   ├── canvasService.ts    # Immutable layer compositing
│   │   ├── forgeImageRegistry.ts # Ref-counted blob URL management
│   │   ├── gcs-service.ts      # Google Cloud Storage
│   │   ├── matchService.js     # Match orchestration
│   │   ├── replicateService.js # Replicate SDXL integration
│   │   ├── stencilService.js   # Stencil generation
│   │   └── ...
│   │
│   ├── components/             # Shared UI components
│   │   ├── NavBar.tsx
│   │   ├── AuthProvider.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── generator/          # Design form, results grid, modals
│   │   ├── generate/           # Body selector, layer stack, controls
│   │   └── ui/                 # Button, Card, Toast
│   │
│   ├── stores/                 # Zustand stores
│   │   └── useForgeStore.ts    # Main Forge state (localStorage persisted)
│   │
│   ├── config/                 # Configuration
│   │   ├── modelRoutingRules.js
│   │   ├── councilSkillPack.js
│   │   ├── vectorDbConfig.js
│   │   ├── promptTemplates.js
│   │   └── characterDatabase.js
│   │
│   └── utils/                  # Shared utilities
│       ├── anatomicalMapping.js
│       ├── performanceMonitor.js
│       ├── scoreAggregation.js
│       └── ...
│
├── scripts/                    # Database setup, migration, and data scripts
│   ├── setup-supabase-vector-schema.js
│   ├── import-to-neo4j.js
│   ├── generate-vertex-embeddings.js
│   ├── benchmark-vector-search.js
│   └── ... (45+ utility scripts)
│
├── directives/                 # SOPs (Directive layer of DOE)
│   ├── generate-tattoo.md
│   ├── council-enhance.md
│   ├── artist-matching.md
│   ├── ar-preview.md
│   ├── stencil-export.md
│   ├── local-dev-setup.md
│   ├── database-setup.md
│   ├── deploy.md
│   └── ... (18 directives)
│
├── execution/                  # Execution manifest (DOE Layer 3)
│   └── README.md               # Directive → code mapping
│
├── tests/                      # Test suites
│   ├── DesignGenerator.test.jsx
│   ├── hybridMatching.test.js
│   ├── stencilService.test.js
│   ├── rateLimit.test.ts
│   ├── server.test.js
│   └── ... (18 test files, 221 tests)
│
├── public/                     # Static assets
├── server.js                   # Express proxy server (Railway prod)
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── docker-compose.yml          # Docker dev/prod setup
├── Dockerfile                  # Multi-stage Docker build
├── railway.json                # Railway deployment config
└── vercel.json                 # Vercel config (previews)
```

---

## Cost Monitoring

| Service | Cost per Unit | Notes |
|---------|--------------|-------|
| **Vertex Imagen 3** | ~$0.04/image | Primary generator. RGBA layer output. |
| **Replicate SDXL** | ~$0.0055/image | Fallback. 4 outputs = $0.022/generation. |
| **Vertex Gemini 2.0 Flash** | ~$0.02/request | Council prompt enhancement. |
| **Vertex Vision API** | ~$0.0015/image | Layer decomposition / segmentation. |
| **Supabase** | Free tier | pgvector search < 100ms. |
| **Neo4j Aura** | Free tier | Graph queries for artist matching. |
| **Firebase** | Free tier | Real-time sync, auth. |
| **GCS** | ~$0.02/GB | Layer and export storage. |
| **Upstash Redis** | Free tier | 10K requests/day for rate limiting. |

**Estimated cost per full workflow** (Council → Generate → Match): ~$0.10  
**Monthly budget target**: $500 (~5,000 full workflows)

---

## Deployment

### Railway (Production)

TatT production runs on Railway using the Express server (`server.js`):

```bash
# Railway auto-deploys from main branch
# Manual deploy:
railway up
```

Config: `railway.json` — uses Nixpacks builder, runs `npm run server`.

**Production URL:** https://tatt-production.up.railway.app

### Vercel (Previews)

```bash
# Preview deploy
npx vercel

# Production deploy
npx vercel --prod
```

### Docker

```bash
# Build and run production image
docker build --target production -t tatt .
docker run -p 3000:3000 --env-file .env.local tatt
```

---

## Scripts Reference

### Database Setup
```bash
node scripts/setup-supabase-vector-schema.js    # Initialize Supabase vector tables
node scripts/import-to-neo4j.js                  # Seed Neo4j with artist data
node scripts/generate-vertex-embeddings.js       # Generate portfolio embeddings
node scripts/insert-artists-to-supabase.js       # Insert artist records
node scripts/insert-artists-to-neo4j.js          # Insert artists to graph DB
```

### Database Testing
```bash
node scripts/test-supabase-connection.js         # Verify Supabase connectivity
node scripts/test-neo4j-connection.js            # Verify Neo4j connectivity
node scripts/test-gcp-health.js                  # Verify GCP API access
node scripts/benchmark-vector-search.js          # Benchmark vector search performance
```

### Migrations
```bash
node scripts/execute-migration.js                # Run pending schema migrations
node scripts/migrate-neo4j-schema.js             # Neo4j schema migration
node scripts/migrate-to-text-embeddings.js       # Migrate to text-embedding-005
node scripts/migrate-to-gcs.js                   # Migrate assets to GCS
```

### Data Generation
```bash
node scripts/generate-tattoo-artists-data.js     # Generate synthetic artist dataset
node scripts/generate-artist-images.js           # Generate artist portfolio images
node scripts/generate-artist-images-vertex.js    # Generate via Vertex AI
```

---

## Troubleshooting

### Council enhancement fails
1. Verify `GOOGLE_APPLICATION_CREDENTIALS` points to valid service account JSON
2. Ensure Vertex AI API is enabled: `gcloud services enable aiplatform.googleapis.com`
3. Fallback chain: Vertex → OpenRouter → Demo → Mock. Set `OPENROUTER_API_KEY` for paid backup.

### Vector search returns no results
1. Run `node scripts/generate-vertex-embeddings.js` to populate embeddings
2. Verify: `node scripts/test-supabase-connection.js`
3. Check embedding dimensions match config in `src/config/vectorDbConfig.js`

### Neo4j connection timeout
1. Verify `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` in `.env.local`
2. Check Neo4j Aura instance status at https://console.neo4j.io
3. Demo mode auto-activates if Neo4j fails (see `demoMatchService.js`)

### Layer upload fails
1. Check GCS bucket permissions (service account needs `storage.objects.create`)
2. Verify bucket name in `src/services/gcs-service.ts`
3. Test: `node scripts/test-gcp-health.js`

### Build errors
1. Clear Next.js cache: `rm -rf .next && npm run build`
2. Check for locked files: `rm -f .next/lock`
3. Use webpack mode (Turbopack disabled due to PostCSS sandbox issues): `npm run build`

### Auth errors in tests
Firebase auth tests may fail without configured Firebase env vars. 2 test files (6 tests) require Firebase credentials. This is expected in CI without secrets.

---

## Testing

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm test -- --reporter=verbose  # Verbose output
```

**Current coverage:** 221 tests across 18 suites (208 passing, 6 environment-dependent, 7 skipped).

Test categories:
- **Unit tests** — Service logic, score aggregation, model routing
- **Component tests** — React Testing Library for key UI components
- **Integration tests** — API route testing with Supertest
- **Feature tests** — Stencil export, hybrid matching, inpainting

---

## Contributing

1. Create a feature branch from `main`
2. Read the relevant directive in `directives/` before coding
3. Check `execution/README.md` for existing code mappings
4. Follow the service → hook → component pattern
5. Add/update tests for any service changes
6. Run `npm test && npm run lint` before pushing

### Branch Convention
- `feat/*` — New features
- `fix/*` — Bug fixes
- `docs/*` — Documentation
- `demo-polish` — Demo Day prep

---

## Status

- ✅ **Phase 1 MVP complete** — Forge studio, Council enhancement, generation, matching, stencil export, booking flow
- ✅ **197+ automated tests** passing
- ✅ **Production deployed** on Railway
- 🚧 **Phase 2** — Mobile experience, user auth hardening, monetization, AR improvements

---

## License

Private repository. All rights reserved.

---

<p align="center">
  <strong>TatT</strong> — because your next tattoo deserves better than a Pinterest screenshot and a prayer.
</p>
