<div align="center">
  <h1>🎨 TatT</h1>
  <p><strong>AI-powered tattoo design studio — from idea to ink-ready stencil in minutes</strong></p>
  <p>
    <a href="https://tatt-app.vercel.app">Live Demo</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#environment-variables">Environment Variables</a> •
    <a href="#architecture">Architecture</a> •
    <a href="ARCHITECTURE.md">Full Architecture Doc</a>
  </p>

  ![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
  ![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
  ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
  ![License](https://img.shields.io/badge/License-Proprietary-red)
</div>

---

## What Is TatT?

TatT solves the tattoo commitment problem: **75% of clients arrive at studios with no clear design, and 40% of artists' time is lost to consultations that don't convert.**

TatT handles the entire pre-ink workflow in one place:

```
Describe your idea → AI generates 4 designs → Preview on your body with AR → Match with the right artist
```

### Key Features

| Feature | Description |
|---------|-------------|
| **AI Design Studio (Forge)** | Generate 4 professional tattoo variations from a text prompt in 10–30 seconds |
| **LLM Council** | 3 AI models (Claude, GPT-4, Gemini) collaborate to transform vague ideas into production-ready art direction |
| **Neural Ink Matching** | Hybrid vector + graph search across artist portfolios to find your perfect match |
| **Forge Canvas** | Layer-based editor with version history, blend modes, and 300 DPI stencil export |
| **AR Visualization** | Preview the design on your body in real-time via MindAR |
| **Swipe Match** | Tinder-style artist discovery — swipe right on portfolio styles you love |
| **Cost Estimator** | Real-time pricing estimates based on size, complexity, and artist location |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Next.js 16 (App Router), Tailwind 4, Framer Motion, Konva |
| **State** | Zustand (`useForgeStore`), custom hooks |
| **Backend** | Next.js API Routes (`/api/v1/*`) + Express proxy (`server.js`) |
| **Image Generation** | Replicate (SDXL, DreamShaper, Anime XL, Blackwork), Google Vertex AI (Imagen 3) |
| **LLM Council** | OpenRouter — Claude 3.5 Sonnet, GPT-4 Turbo, Gemini Pro 1.5 |
| **Database** | Supabase (PostgreSQL + pgvector for semantic search), Neo4j (graph relationships) |
| **Auth** | Firebase Auth via `next-firebase-auth-edge` |
| **Storage** | Google Cloud Storage (GCS) for generated images |
| **Deploy** | Vercel (frontend) + Railway (Express proxy) |

---

## Quick Start

### Prerequisites

- **Node.js 20+** (22.x recommended)
- **npm 9+**
- A **Replicate account** — [get a free API token](https://replicate.com/account/api-tokens)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/TatT.git
cd TatT
npm install --legacy-peer-deps
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Open `.env` and set the **minimum required variables** to get the app running:

```env
# Required — image generation
REPLICATE_API_TOKEN=r8_your_token_here

# Required — frontend ↔ backend auth (both must match)
# Generate with: openssl rand -hex 32
FRONTEND_AUTH_TOKEN=your_generated_secret
VITE_FRONTEND_AUTH_TOKEN=your_generated_secret
```

Everything else is optional for local dev — see the [full env var reference](#environment-variables) below.

### 3. Start the Servers

TatT uses **two servers** in development:

```bash
# Terminal 1 — Next.js dev server (port 3000)
npm run dev

# Terminal 2 — Express proxy server (port 3002)
npm run server
```

Open [http://localhost:3000](http://localhost:3000)

> **Why two servers?** The Express proxy (`server.js`) handles Replicate API calls (to keep your API token server-side), Neo4j graph queries, and GCS uploads. The Next.js app handles all UI, auth, and the `/api/v1/*` routes.

### 4. Generate Your First Design

1. Go to **Generate** (the ✨ icon in the nav)
2. Pick a style: Traditional, Anime, Minimalist, Geometric, etc.
3. Type a description: `"wolf howling at the moon, pine forest"`
4. (Optional) Click **Enhance with AI Council** for multi-model prompt refinement
5. Click **Generate** — wait 10–30 seconds for 4 variations
6. Save to library, or export as a 300 DPI stencil

### No API Keys Yet? Use Demo Mode

```env
VITE_DEMO_MODE=true
VITE_COUNCIL_DEMO_MODE=true
```

This uses mock images and mock LLM responses. Full UI is functional — no API credits burned.

---

## Environment Variables

Copy `.env.example` → `.env` and fill in what you need. Variables are grouped by feature.

### Minimum Required (local dev)

| Variable | Description | How to Get |
|----------|-------------|------------|
| `REPLICATE_API_TOKEN` | Replicate image generation (SDXL, DreamShaper, etc.) | [replicate.com/account](https://replicate.com/account/api-tokens) |
| `FRONTEND_AUTH_TOKEN` | Shared secret: Next.js ↔ Express proxy | `openssl rand -hex 32` |
| `VITE_FRONTEND_AUTH_TOKEN` | Same secret, available to client-side code | Same value as above |

### LLM Council (OpenRouter)

Powers the 3-model prompt enhancement feature. Without this, set `VITE_COUNCIL_DEMO_MODE=true`.

| Variable | Description |
|----------|-------------|
| `VITE_USE_OPENROUTER` | Set `true` to use real LLM council |
| `VITE_OPENROUTER_API_KEY` | OpenRouter API key — [openrouter.ai/keys](https://openrouter.ai/keys) |

Cost: ~$0.01–0.03 per enhancement (Claude + GPT-4 + Gemini).

### Firebase Auth

Required for user accounts and saved designs. Without it, anonymous session is used.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client config (safe to expose) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `FIREBASE_PROJECT_ID` | Server-side project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key (include quotes + `\n` newlines) |
| `AUTH_COOKIE_SIGNATURE_KEY_CURRENT` | Cookie signing key — `openssl rand -hex 32` |
| `AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS` | Previous cookie signing key (for rotation) |

**Setup:** Create a Firebase project → enable Email/Google auth → download a service account key from Project Settings → Service Accounts. Full guide: [docs/firebase-setup.md](docs/firebase-setup.md)

### Supabase (Vector Search + Artist DB)

Powers the semantic artist matching feature (pgvector cosine similarity).

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key (safe to expose, used client-side) |
| `SUPABASE_SERVICE_KEY` | Service role key — **keep secret, server-side only** |

**Setup:**
```sql
-- Run in Supabase SQL Editor
-- 1. Create the artists table + vector columns
\i generated/create-table.sql

-- 2. Seed with 50 sample artists
\i generated/insert-batch-50.sql
```
Full guide: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)

### Neo4j (Graph Database)

Powers relationship-based artist recommendations. Optional — matching works without it.

| Variable | Default | Description |
|----------|---------|-------------|
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j connection URI |
| `NEO4J_USER` | `neo4j` | Database user |
| `NEO4J_PASSWORD` | — | Database password |

**Setup:**
```bash
# Import artist graph data
node scripts/import-to-neo4j.js
# Or run Cypher directly:
# generated/tattoo-artists-neo4j.cypher
```

### Google Cloud (Vertex AI + GCS)

Required for Imagen 3 (photorealistic generation) and image storage.

| Variable | Description |
|----------|-------------|
| `GCP_PROJECT_ID` | GCP project ID |
| `VITE_VERTEX_AI_PROJECT_ID` | Same project (for client-side Vertex calls) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to your GCP service account JSON key |

**Setup:**
1. Create a GCP project with Vertex AI + Cloud Storage APIs enabled
2. Create a service account with roles: `Vertex AI User`, `Storage Object Admin`
3. Download the JSON key: `export GOOGLE_APPLICATION_CREDENTIALS=./gcp-key.json`

Full guide: [docs/gcp-setup.md](docs/gcp-setup.md)

### Feature Flags

Control what's enabled without touching code:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_DEMO_MODE` | `false` | Use mock images (no API calls) |
| `VITE_COUNCIL_DEMO_MODE` | `true` | Use mock LLM responses |
| `VITE_USE_COUNCIL` | `true` | Enable council-enhanced generator |
| `VITE_USE_OPENROUTER` | `false` | Use real OpenRouter LLM council |
| `VITE_ENABLE_INPAINTING` | `true` | Enable inpainting editor |
| `VITE_ENABLE_STENCIL_EXPORT` | `true` | Enable stencil export |
| `VITE_ENABLE_AR_PREVIEW` | `false` | Enable AR visualization (WIP) |

### Budget Controls

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_MAX_DAILY_SPEND` | `10.00` | Max daily API spend in USD |
| `VITE_TOTAL_BUDGET` | `500.00` | Total budget cap in USD |

### Server Config

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Express proxy port (Railway sets this automatically) |
| `HOST` | `127.0.0.1` | Server bind address |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated allowed CORS origins |

---

## Development

### Scripts

```bash
npm run dev          # Start Next.js dev server (port 3000, hot reload)
npm run server       # Start Express proxy (port 3002, Replicate/Neo4j/GCS proxy)
npm run build        # Production build
npm run start        # Start production Next.js server
npm run lint         # ESLint
npm run test         # Run test suite (Vitest)
npm run test:watch   # Vitest watch mode
npm run test:coverage # Coverage report
npm run seed:embeddings  # Seed Supabase artist vector embeddings
```

### Development Tips

- **No API keys?** → Set `VITE_DEMO_MODE=true` and `VITE_COUNCIL_DEMO_MODE=true` — full UI works with mocks
- **Frontend-only change?** → You only need `npm run dev` (port 3000). The proxy is only needed for Replicate/Neo4j/GCS
- **API route change?** → Edit files in `src/app/api/v1/*/route.ts`. Next.js hot-reloads them automatically
- **Proxy change?** → Edit `server.js` and restart `npm run server`
- **Model routing?** → See `src/config/modelRoutingRules.js` — this controls which AI model runs for each tattoo style
- **Prompt engineering?** → See `src/config/promptTemplates.js` — style-specific prompt engineering lives here

### Code Style

- **TypeScript for all new code** (migration ~40% complete — see [docs/MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md))
- **Services pattern**: business logic lives in `src/services/`, not in components
- **Custom hooks**: stateful UI logic lives in `src/hooks/`
- **Zustand**: global canvas state via `useForgeStore.ts`; other state uses React local state / custom hooks
- **REST conventions**: all API routes are `POST /api/v1/{resource}/{action}`

---

## Architecture

### System Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│                           BROWSER (React 19)                          │
│   Next.js 16 App Router • Tailwind 4 • Framer Motion • Konva          │
│                                                                       │
│  ┌────────────┐ ┌─────────────┐ ┌───────────┐ ┌──────────────────┐   │
│  │  /generate │ │  /visualize │ │  /artists │ │  /smart-match    │   │
│  │  (Forge)   │ │  (AR)       │ │  (Match)  │ │  /swipe          │   │
│  └────────┬───┘ └──────┬──────┘ └─────┬─────┘ └──────────────────┘   │
└───────────┼────────────┼──────────────┼────────────────────────────────┘
            │            │              │
      ┌─────▼────────────▼──────────────▼──────┐
      │           Next.js API Routes            │
      │              /api/v1/*                  │
      │                                         │
      │  /generate    /council/enhance          │
      │  /match/semantic  /stencil/export       │
      │  /layers/decompose  /storage/*          │
      │  /embeddings/generate  /ar/visualize    │
      └───────────────┬─────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐    ┌──────────────────────────┐
│  External APIs   │    │  Express Proxy (Railway)  │
│                  │    │  server.js : port 3002    │
│  Replicate       │◀───│                           │
│  OpenRouter      │    │  • Replicate proxy        │
│  Vertex AI       │    │  • Neo4j query proxy      │
│  Firebase        │    │  • GCS upload proxy       │
└──────────────────┘    │  • Rate limiting + CORS   │
                        │  • Bearer token auth      │
                        └──────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                       ▼
      ┌───────────────┐   ┌─────────────────┐   ┌──────────────────┐
      │   Supabase    │   │     Neo4j       │   │  Google Cloud    │
      │  PostgreSQL   │   │  Graph DB       │   │  Storage (GCS)   │
      │  pgvector     │   │  Artist nodes   │   │  Generated imgs  │
      │  Auth         │   │  Style edges    │   │                  │
      └───────────────┘   └─────────────────┘   └──────────────────┘
```

### Core Flows

#### 1. Design Generation

```
User prompt
  → LLM Council Enhancement (Claude + GPT-4 + Gemini via OpenRouter)
  → Model Router (styleModelMapping.js — picks optimal model per style)
  → Replicate/Vertex AI (generates 4 variations)
  → Display + save to library
```

**Available models:**

| Model | Best For |
|-------|---------|
| SDXL | General purpose |
| DreamShaper Turbo | Fast iterations |
| Anime XL (Niji SE) | Anime/manga |
| Tattoo Flash Art | Traditional flash |
| Blackwork Specialist | Linework, dotwork |
| Imagen 3 (Vertex AI) | Photorealism |

#### 2. Artist Matching (Neural Ink)

```
User input (style + zip + budget + radius)
  → Keyword matching (fuzzy text on style, specialty, location)
  → Vector search (Supabase pgvector cosine similarity — 4096-dim CLIP embeddings)
  → Score aggregation (Reciprocal Rank Fusion — combines both signals)
  → Real-time score pulse (Firebase Realtime / Supabase Realtime)
  → Ranked artist list
```

#### 3. Forge Canvas (Layer Editor)

```
Generated image
  → Layer decomposition (Vertex AI — linework / shading / color / background)
  → Konva canvas (drag, resize, rotate, blend modes, version history)
  → Stencil export (300 DPI, thermal-printer calibrated)
```

#### 4. AR Visualization

```
Camera feed → MindAR body detection → Depth mapping → Design warp + overlay
```

### State Management

- **`useForgeStore.ts`** (Zustand + Firestore persistence) — canvas layers, active layer, transform state, undo/redo history
- **Custom hooks** — `useImageGeneration`, `useArtistMatching`, `useVersionHistory`, `useRealtimeMatchPulse`, etc.
- **React Context** — `ToastContext.tsx` (global notification system)
- **Local storage** — design library (up to 50 designs), user preferences

### Data Layer

| Store | Purpose |
|-------|---------|
| **Supabase PostgreSQL** | Artist profiles, auth, row-level security |
| **Supabase pgvector** | 4096-dim CLIP embeddings for semantic portfolio search |
| **Neo4j** | Artist → Style → Recommendation graph |
| **GCS** | Generated image storage |
| **LocalStorage** | Design library cache, user preferences |

---

## Project Structure

```
TatT/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/v1/                 # API routes
│   │   │   ├── generate/           # POST /api/v1/generate
│   │   │   ├── council/            # POST /api/v1/council/enhance
│   │   │   ├── match/              # POST /api/v1/match/semantic
│   │   │   ├── stencil/            # POST /api/v1/stencil/export
│   │   │   ├── layers/             # POST /api/v1/layers/decompose
│   │   │   ├── embeddings/         # POST /api/v1/embeddings/generate
│   │   │   ├── storage/            # POST /api/v1/storage/*
│   │   │   ├── ar/                 # POST /api/v1/ar/visualize
│   │   │   └── estimate/           # POST /api/v1/estimate
│   │   ├── generate/               # /generate page (Forge Studio)
│   │   ├── artists/                # /artists page
│   │   ├── smart-match/            # /smart-match page (SmartMatch.tsx)
│   │   ├── swipe/                  # /swipe page (SwipeMatch.tsx)
│   │   ├── library/                # /library page (design library)
│   │   ├── visualize/              # /visualize page (AR)
│   │   ├── layout.tsx              # Root layout (auth, metadata)
│   │   └── page.tsx                # Home
│   ├── services/                   # Business logic layer
│   │   ├── councilService.ts       # Multi-agent LLM coordination
│   │   ├── replicateService.ts     # Replicate + Vertex AI generation
│   │   ├── matchService.ts         # Hybrid RRF artist matching
│   │   ├── hybridMatchService.ts   # Vector + keyword fusion
│   │   ├── neo4jService.ts         # Graph queries
│   │   ├── versionService.ts       # Design version history
│   │   ├── stencilService.ts       # 300 DPI stencil export
│   │   ├── storageService.ts       # GCS operations
│   │   ├── vectorDbService.ts      # Supabase pgvector queries
│   │   └── canvasService.ts        # Konva layer utilities
│   ├── components/
│   │   ├── Forge/                  # Canvas/editor components
│   │   ├── Match/                  # Artist matching UI
│   │   ├── auth/                   # Auth components (Firebase)
│   │   ├── ui/                     # Shared UI primitives
│   │   └── shared/                 # Common layout components
│   ├── stores/
│   │   └── useForgeStore.ts        # Canvas state (Zustand + Firestore)
│   ├── hooks/                      # Custom React hooks
│   │   ├── useImageGeneration.ts
│   │   ├── useArtistMatching.ts
│   │   ├── useVersionHistory.ts
│   │   ├── useLayerManagement.ts
│   │   ├── useRealtimeMatchPulse.ts
│   │   └── ...
│   ├── config/
│   │   ├── modelRoutingRules.js    # Style → AI model mapping
│   │   ├── promptTemplates.js      # Style-specific prompts
│   │   └── characterDatabase.js    # Known character references
│   └── constants/
│       ├── featureFlags.ts         # Feature toggle constants
│       └── bodyPartAspectRatios.ts # Canvas sizing per body placement
├── server.js                       # Express proxy server (port 3002)
├── scripts/                        # Data generation + seeding
├── generated/                      # Pre-built seed data artifacts
│   ├── create-table.sql            # Supabase DDL
│   ├── insert-batch-50.sql         # 50-artist seed data
│   ├── tattoo-artists-supabase.json
│   └── tattoo-artists-neo4j.cypher
├── docs/                           # Detailed documentation
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   ├── TROUBLESHOOTING.md
│   ├── firebase-setup.md
│   ├── SUPABASE_SETUP.md
│   ├── RAILWAY_SETUP.md
│   └── VERCEL_ENVIRONMENT_SETUP.md
├── tests/                          # Test files
├── public/                         # Static assets
├── next.config.js                  # Next.js config
├── tailwind.config.ts              # Tailwind theme
├── tsconfig.json                   # TypeScript config
└── .env.example                    # Environment template
```

---

## API Reference

All endpoints accept `POST` and require the `Authorization: Bearer $FRONTEND_AUTH_TOKEN` header on the Express proxy. Next.js routes enforce auth via middleware.

### Generate Tattoo Images

```bash
curl -X POST http://localhost:3000/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FRONTEND_AUTH_TOKEN" \
  -d '{
    "prompt": "wolf howling at the moon, pine forest",
    "style": "traditional",
    "bodyPart": "forearm",
    "numOutputs": 4
  }'
```

### Enhance Prompt via LLM Council

```bash
curl -X POST http://localhost:3000/api/v1/council/enhance \
  -H "Content-Type: application/json" \
  -d '{
    "userPrompt": "cool dragon",
    "style": "japanese"
  }'
```

Response:
```json
{
  "simple": "Japanese dragon with cloud motifs in irezumi style...",
  "detailed": "Serpentine dragon, traditional irezumi composition...",
  "ultra": "Full-sleeve mythological dragon, muted earth tones..."
}
```

### Semantic Artist Match

```bash
curl -X POST http://localhost:3000/api/v1/match/semantic \
  -H "Content-Type: application/json" \
  -d '{
    "style": "geometric",
    "location": "85001",
    "budget": 300,
    "radius": 25
  }'
```

### Full Endpoint Reference

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/generate` | Generate tattoo images |
| `POST /api/v1/council/enhance` | Multi-model prompt enhancement |
| `POST /api/v1/match/semantic` | Semantic artist search |
| `POST /api/v1/match/update` | Update match scores |
| `POST /api/v1/layers/decompose` | Decompose image into layers |
| `POST /api/v1/stencil/export` | Export at 300 DPI |
| `POST /api/v1/storage/upload` | Upload to GCS |
| `POST /api/v1/storage/get-signed-url` | Get signed download URL |
| `POST /api/v1/embeddings/generate` | Generate vector embeddings |
| `POST /api/v1/ar/visualize` | AR visualization processing |
| `POST /api/v1/estimate` | Cost estimate for a design |

Full request/response schemas: [docs/API_V1_DOCUMENTATION.md](docs/API_V1_DOCUMENTATION.md)

---

## Testing

```bash
npm run test              # Run all tests (Vitest)
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### Test Layout

```
tests/
├── unit/                 # Service + utility unit tests
└── integration/          # API route tests (supertest)

src/services/__tests__/   # Co-located service tests
src/services/
├── councilService.test.js
├── multiLayerService.test.js
└── versionService.test.js
```

Tests use **Vitest** + **Testing Library**:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Generate')).toBeInTheDocument()
  })
})
```

Core services (council, generation, versioning) are at 80%+ coverage.

---

## Deployment

### Frontend → Vercel

```bash
# CLI deploy
vercel --prod

# Or: connect GitHub repo — pushes to main auto-deploy
```

**Required Vercel env vars:**
- All `NEXT_PUBLIC_FIREBASE_*` vars
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- `AUTH_COOKIE_SIGNATURE_KEY_CURRENT`, `AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS`
- `FRONTEND_AUTH_TOKEN`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `GCP_PROJECT_ID`

Full checklist: [docs/VERCEL_ENVIRONMENT_SETUP.md](docs/VERCEL_ENVIRONMENT_SETUP.md)

### Backend → Railway

```bash
railway up
```

**Required Railway env vars:**
- `REPLICATE_API_TOKEN`
- `FRONTEND_AUTH_TOKEN`
- `ALLOWED_ORIGINS` → your Vercel URL (e.g. `https://tatt-app.vercel.app`)
- `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` (if using Neo4j)
- `PORT` is set automatically by Railway

Full guide: [docs/RAILWAY_SETUP.md](docs/RAILWAY_SETUP.md)

### Database Seeding

**Supabase:**
```sql
-- Run in Supabase SQL Editor
\i generated/create-table.sql
\i generated/insert-batch-50.sql
```

**Neo4j:**
```bash
node scripts/import-to-neo4j.js
# Or use the Cypher file directly:
# generated/tattoo-artists-neo4j.cypher
```

---

## Troubleshooting

<details>
<summary><strong>❌ "Failed to generate image" or request timeout</strong></summary>

1. Confirm `REPLICATE_API_TOKEN` is valid — test it at [replicate.com/account](https://replicate.com/account)
2. Make sure the Express proxy is running: `npm run server` (port 3002)
3. Check Replicate API status: [status.replicate.com](https://status.replicate.com)
4. Fallback: set `VITE_DEMO_MODE=true` to verify UI works without API
</details>

<details>
<summary><strong>❌ CORS error on API calls</strong></summary>

1. Verify `ALLOWED_ORIGINS` in your proxy includes the frontend URL
2. Confirm the Express proxy is running (`npm run server`)
3. In local dev, frontend is port 3000 — proxy must allow `http://localhost:3000`
</details>

<details>
<summary><strong>❌ "Council enhancement failed"</strong></summary>

1. Check `VITE_USE_OPENROUTER=true` and `VITE_OPENROUTER_API_KEY` is set
2. Temporarily bypass: set `VITE_COUNCIL_DEMO_MODE=true`
3. Verify OpenRouter account has credits
</details>

<details>
<summary><strong>❌ Firebase auth errors or cookie issues</strong></summary>

1. All `NEXT_PUBLIC_FIREBASE_*` vars must be set in `.env`
2. `AUTH_COOKIE_SIGNATURE_KEY_CURRENT` must be a valid 64-char hex string
3. Firebase project must have Authentication enabled (Email + Google providers)
4. Private key: make sure `\n` newlines are real newlines in the env var, not the literal string
5. Full guide: [docs/firebase-setup.md](docs/firebase-setup.md)
</details>

<details>
<summary><strong>❌ Supabase vector search not returning results</strong></summary>

1. Confirm pgvector extension is enabled: `create extension if not exists vector;` in Supabase SQL editor
2. Make sure artist data is seeded: `\i generated/insert-batch-50.sql`
3. Check `SUPABASE_SERVICE_KEY` is set — anon key doesn't have permission for vector ops
</details>

<details>
<summary><strong>❌ TypeScript / build errors</strong></summary>

1. Build ignores TS errors by default (`ignoreBuildErrors: true` in `next.config.js`) — this is intentional during migration
2. Run `npm run lint` to find ESLint issues
3. Migration is ~40% complete; some JS files coexist with TS — don't convert them without checking [docs/MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md)
</details>

<details>
<summary><strong>❌ npm install fails with peer dependency errors</strong></summary>

```bash
npm install --legacy-peer-deps
```

React 19 has peer dep conflicts with some packages. `--legacy-peer-deps` is the expected workaround (also set in `vercel.json`).
</details>

More in [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## TypeScript Migration Status

The codebase is ~40% migrated from JavaScript to TypeScript. Migration follows a bottom-up strategy:

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Project setup, tsconfig | ✅ Complete |
| 1 | Contexts (ToastContext) | ✅ Complete |
| 2a–2c | Hooks + core services (23 files, ~7,500 lines) | ✅ Complete |
| 3 | Remaining services, pages, components | ⏳ In progress |
| 4 | Enable `strict: true` | 🔜 After Phase 3 |

**New code must be TypeScript.** See [docs/MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md) for what's been done and what's next.

---

## Contributing

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) first
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Write TypeScript for new code
4. Add tests for new services/hooks
5. Run `npm run test && npm run lint && npm run build`
6. Submit a PR — describe what changed and why

### Where Things Go

| Thing | Location |
|-------|---------|
| Business logic | `src/services/` + corresponding test file |
| UI logic (stateful) | `src/hooks/` |
| React components | `src/components/{feature}/` |
| Global state | `src/stores/` (Zustand) |
| API endpoints | `src/app/api/v1/{resource}/route.ts` |
| Config / constants | `src/config/` or `src/constants/` |

---

## Roadmap

- [ ] Mobile app (React Native / Expo)
- [ ] Artist-side dashboard + booking management
- [ ] Stripe integration for stencil purchases
- [ ] Fine-tuned tattoo-specific model (LoRA on existing SDXL)
- [ ] Multi-session design collaboration
- [ ] Flash marketplace (buy/sell pre-made designs)

---

## License

Proprietary. All rights reserved. © 2026 TatT.

---

<div align="center">
  <strong>Turn ideas into ink.</strong><br><br>
  <a href="https://tatt-app.vercel.app">Try the Demo →</a>
</div>
