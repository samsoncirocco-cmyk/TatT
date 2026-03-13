# TatT — AI-Powered Tattoo Design Platform

> Democratize custom tattoo design. Turn any idea into a multi-layer design, preview it in AR on your body, and connect with the right artist to bring it to life.

[![Production](https://img.shields.io/badge/production-live-brightgreen)](https://tatt-production.up.railway.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Railway](https://img.shields.io/badge/deployed-Railway-purple)](https://railway.app)

---

## What TatT Does

1. **AI Design Generation** — Describe your tattoo idea in plain English. A council of AI agents (Creative + Technical + Style) enhances your prompt, then generates multi-layer RGBA designs using SDXL and Google Imagen 3.

2. **AR Body Preview** — See your design on your actual body in real-time using depth mapping and camera overlay. Rotate, resize, and reposition before committing.

3. **Smart Artist Matching** — Semantic search finds artists whose portfolio matches your design style. Uses vector embeddings (pgvector), graph relationships (Neo4j), and real-time updates (Firebase).

4. **Stencil Export** — Convert any design to print-ready stencil format (edge detection → PDF) for artists to use directly.

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- API keys (see [Environment Variables](#environment-variables))

### Setup

```bash
# Clone and install
git clone https://github.com/samsoncirocco-cmyk/TatT.git
cd TatT
git checkout manama/next    # Truth branch
npm install

# Configure environment
cp .env.master .env.local   # Template with all variables
# Edit .env.local with your API keys (see below)

# Start development server
npm run dev                 # http://localhost:3000
```

### Build & Deploy

```bash
npm run build               # Production build (webpack)
npm run build:clean          # Clean build (removes stale .next/lock)
npm run start                # Start production server
npm run server               # Start custom server (server.js)

# Deploy to Railway (auto-deploys on push to main)
# Or manual: railway up

# Tests
npm test                     # Run vitest (197 tests, 14 files)
npm run test:watch           # Watch mode
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Client (Next.js App Router)                     │
│  • Landing (/), Generate (/generate),            │
│    Artists (/artists), Visualize (/visualize),   │
│    Pitch (/pitch)                                │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  API Layer (/api/v1/*)                           │
│  ├── /generate         AI design generation      │
│  ├── /council/enhance  Prompt enhancement        │
│  ├── /match/semantic   Artist matching (RRF)     │
│  ├── /stencil/export   Stencil PDF generation    │
│  ├── /ar/*             AR preview endpoints      │
│  ├── /layers/*         Layer management          │
│  ├── /embeddings/*     Vector operations         │
│  └── /storage/*        GCS file management       │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  Service Layer (src/services/)                   │
│  ├── councilService.ts    3-agent prompt council │
│  ├── generationService.ts Multi-model routing    │
│  ├── replicateService.js  SDXL (4 variants)     │
│  ├── vertex-imagen-client Imagen 3 (RGBA)       │
│  ├── matchService.js      Reciprocal Rank Fusion│
│  ├── vectorDbService.js   Supabase pgvector     │
│  ├── neo4jService.ts      Graph queries          │
│  ├── firebase-match-*.ts  Real-time sync        │
│  ├── stencilService.js    Edge detect → PDF     │
│  ├── gcs-service.ts       Cloud Storage         │
│  └── layerDecomposition   Vision API segmentation│
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│  External APIs                                   │
│  • Replicate (SDXL)    • Vertex AI (Imagen/     │
│  • Supabase (pgvector)   Gemini/Vision)         │
│  • Neo4j (graph DB)    • Firebase (real-time)   │
│  • GCS (storage)       • OpenRouter (fallback)  │
└─────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (App Router), React 19, Tailwind CSS | Server components + SSR |
| Animations | Framer Motion, React-Konva | Smooth UX, canvas manipulation |
| AI Generation | Replicate (SDXL), Vertex AI (Imagen 3) | Multi-model with fallbacks |
| AI Council | Vertex AI Gemini 2.0 Flash | 3-agent prompt enhancement |
| Vector Search | Supabase (pgvector) | Artist matching via embeddings |
| Graph DB | Neo4j | Style hierarchies, artist relationships |
| Real-time | Firebase | Live match updates, presence |
| Storage | Google Cloud Storage | Design layers, exports |
| Deployment | Railway (Nixpacks) | Auto-deploy, easy scaling |

---

## Project Structure

```
TatT/
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── api/v1/        # All API endpoints
│   │   ├── generate/      # Design generation page
│   │   ├── artists/       # Artist discovery
│   │   ├── visualize/     # AR preview
│   │   ├── pitch/         # YC demo pitch page
│   │   └── uploads/       # Upload management
│   ├── components/        # Shared React components
│   ├── features/          # Domain modules
│   │   ├── generate/      # Generation feature
│   │   ├── match-pulse/   # Matching feature
│   │   ├── stencil/       # Stencil export
│   │   └── inpainting/    # Design editing
│   ├── services/          # Business logic layer
│   ├── config/            # Skill packs, model routing
│   └── utils/             # Helpers, scoring
├── scripts/               # DB setup, migrations
├── directives/            # Workflow SOPs (DOE framework)
├── execution/             # Directive → code mapping
├── tests/                 # Test suites
├── server.js              # Custom Node.js server
├── railway.json           # Railway deployment config
└── CLAUDE.md              # Detailed agent instructions
```

---

## Environment Variables

Copy `.env.master` to `.env.local` and fill in:

```bash
# === Core AI ===
REPLICATE_API_TOKEN=r8_***            # SDXL image generation
OPENROUTER_API_KEY=sk-or-***          # Council fallback

# === Google Cloud ===
GCP_PROJECT_ID=tatt-pro
GCP_REGION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json  # Service account

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://***.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***

# === Neo4j ===
NEO4J_URI=neo4j+s://***.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=***

# === Firebase ===
NEXT_PUBLIC_FIREBASE_API_KEY=***
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=***.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=***
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://***.firebaseio.com

# === Auth ===
FRONTEND_AUTH_TOKEN=***               # Shared frontend/backend secret
TATT_API_KEY=***                      # API auth (optional)

# === Feature Flags ===
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_COUNCIL_DEMO_MODE=false
```

All 18 production env vars are configured on Railway. See `TATT_ENV_REFERENCE.md` for full details.

---

## Core Workflows

### 1. Generate a Tattoo Design

```
User prompt → Council Enhancement (3 AI agents) → SDXL/Imagen Generation → Multi-layer RGBA output
```

- **Endpoint:** `POST /api/v1/generate`
- **Council:** Creative + Technical + Style agents collaboratively refine the prompt
- **Models:** SDXL (4 variants, ~$0.006/image) or Imagen 3 (RGBA, ~$0.04/image)
- **Output:** 4 design layers (outline, shading, color, detail) as RGBA PNGs

### 2. AR Body Preview

```
Camera feed → Body detection → Depth mapping → Design overlay → Real-time composite
```

- **Endpoint:** `/api/v1/ar/*`
- **Client-side:** React-Konva canvas with camera integration
- **Features:** Pinch-to-resize, rotate, reposition on body

### 3. Smart Artist Matching

```
Design vector → pgvector similarity → Neo4j graph enrichment → Firebase live updates → Ranked results
```

- **Endpoint:** `POST /api/v1/match/semantic`
- **Algorithm:** Reciprocal Rank Fusion (RRF) combining vector + graph scores
- **Real-time:** Firebase pushes match updates as they're computed

### 4. Stencil Export

```
Design → Edge detection → Threshold → PDF generation → Download
```

- **Endpoint:** `POST /api/v1/stencil/export`
- **Output:** Print-ready PDF with thermal printer compatibility

---

## Database Setup

```bash
# Supabase: Create tables and vector indexes
node scripts/setup-supabase-vector-schema.js

# Neo4j: Seed graph with artist data
node scripts/import-to-neo4j.js

# Embeddings: Generate artist portfolio vectors
node scripts/generate-vertex-embeddings.js
```

---

## Cost Estimates

| Service | Cost Per Unit | Notes |
|---------|--------------|-------|
| Replicate SDXL | ~$0.006/image | 4 outputs = $0.024/generation |
| Vertex Imagen 3 | ~$0.04/image | Higher quality, RGBA |
| Vertex Gemini (Council) | ~$0.02/request | 3-agent prompt enhancement |
| Vertex Vision | ~$0.0015/image | Layer decomposition |
| Supabase | Free tier | Vector search <100ms |
| Neo4j Aura | Free tier | Graph queries |
| Firebase | Free tier | Real-time sync |

**Monthly target:** ~$500 supports ~5,000 full design workflows.

---

## Deployment

### Railway (Production)

```bash
# Auto-deploys on push to main
git push origin manama/next:main

# Manual deploy
railway up
```

- **URL:** https://tatt-production.up.railway.app
- **Build:** Nixpacks (auto-detected)
- **Start:** `npm run server` (custom server.js)
- **Restart:** On failure, max 10 retries

### Vercel (Alternative)

```bash
vercel deploy        # Preview
vercel --prod        # Production
```

---

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `manama/next` | **Truth branch** — active development |
| `main` | Production (Railway auto-deploys) |
| `demo-polish` | UI polish for demos |
| `feat/*` | Feature branches |

---

## Contributing

This project follows the **DOE Framework** (Directives → Orchestration → Execution):

1. **Check `directives/`** for existing workflow SOPs
2. **Check `execution/README.md`** for code mappings
3. **Implement in `src/services/`** or `src/features/`
4. **Test with `npm test`**
5. **Update the directive** with what you learned

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Council enhancement failed" | Check `GOOGLE_APPLICATION_CREDENTIALS` and Vertex AI API enabled |
| "Vector search returns no results" | Run `node scripts/generate-vertex-embeddings.js` |
| "Neo4j connection timeout" | Verify Neo4j Aura instance is running; demo mode available |
| "Layer upload fails" | Check GCS bucket permissions (`storage.objects.create`) |
| Build fails with `.next/lock` | Run `npm run build:clean` |

---

## License

Proprietary — © 2026 Samson Cirocco. All rights reserved.
