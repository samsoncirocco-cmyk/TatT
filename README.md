<div align="center">
  <h1>🎨 TatT</h1>
  <p><strong>AI-powered tattoo design studio that turns ideas into ink-ready art</strong></p>
  <p>
    <a href="https://tat-t-3x8t.vercel.app">Live Demo</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#api-reference">API Reference</a> •
    <a href="ARCHITECTURE.md">Architecture</a>
  </p>
</div>

---

## The Problem

**$3B spent annually on tattoos in the US. 75% of clients arrive with no clear design.**

Getting a tattoo today is broken:

1. **Discovery friction** — Pinterest boards, vague Instagram DMs, hoping an artist "gets it"
2. **No preview** — You commit to permanent art without seeing it on your body
3. **Artist mismatch** — The wrong artist for your style means a lifetime of regret
4. **Design iteration** — Want changes? Pay $150/hour for sketches that might not work

Artists lose 40% of their time to consultations that don't convert. Clients leave with tattoos they didn't want.

## The Solution

TatT is an AI-native tattoo design platform that handles the entire pre-ink workflow:

```
Describe your idea → AI generates designs → Preview on your body with AR → Match with the perfect artist
```

**One platform replaces:** Pinterest, consultation calls, deposit gambles, and "I hope this looks good on me" anxiety.

### Key Features

| Feature | What it does |
|---------|--------------|
| **AI Design Studio** | Generate 4 professional variations from a text prompt (10-30 sec) |
| **LLM Council** | 3 AI models collaborate to transform "cool dragon" → production-ready art direction |
| **Neural Ink Matching** | Semantic search across artist portfolios finds your perfect match |
| **Forge Canvas** | Layer-based editor with version history, export at 300 DPI stencil-ready |
| **AR Visualization** | See the design on your body before you commit |
| **Swipe Match** | Tinder-style artist discovery — swipe right on portfolios |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT                                          │
│                   React 19 • Next.js 16 • Tailwind 4                         │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Generate (Forge)  │  Visualize (AR)  │  Artists (Match)  │  Library  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
    ┌───────────────────────────┐  ┌────────────────────────────┐
    │    Next.js API Routes      │  │   Express Proxy (Railway)  │
    │    /api/v1/*               │  │   Rate limiting • Auth     │
    │                            │  │                            │
    │  • /generate               │  │  • Replicate proxy         │
    │  • /council/enhance        │  │  • Neo4j queries           │
    │  • /match/semantic         │  │  • GCS uploads             │
    │  • /stencil/export         │  │                            │
    │  • /layers/decompose       │  │                            │
    └─────────────┬──────────────┘  └──────────────┬─────────────┘
                  │                                 │
    ┌─────────────┴─────────────────────────────────┴─────────────┐
    │                      EXTERNAL SERVICES                       │
    │                                                              │
    │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
    │  │  Replicate  │ │ OpenRouter  │ │  Vertex AI  │            │
    │  │  SDXL       │ │ Claude/GPT  │ │  Imagen 3   │            │
    │  │  Anime XL   │ │ Gemini      │ │  Embeddings │            │
    │  │  Blackwork  │ │ (Council)   │ │             │            │
    │  └─────────────┘ └─────────────┘ └─────────────┘            │
    │                                                              │
    │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
    │  │  Supabase   │ │   Neo4j     │ │    GCS      │            │
    │  │  Postgres   │ │  Graph DB   │ │   Storage   │            │
    │  │  pgvector   │ │  Artist     │ │   Images    │            │
    │  │  Auth       │ │  Relations  │ │             │            │
    │  └─────────────┘ └─────────────┘ └─────────────┘            │
    └──────────────────────────────────────────────────────────────┘
```

### Core Flows

**Design Generation:**
```
User prompt → LLM Council (3 models) → Model Router → Replicate/Vertex → 4 variations
```

**Artist Matching:**
```
User preferences → Keyword match + Vector search (pgvector) → Weighted score → Ranked results
```

**Stencil Export:**
```
Forge Canvas → Layer composition → 300 DPI export → Thermal printer ready
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Next.js 16, Tailwind 4, Framer Motion, Zustand, Konva |
| **Backend** | Next.js API routes, Express proxy |
| **Image Gen** | Replicate (SDXL, DreamShaper, Anime XL, Blackwork), Google Vertex AI (Imagen 3) |
| **LLM Council** | OpenRouter (Claude 3.5 Sonnet, GPT-4 Turbo, Gemini Pro 1.5) |
| **Database** | Supabase (PostgreSQL + pgvector), Neo4j |
| **Storage** | Google Cloud Storage |
| **AR** | MindAR |
| **Auth** | Firebase Auth (next-firebase-auth-edge) |
| **Deploy** | Vercel (frontend), Railway (backend) |

## Quick Start

### Prerequisites
- Node.js 18+
- Replicate API token ([get one](https://replicate.com/account/api-tokens))

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/TatT.git
cd TatT
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

**Minimum required:**
```env
REPLICATE_API_TOKEN=r8_your_token_here
FRONTEND_AUTH_TOKEN=generate_with_openssl_rand_-hex_32
```

**Optional integrations:**
- `VITE_OPENROUTER_API_KEY` — Enable LLM Council (Claude + GPT-4 + Gemini)
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` — Vector search and auth
- `NEO4J_URI` + `NEO4J_PASSWORD` — Graph-based artist relationships
- `VITE_VERTEX_AI_PROJECT_ID` — Imagen 3 photorealistic generation

### 3. Run

```bash
# Start Next.js (port 3000)
npm run dev

# Start Express proxy (port 3002) — in separate terminal
npm run server
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Generate Your First Design

1. Navigate to **Generate** (✨ icon)
2. Select a style (Traditional, Anime, Minimalist, etc.)
3. Describe your idea: "wolf howling at the moon, pine forest background"
4. Click **Enhance with AI Council** for better results
5. Hit **Generate** — wait 10-30 seconds
6. Save to library or export as stencil

## API Reference

All endpoints: `POST /api/v1/{resource}/{action}`

### Image Generation

```bash
POST /api/v1/generate
Content-Type: application/json

{
  "prompt": "wolf howling at the moon",
  "style": "traditional",
  "bodyPart": "forearm",
  "numOutputs": 4
}
```

**Response:** Array of image URLs

### LLM Council Enhancement

```bash
POST /api/v1/council/enhance
Content-Type: application/json

{
  "userPrompt": "cool dragon",
  "style": "japanese"
}
```

**Response:**
```json
{
  "simple": "Japanese dragon with cloud motifs...",
  "detailed": "Mythological dragon in traditional irezumi style...",
  "ultra": "Full-sleeve composition featuring a serpentine dragon..."
}
```

### Semantic Artist Matching

```bash
POST /api/v1/match/semantic
Content-Type: application/json

{
  "style": "blackwork",
  "location": "85281",
  "radius": 50,
  "budget": { "min": 100, "max": 500 }
}
```

**Response:** Ranked artist array with match scores

### Full API Surface

| Endpoint | Purpose |
|----------|---------|
| `/api/v1/generate` | Generate tattoo images |
| `/api/v1/council/enhance` | LLM prompt enhancement |
| `/api/v1/match/semantic` | Vector-based artist matching |
| `/api/v1/match/update` | Update match scores |
| `/api/v1/layers/decompose` | Split image into layers |
| `/api/v1/stencil/export` | Export at 300 DPI |
| `/api/v1/storage/upload` | Upload to GCS |
| `/api/v1/storage/get-signed-url` | Get signed download URL |
| `/api/v1/embeddings/generate` | Generate vector embeddings |
| `/api/v1/ar/visualize` | AR visualization processing |
| `/api/v1/estimate` | Cost estimation |
| `/api/v1/tasks/*` | Background task management |

## Project Structure

```
TatT/
├── src/
│   ├── app/                    # Next.js pages + API routes
│   │   └── api/v1/             # Versioned REST API
│   ├── services/               # Core business logic
│   │   ├── councilService.ts   # LLM council orchestration
│   │   ├── replicateService.ts # Image generation
│   │   ├── matchService.ts     # Artist matching
│   │   ├── hybridMatchService.ts # Vector + keyword matching
│   │   ├── stencilService.ts   # Stencil export
│   │   └── neo4jService.ts     # Graph queries
│   ├── components/             # React UI
│   ├── stores/                 # Zustand state management
│   ├── hooks/                  # Custom React hooks
│   └── config/                 # Model routing, prompt templates
├── server.js                   # Express proxy server
├── scripts/                    # Data generation, migrations
├── generated/                  # Seeded data artifacts
└── tests/                      # Vitest test suite
```

## Deployment

### Frontend → Vercel

```bash
vercel --prod
```

Or connect GitHub for auto-deploys on `main`.

**Required env vars:** See [docs/VERCEL_ENVIRONMENT_SETUP.md](docs/VERCEL_ENVIRONMENT_SETUP.md)

### Backend → Railway

```bash
railway up
```

**Required env vars:**
- `REPLICATE_API_TOKEN`
- `FRONTEND_AUTH_TOKEN`
- `ALLOWED_ORIGINS` (your Vercel URL)
- `PORT` (set automatically by Railway)

See [docs/RAILWAY_SETUP.md](docs/RAILWAY_SETUP.md)

### Database Setup

**Supabase:**
```bash
# Run in Supabase SQL Editor
psql < generated/create-table.sql
psql < generated/insert-batch-50.sql
```

**Neo4j:**
```bash
node scripts/import-to-neo4j.js
```

## Scripts

```bash
npm run dev          # Next.js dev server
npm run server       # Express proxy
npm run build        # Production build
npm run test         # Run tests (Vitest)
npm run lint         # ESLint

# Utility scripts
node scripts/generate-tattoo-artists-data.js  # Generate artist seed data
node scripts/setup-supabase-vector-schema.js  # Set up pgvector
node scripts/benchmark-vector-search.js       # Benchmark search performance
```

## Business Model

**For Users:** Free to generate, pay-per-stencil export, premium AR features

**For Artists:** Subscription for enhanced matching, analytics, verified badges

**For Studios:** Enterprise API for white-label integration

## Metrics

- **Generation time:** 10-30s per batch (4 images)
- **Council latency:** ~2s for 3-model consensus
- **Vector search:** <100ms for 10K artists (pgvector)
- **Test coverage:** Core services at 80%+

## Roadmap

- [ ] Mobile app (React Native)
- [ ] Artist-side dashboard
- [ ] Stripe integration for stencil purchases
- [ ] Fine-tuned tattoo-specific model
- [ ] Multi-session design collaboration

## Team

Building in public. Shipping fast. [Contact us](mailto:team@tatt.dev)

---

<div align="center">
  <strong>Turn ideas into ink.</strong>
  <br><br>
  <a href="https://tat-t-3x8t.vercel.app">Try the Demo</a>
</div>
