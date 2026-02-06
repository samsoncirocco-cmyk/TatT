# 🎨 TatT — AI-Powered Tattoo Design Studio

> Generate, refine, and visualize custom tattoo designs with AI. Match with real artists. Preview on your body with AR.

**Live:** [tat-t-3x8t.vercel.app](https://tat-t-3x8t.vercel.app)

---

## What Is TatT?

TatT is a mobile-first tattoo design platform that combines AI image generation, an LLM council for prompt enhancement, semantic artist matching, and AR body visualization — all in one app.

**For tattoo enthusiasts:** Describe an idea → get professional-quality designs → find the right artist → preview it on your body.

**For developers:** A full-stack Next.js + Vite hybrid with Supabase, Neo4j, Google Vertex AI, Replicate, and OpenRouter integrations.

## Features

| Feature | Description |
|---|---|
| **AI Design Generation** | Generate 4 tattoo variations from a text prompt via Replicate (SDXL, Anime XL, Imagen 3) |
| **LLM Council** | Multi-model prompt enhancement using OpenRouter (Claude, GPT-4, Gemini) — transforms "dragon" into a professional art prompt |
| **Multi-Model Routing** | Automatically selects the best AI model based on style, complexity, and body placement |
| **Neural Ink Matching** | Semantic artist matching using Supabase vector search (pgvector) with real-time match scoring |
| **Forge Canvas** | Layer-based design editor with drag-and-drop, transform controls, version history, and stencil export |
| **AR Visualization** | Preview designs on your body using your camera (MindAR) |
| **Swipe Match** | Tinder-style artist discovery with swipe cards |
| **Design Library** | Save, favorite, and export your designs |
| **Stencil Export** | Export at 300 DPI for print-ready tattoo stencils |

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Next.js 16, Tailwind CSS 4, Framer Motion, Zustand, Konva (canvas) |
| **Backend** | Next.js API routes + Express proxy server |
| **Image Generation** | Replicate (SDXL, DreamShaper, Anime XL), Google Vertex AI (Imagen 3) |
| **LLM Council** | OpenRouter (Claude 3.5 Sonnet, GPT-4 Turbo, Gemini Pro 1.5) |
| **Database** | Supabase (PostgreSQL + pgvector), Neo4j (graph relationships) |
| **Storage** | Google Cloud Storage (GCS) |
| **AR** | MindAR |
| **Deployment** | Vercel (frontend), Railway (backend proxy) |

## Quick Start

### Prerequisites
- Node.js 18+
- A [Replicate](https://replicate.com) API token

### 1. Install

```bash
git clone https://github.com/your-repo/TatT.git
cd TatT
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` and add your API keys. At minimum you need:
- `REPLICATE_API_TOKEN` — for image generation
- `FRONTEND_AUTH_TOKEN` — shared secret between frontend and backend

See `.env.example` for the full list of optional integrations (Supabase, Neo4j, Vertex AI, OpenRouter).

### 3. Run

```bash
# Frontend (Next.js)
npm run dev

# Backend proxy (Express) — separate terminal
npm run server
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Generate Your First Design

1. Navigate to **Generate** (✨ icon in the dock)
2. Pick a style (e.g., Traditional, Anime, Minimalist)
3. Describe your idea (e.g., "wolf howling at the moon")
4. Optionally click **Enhance with AI Council** for better prompts
5. Hit **Generate Design** — wait 10–30s
6. Save favorites to your library

## Project Structure

```
TatT/
├── src/
│   ├── app/              # Next.js pages and API routes
│   │   └── api/v1/       # Versioned API endpoints
│   ├── components/        # React UI components
│   │   ├── generate/      #   Forge canvas, layers, prompts
│   │   ├── Match/         #   Artist matching UI
│   │   └── ui/            #   Shared UI primitives
│   ├── services/          # Business logic
│   │   ├── councilService.ts        # LLM council integration
│   │   ├── matchService.ts          # Artist matching
│   │   ├── hybridMatchService.ts    # Vector + keyword matching
│   │   └── replicateService.ts      # Image generation
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand state management
│   ├── config/            # Model routing, prompt templates
│   └── pages/             # Feature pages (Generate, Visualize, Artists...)
├── server.js              # Express proxy server (Railway)
├── scripts/               # Data generation and migration scripts
├── tests/                 # Vitest test suite
└── generated/             # Generated data artifacts (artists, SQL)
```

## Environment Variables

See [`.env.example`](.env.example) for the complete reference. Key groups:

- **Core:** `VITE_PROXY_URL`, `FRONTEND_AUTH_TOKEN`
- **Image Generation:** `REPLICATE_API_TOKEN`, `VITE_VERTEX_AI_PROJECT_ID`
- **LLM Council:** `VITE_USE_OPENROUTER`, `VITE_OPENROUTER_API_KEY`
- **Database:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEO4J_URI`
- **Feature Flags:** `VITE_ENABLE_INPAINTING`, `VITE_ENABLE_AR_PREVIEW`
- **Budget:** `VITE_MAX_DAILY_SPEND`, `VITE_TOTAL_BUDGET`

## Deployment

**Frontend** → Vercel (auto-deploys from `main`). See [`VERCEL_ENVIRONMENT_SETUP.md`](docs/VERCEL_ENVIRONMENT_SETUP.md).

**Backend Proxy** → Railway. See [`docs/RAILWAY_SETUP.md`](docs/RAILWAY_SETUP.md).

## Scripts

```bash
npm run dev          # Start Next.js dev server
npm run server       # Start Express proxy server
npm run build        # Production build
npm run lint         # ESLint
```

Utility scripts in `scripts/`:
- `generate-tattoo-artists-data.js` — Generate synthetic artist data
- `setup-supabase-vector-schema.js` — Set up pgvector schema
- `import-to-neo4j.js` — Import artist data to Neo4j
- `benchmark-vector-search.js` — Benchmark vector search performance

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — System architecture and tech stack details
- [`docs/`](docs/) — Setup guides, deployment docs, and development history

## License

Private — All rights reserved.
