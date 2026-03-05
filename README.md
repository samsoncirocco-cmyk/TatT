# TatT — AI Tattoo Design Studio

> **AI-powered tattoo design generation, layer editing, artist matching, and AR visualization.** Built for first-time tattoo seekers who want to explore custom designs before committing.

[![Production](https://img.shields.io/badge/production-Railway%20%2B%20Vercel-black)](https://tatt-production.up.railway.app)

---

## Table of Contents

- [What Is TatT?](#what-is-tatt)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Database Setup](#database-setup)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## What Is TatT?

TatT (codename **TatTester**) is a full-stack web app that lets users:

1. **Generate** custom tattoo designs using AI (Replicate + Vertex AI Imagen 3)
2. **Edit** designs in a layer-based canvas editor ("The Forge")
3. **Match** with local tattoo artists via a hybrid vector-graph search engine
4. **Visualize** designs on their body using AR (augmented reality)
5. **Export** print-ready stencils at 300 DPI

The core differentiation is the **hybrid matching system**: a combination of Neo4j graph traversal and Supabase pgvector similarity search, merged via Reciprocal Rank Fusion. This surfaces both "known-relationship" matches (graph) and "visually similar portfolio" matches (vector) in a single ranked result.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER / CLIENT                             │
│         Next.js 16 + React 19 + Tailwind + Zustand                 │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Home    │  │  Forge   │  │ Artists  │  │   AR     │           │
│  │ Landing  │  │ (Canvas) │  │ (Match)  │  │ Visualize│           │
│  └──────────┘  └────┬─────┘  └────┬─────┘  └──────────┘           │
└───────────────────────┼────────────┼────────────────────────────────┘
                        │            │
          ┌─────────────┴────┐  ┌────┴────────────────┐
          │  Next.js API     │  │  Express Proxy        │
          │  Routes /api/v1/ │  │  server.js (Railway) │
          │                  │  │                       │
          │ • /generate      │  │ • Replicate proxy     │
          │ • /council/...   │  │ • Neo4j proxy         │
          │ • /match/...     │  │ • Auth middleware      │
          │ • /stencil/...   │  │ • Rate limiting        │
          │ • /layers/...    │  │                       │
          └──────┬───────────┘  └────────┬──────────────┘
                 │                        │
    ┌────────────┼────────────────────────┼─────────────┐
    ▼            ▼            ▼           ▼             ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ ┌───────────┐
│Vertex AI│ │Replicate│ │Supabase │ │ Neo4j  │ │ Firebase  │
│(Imagen3)│ │(SDXL+)  │ │pgvector │ │(Graph) │ │  Auth     │
│ GCS     │ │         │ │  Auth   │ │        │ │           │
└─────────┘ └─────────┘ └─────────┘ └────────┘ └───────────┘
```

### Request Flow — Design Generation

```
User prompt
  → Council Enhancement (OpenRouter: Claude + GPT-4 + Gemini)
  → Model Router (picks best model per style/complexity)
  → Replicate API (SDXL / DreamShaper / Anime XL / Imagen 3)
  → 4 image variations returned
  → User saves to library → Layer Decomposition → Forge Canvas
```

### Request Flow — Artist Matching

```
User preferences (style, location, budget)
  → Parallel execution:
      ├── Neo4j Cypher query  (relationship graph)
      └── Supabase pgvector   (cosine similarity on CLIP embeddings)
  → Reciprocal Rank Fusion (k=60, 50/50 weighted)
  → Ranked results with real-time score pulse (Supabase Realtime)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4, Framer Motion, Zustand |
| **Canvas** | Konva / react-konva (layer editor) |
| **Backend** | Express.js (proxy server), Next.js API routes |
| **Auth** | Firebase Authentication + next-firebase-auth-edge |
| **Primary DB** | Supabase (PostgreSQL + pgvector for semantic search) |
| **Graph DB** | Neo4j (artist relationship graph) |
| **AI Generation** | Replicate (SDXL, DreamShaper XL, Anime XL, Tattoo Flash Art) |
| **AI Premium** | Google Vertex AI Imagen 3 |
| **AI Council** | OpenRouter (Claude 3.5, GPT-4 Turbo, Gemini 1.5 Pro) |
| **Storage** | Google Cloud Storage (GCS) |
| **Deployment** | Vercel (frontend) + Railway (backend) |
| **Testing** | Vitest + @testing-library/react |

---

## Local Setup

### Prerequisites

- **Node.js** 20+ (`node --version`)
- **npm** 10+ (`npm --version`)
- A **Replicate** account → [replicate.com](https://replicate.com)
- A **Supabase** project → [supabase.com](https://supabase.com) *(for matching features)*
- A **Firebase** project → [console.firebase.google.com](https://console.firebase.google.com) *(for auth)*

Optional (for full feature set):
- **Neo4j** instance (Aura free tier works) → [neo4j.com/cloud/aura](https://neo4j.com/cloud/aura)
- **OpenRouter** key → [openrouter.ai](https://openrouter.ai) *(for AI Council)*
- **GCP project** with Vertex AI + GCS → [console.cloud.google.com](https://console.cloud.google.com)

---

### Step 1: Clone and install

```bash
git clone <your-repo-url>
cd TatT
npm install
```

---

### Step 2: Create your `.env` file

```bash
cp .env.example .env
```

Then fill in the values — see [Environment Variables](#environment-variables) below.

---

### Step 3: Set up Supabase (required for artist matching)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Enable the **pgvector** extension:
   - Go to **Database → Extensions** → search `vector` → enable it
3. Run the table DDL:
   ```sql
   -- Paste contents of generated/create-table.sql in Supabase SQL Editor
   ```
4. Seed artist data:
   ```bash
   # Using the SQL editor — paste generated/insert-batch-50.sql
   # OR run the script:
   node scripts/inject-supabase-data.js
   ```
5. Copy your **Project URL** and **anon key** into `.env`

---

### Step 4: Set up Firebase (required for auth)

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Add a **Web app** to your project (under Project Settings)
3. Copy the **Firebase config object** values to `.env` (`NEXT_PUBLIC_FIREBASE_*`)
4. Enable **Authentication → Sign-in methods → Email/Password**
5. Create a **Service Account**:
   - Project Settings → Service Accounts → Generate new private key
   - Set `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in `.env`
6. Generate cookie signing keys:
   ```bash
   openssl rand -hex 32  # run twice — one for CURRENT, one for PREVIOUS
   ```

---

### Step 5: Set up Neo4j (optional, for graph-based matching)

**Option A — Neo4j Aura (cloud, recommended):**
1. Create a free instance at [neo4j.com/cloud/aura](https://neo4j.com/cloud/aura)
2. Copy your connection URI, username, and password to `.env`
3. Seed data:
   ```bash
   npm run neo4j:import
   ```

**Option B — Local Docker:**
```bash
docker run \
  --name neo4j-tatt \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/your_password \
  neo4j:latest
```
Set `NEO4J_URI=bolt://localhost:7687` in `.env`.

---

### Step 6: Generate the auth token

The frontend and backend share a bearer token for API authentication:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output into **both**:
- `FRONTEND_AUTH_TOKEN=<token>` (used by server.js)
- `VITE_FRONTEND_AUTH_TOKEN=<token>` (used by Next.js client)

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

### Core (required for basic use)

| Variable | Description | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web app API key | Firebase console → Project settings → Apps |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Same |
| `FIREBASE_PROJECT_ID` | Firebase project ID (server-side) | Firebase console |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Firebase → Service Accounts |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Firebase → Service Accounts |
| `AUTH_COOKIE_SIGNATURE_KEY_CURRENT` | Cookie signing key (current) | `openssl rand -hex 32` |
| `AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS` | Cookie signing key (previous) | `openssl rand -hex 32` |
| `FRONTEND_AUTH_TOKEN` | Backend auth secret | `openssl rand -hex 32` |
| `VITE_FRONTEND_AUTH_TOKEN` | Frontend auth secret (must match above) | Same value as above |

### Image Generation (required for Forge)

| Variable | Description | Where to get it |
|---|---|---|
| `REPLICATE_API_TOKEN` | Replicate API token (server-side) | [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) |
| `VITE_PROXY_URL` | Backend proxy URL | `http://localhost:3002/api` locally |

### Artist Matching (required for Smart Match)

| Variable | Description | Where to get it |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL | Supabase dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase public anon key | Same |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-side only) | Same |
| `NEO4J_URI` | Neo4j connection string | Neo4j Aura dashboard |
| `NEO4J_USER` | Neo4j username | Neo4j Aura dashboard |
| `NEO4J_PASSWORD` | Neo4j password | Neo4j Aura dashboard |

### AI Council — Prompt Enhancement (optional)

| Variable | Description | Where to get it |
|---|---|---|
| `VITE_USE_OPENROUTER` | Enable real AI Council (`true`/`false`) | Set manually |
| `OPENROUTER_API_KEY` | OpenRouter API key | [openrouter.ai/keys](https://openrouter.ai/keys) |

### Google Cloud (optional, for Imagen 3 + GCS + Secret Manager)

| Variable | Description |
|---|---|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `VITE_VERTEX_AI_PROJECT_ID` | GCP project ID (client-side) |

### Server Config

| Variable | Default | Description |
|---|---|---|
| `HOST` | `127.0.0.1` | Server bind host (`0.0.0.0` for production) |
| `PORT` | `3002` | Express server port (Railway sets this automatically) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | CORS whitelist (comma-separated) |

### Feature Flags

| Variable | Default | Description |
|---|---|---|
| `VITE_DEMO_MODE` | `false` | Use mock images instead of real API calls |
| `VITE_COUNCIL_DEMO_MODE` | `true` | Use mock prompt enhancement |
| `VITE_USE_COUNCIL` | `true` | Enable council prompt enhancement UI |
| `VITE_ENABLE_INPAINTING` | `true` | Enable inpainting tool |
| `VITE_ENABLE_STENCIL_EXPORT` | `true` | Enable 300 DPI stencil export |
| `VITE_ENABLE_AR_PREVIEW` | `false` | Enable AR body visualization |
| `VITE_MAX_DAILY_SPEND` | `10.00` | Daily Replicate spend cap (USD) |
| `VITE_TOTAL_BUDGET` | `500.00` | Total budget cap (USD) |

---

## Running Locally

You need **two terminal windows** — one for the Next.js frontend, one for the Express proxy server.

### Terminal 1 — Frontend

```bash
npm run dev
# → http://localhost:3000
```

### Terminal 2 — Backend proxy

```bash
npm run server
# → http://localhost:3002
```

### Verify it's working

```bash
# Health check
curl http://localhost:3002/api/health
```

Expected:
```json
{
  "status": "ok",
  "message": "Proxy server is running",
  "hasToken": true,
  "authRequired": true
}
```

### Running tests

```bash
npm test                # Run once
npm run test:watch      # Watch mode (TDD)
npm run test:ui         # Vitest visual UI
npm run test:coverage   # Coverage report
```

### Seed artist embeddings (for vector search)

After Supabase is set up and artist data is loaded:

```bash
npm run seed:embeddings
```

This generates 4096-dimensional CLIP vectors for every artist portfolio entry and stores them in the `portfolio_embeddings` table.

---

## Project Structure

```
TatT/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # Next.js API routes (/api/v1/*)
│   │   ├── generate/           # The Forge design studio
│   │   ├── artists/            # Artist browse/profile pages
│   │   ├── smart-match/        # AI artist matching
│   │   ├── swipe/              # Tinder-style swipe match
│   │   ├── gallery/            # Design library
│   │   ├── visualize/          # AR visualization
│   │   └── share/              # Design sharing
│   │
│   ├── components/
│   │   ├── Forge/              # Layer canvas editor (Konva)
│   │   ├── Match/              # Artist matching UI
│   │   ├── booking/            # Booking flow components
│   │   ├── gallery/            # Design library components
│   │   ├── auth/               # Auth gate components
│   │   ├── shared/             # Cross-feature components
│   │   └── ui/                 # Base UI primitives
│   │
│   ├── services/               # Business logic (no React)
│   │   ├── replicateService.ts # Image generation via Replicate
│   │   ├── councilService.ts   # Multi-LLM prompt enhancement
│   │   ├── matchService.ts     # Keyword-based artist matching
│   │   ├── hybridMatchService.js # Neo4j + pgvector RRF fusion
│   │   ├── canvasService.ts    # Layer manipulation (pure functions)
│   │   ├── versionService.js   # Git-like design version history
│   │   ├── stencilService.ts   # 300 DPI stencil export
│   │   └── layerDecompositionService.js  # AI layer segmentation
│   │
│   ├── hooks/                  # React custom hooks
│   │   ├── useImageGeneration.ts
│   │   ├── useArtistMatching.ts
│   │   ├── useLayerManagement.ts
│   │   ├── useVersionHistory.ts
│   │   └── useRealtimeMatchPulse.ts
│   │
│   ├── stores/                 # Zustand state stores
│   │   ├── useForgeStore.ts    # Canvas layers, transforms, history
│   │   ├── useMatchStore.ts    # Match results, filters
│   │   └── useAuthStore.ts     # Auth state
│   │
│   ├── config/
│   │   ├── modelRoutingRules.js    # Style → AI model mapping
│   │   ├── promptTemplates.js      # Style-specific prompt templates
│   │   └── characterDatabase.js   # Character reference library
│   │
│   ├── constants/
│   │   ├── bodyPartAspectRatios.ts # Canvas sizing by body part
│   │   └── featureFlags.ts         # Runtime feature flags
│   │
│   └── lib/                    # Third-party configs (Supabase, Firebase, etc.)
│
├── server.js                   # Express proxy server (Railway)
├── generated/                  # Pre-built data for DB seeding
│   ├── tattoo-artists-supabase.json
│   ├── create-table.sql
│   └── tattoo-artists-neo4j.cypher
├── scripts/                    # One-off scripts
│   ├── seed-artist-embeddings.ts
│   └── inject-supabase-data.js
├── docs/                       # Extended documentation
├── directives/                 # AI agent SOPs
└── public/                     # Static assets
```

---

## Core Features

### The Forge (Design Studio)

The main creation interface. Users describe a tattoo, the AI Council enhances the prompt using 3 LLM models, then routes to the optimal image model based on style:

| Style | Model | Provider |
|---|---|---|
| General | SDXL | Replicate |
| Fast iteration | DreamShaper XL Turbo | Replicate |
| Anime/manga | Anime XL (Niji SE) | Replicate |
| Traditional flash | Tattoo Flash Art | Replicate |
| Blackwork/linework | Blackwork Specialist | Replicate |
| Photorealism | Imagen 3 | Google Vertex AI |

Generated images load into the **Forge Canvas** — a Konva-powered layer editor with drag, resize, rotate, blend modes, and undo/redo version history.

### Neural Ink — Artist Matching

A hybrid search system combining:
- **Neo4j**: Traverses relationships between artists, styles, specialties, and portfolios
- **Supabase pgvector**: Cosine similarity on 4096-dim CLIP embeddings
- **RRF fusion**: `score = 1 / (k + rank)` where k=60, equal weight

Results update in real-time via Supabase Realtime subscriptions.

### Stencil Export

Exports designs at 300 DPI with thermal printer calibration settings. Accounts for body part aspect ratios to prevent distortion.

### AR Visualization *(beta, disabled by default)*

Uses MindAR for camera-based body detection. Applies depth mapping to warp the design around body surface curvature.

---

## Database Setup

### Supabase Tables

```sql
-- Run in Supabase SQL Editor
-- File: generated/create-table.sql

CREATE TABLE tattoo_artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  styles TEXT[],
  location JSONB,
  rating NUMERIC,
  pricing JSONB,
  ...
);

CREATE TABLE portfolio_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID REFERENCES tattoo_artists(id),
  embedding VECTOR(4096),  -- CLIP embeddings
  ...
);

-- Enable vector search
CREATE INDEX ON portfolio_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### Neo4j Schema

Nodes: `Artist`, `Style`, `Location`, `Portfolio`

Relationships: `SPECIALIZES_IN`, `LOCATED_IN`, `HAS_PORTFOLIO`, `SIMILAR_TO`

```cypher
-- Run: npm run neo4j:import
-- Or manually: paste generated/tattoo-artists-neo4j.cypher in Neo4j Browser
```

---

## Deployment

### Frontend → Vercel

```bash
# Automatic on push to main (GitHub Actions)
# Or manual:
npx vercel --prod
```

Set all `NEXT_PUBLIC_*` and `VITE_*` variables in Vercel dashboard.

### Backend → Railway

The Express proxy (`server.js`) runs on Railway.

1. Connect your repo to Railway
2. Set environment variables (server-side secrets only — no `VITE_` prefixed vars)
3. Railway auto-detects the `npm run server` start command
4. Set `HOST=0.0.0.0` and leave `PORT` unset (Railway injects it)

Key Railway variables:
```
REPLICATE_API_TOKEN=
FRONTEND_AUTH_TOKEN=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
NEO4J_URI=
NEO4J_USER=
NEO4J_PASSWORD=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
ALLOWED_ORIGINS=https://your-vercel-url.vercel.app
HOST=0.0.0.0
```

---

## Troubleshooting

### "Origin not allowed" CORS error
- Add your frontend URL to `ALLOWED_ORIGINS` in Railway/backend `.env`
- Must be exact origin — no trailing slash
- Restart the backend after changes

### "REPLICATE_API_TOKEN not configured"
- Token must be in **server-side** `.env` — **not** prefixed with `VITE_`
- Restart `npm run server` after adding

### Layers not persisting
- Check `sessionStorage` is enabled (not blocked by browser extensions)
- Open DevTools → Application → Session Storage and verify the key exists
- If quota exceeded, clear old sessions

### Version history empty
- Ensure a unique `sessionId` was generated (`sessionStorage.getItem('tatt_session_id')`)
- `localStorage` may be full — check DevTools → Application → Local Storage → used quota

### Neo4j connection failing
- Verify URI format: `neo4j+s://xxxx.databases.neo4j.io` (Aura) or `bolt://localhost:7687` (local)
- Check credentials — Aura generates a random password on creation, copy it before dismissing
- Run `npm run neo4j:import` — it will print a descriptive connection error

### Firebase auth not working
- Ensure `FIREBASE_PRIVATE_KEY` contains the full PEM including `\n` line breaks
  - Wrap in double quotes in `.env`: `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."`
- Verify your Firebase project has Email/Password auth enabled
- Check `AUTH_COOKIE_SIGNATURE_KEY_CURRENT` is set (required by next-firebase-auth-edge)

### Build failing on Vercel
- Check that all `NEXT_PUBLIC_*` vars are set in Vercel project settings
- `FIREBASE_PRIVATE_KEY` — Vercel may need the newlines encoded as literal `\n` (not actual newlines)

---

## Development Notes

- **TypeScript migration is ~40% complete** — new code should be TypeScript; legacy `.js` files will be migrated in Phase 3
- **API routes** follow `/api/v1/{resource}/{action}` — legacy `/api/*` routes are deprecated
- **Canvas operations** in `canvasService.ts` are pure functions — never mutate layer state directly
- **Budget tracking** is stored in `localStorage` — users can't exceed `VITE_TOTAL_BUDGET` without clearing storage
- **Session storage** is per-tab — parallel sessions are intentionally isolated for version branching

---

*Built by Samson Cirocco. Questions? See `docs/` for extended guides on GCP setup, Firebase setup, and architecture deep-dives.*
