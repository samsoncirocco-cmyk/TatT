# TatT — AI Tattoo Design Studio

> **AI-powered tattoo design generation, layer editing, artist matching, and AR visualization.**
> Built for first-time tattoo seekers who want to explore custom designs before committing.

---

## Table of Contents

- [What Is TatT?](#what-is-tatt)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running Locally](#running-locally)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## What Is TatT?

TatT (codename **TatTester** / **pangyo**) is a full-stack web application that solves tattoo commitment anxiety. It lets users:

1. **Generate** custom tattoo designs using AI (Vertex AI Imagen 3 + Replicate SDXL)
2. **Edit** designs in a layer-based canvas editor ("The Forge")
3. **Match** with local tattoo artists via a hybrid vector-graph search engine ("Neural Ink")
4. **Visualize** designs on their body in real-time using AR (augmented reality via MindAR)
5. **Export** print-ready stencils at 300 DPI for the tattoo artist

The core technical differentiation is the **hybrid artist matching engine**: Neo4j graph traversal + Supabase pgvector cosine similarity, fused via Reciprocal Rank Fusion (RRF). This surfaces both "known-relationship" matches and "visually similar portfolio" discoveries in a single ranked result.

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
                        ▼            ▼
┌────────────────────────────────────────────────────────────────────┐
│                     Next.js API Routes (/api/v1/*)                 │
│                                                                     │
│  /generate         /council/enhance      /match/semantic           │
│  /layers/decompose /stencil/export       /storage/upload           │
│  /embeddings/generate                    /ar/visualize             │
└─────────────┬────────────────────────────────┬─────────────────────┘
              │                                │
     ┌────────┴──────┐               ┌─────────┴──────────┐
     │  AI Services  │               │  Data Services     │
     │               │               │                    │
     │  Vertex AI    │               │  Neo4j (Graph)     │
     │  Imagen 3     │               │  Supabase (Vector) │
     │  Gemini Flash │               │  Firebase (Auth)   │
     │               │               │  GCS (Storage)     │
     │  Replicate    │               │                    │
     │  SDXL/etc.    │               │                    │
     └───────────────┘               └────────────────────┘
```

### Core Data Flows

**Design Generation:**
```
User Prompt → LLM Council (Gemini 2.0 Flash) → Model Router → Imagen 3 / Replicate → 4 Variations
```

**Artist Matching:**
```
User Preferences → Parallel Search → Neo4j (Graph) + Supabase pgvector (Semantic)
                                              ↓
                                   RRF Score Fusion → Ranked Artist List
```

**Forge Canvas:**
```
Generated Image → Layer Decomposition (Vertex AI Segmentation) → Konva Canvas → Stencil Export
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 | SSR frontend + API routes |
| Styling | Tailwind CSS v4 | Utility-first design system |
| State | Zustand v5 | Persisted client state |
| Animation | Framer Motion v12 | Transitions and micro-interactions |
| Canvas | Konva + react-konva | Layer-based design editor |
| Auth | Firebase Auth + next-firebase-auth-edge | User accounts |
| Image Gen (primary) | Vertex AI Imagen 3 (`imagegeneration@006`) | High-quality tattoo designs |
| Image Gen (fallback) | Replicate (SDXL, DreamShaper, Niji SE, Flash Art) | Style-specific models |
| LLM Council | Vertex AI Gemini 2.0 Flash | Prompt enhancement |
| LLM Fallback | OpenRouter (Claude + GPT-4 + Gemini) | Backup council |
| Graph DB | Neo4j Aura | Artist-style relationship graph |
| Vector DB | Supabase (PostgreSQL + pgvector) | Semantic artist similarity |
| Realtime | Firebase Realtime DB + Supabase Realtime | Live match pulse updates |
| Document DB | Firebase Firestore | Authenticated user design library |
| Embeddings | Vertex AI `multimodalembedding@001` (1408-dim) | Portfolio vector search |
| Storage | Google Cloud Storage | Generated images + layer uploads |
| Testing | Vitest + Testing Library | Unit and component tests |
| Backend proxy | Express.js (`server.js`) | Legacy Railway proxy (being phased out) |
| CI/CD | GitHub Actions → Cloud Run | Container build + deploy |

---

## Prerequisites

Before starting, make sure you have:

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **npm** (comes with Node.js)
- **Git**

**External accounts required (minimum for local dev):**
- [Replicate](https://replicate.com) — image generation (free $0.50 credit on signup)
- [Google Cloud / GCP](https://console.cloud.google.com) — Vertex AI + Firebase (free tier works for demos)
- [Supabase](https://supabase.com) — vector database (free tier)
- [Neo4j Aura](https://neo4j.com/cloud/aura/) — graph database (free AuraDB instance)

**Optional but recommended:**
- [OpenRouter](https://openrouter.ai) — backup LLM council (fallback to Gemini if not set)

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/TatT.git
cd TatT
```

### 2. Install dependencies

```bash
npm install
```

### 3. Copy the environment template

```bash
cp .env.example .env.local
```

Then fill in your values — see [Environment Variables](#environment-variables) below.

### 4. Set up databases

See [Database Setup](#database-setup) for step-by-step instructions on:
- Supabase (PostgreSQL + pgvector)
- Neo4j Aura (graph database)
- Firebase (auth + Firestore + Realtime DB)

### 5. Run the app

```bash
npm run dev       # Frontend on http://localhost:3000
npm run server    # Backend proxy on http://localhost:3002 (separate terminal)
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in each value. Here's what each variable does:

### 🔑 Authentication (Required)

```bash
# Shared secret between frontend and backend proxy (server.js)
# Generate one: openssl rand -hex 32
FRONTEND_AUTH_TOKEN=your-strong-secret-here

# Cookie signing keys for next-firebase-auth-edge (server-side session)
# Generate: openssl rand -hex 32
AUTH_COOKIE_SIGNATURE_KEY_CURRENT=your-key-here
AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS=your-previous-key-here
```

### 🔥 Firebase (Required for Auth + Realtime)

Get these from [Firebase Console](https://console.firebase.google.com) → Project Settings → General → Your apps:

```bash
# Client-side Firebase config (safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tatt-pro.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tatt-pro
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tatt-pro.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123...

# Server-side Firebase Admin SDK (keep secret)
# Get from: Firebase Console → Project Settings → Service Accounts → Generate new private key
FIREBASE_PROJECT_ID=tatt-pro
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@tatt-pro.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 🤖 Google Cloud / Vertex AI (Required for image generation)

```bash
# Your GCP project ID
GCP_PROJECT_ID=tatt-pro

# Path to your GCP service account JSON key file
# Download from: GCP Console → IAM → Service Accounts → Create key
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Optional: Gemini API key (alternative to service account for Gemini only)
GEMINI_API_KEY=your-gemini-api-key

# Google Places API (for artist location search)
GOOGLE_PLACES_API_KEY=AIza...

# Google Cloud Storage bucket for image uploads
# Create in GCP Console → Cloud Storage → Create bucket
GCS_BUCKET=your-bucket-name

# Enable Vertex AI image generation (set to false to use Replicate only)
NEXT_PUBLIC_VERTEX_AI_ENABLED=true
```

> **Note on service account permissions:** The service account needs the following IAM roles:
> - `roles/aiplatform.user` — Vertex AI
> - `roles/storage.objectAdmin` — Cloud Storage
> - `roles/firebase.admin` — Firebase Admin

### 🎨 Replicate (Required for fallback image generation)

```bash
# Backend token (server-side only — NEVER use NEXT_PUBLIC_ prefix)
# Get from: https://replicate.com/account/api-tokens
REPLICATE_API_TOKEN=r8_your_token_here
```

### 🗄️ Supabase (Required for artist matching)

```bash
# Your Supabase project URL
# Get from: Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project-id.supabase.co

# Anon/public key — safe for client-side use
SUPABASE_ANON_KEY=eyJ...

# Service role key — KEEP SECRET, server-side only
# Needed for: vector embeddings, admin operations
SUPABASE_SERVICE_KEY=eyJ...
```

### 🔗 Neo4j (Required for graph-based artist matching)

```bash
# Neo4j Aura connection URI
# Get from: https://console.neo4j.io → Your instance → Connection URI
NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io

# Neo4j credentials (set when creating Aura instance — save them, can't retrieve later)
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password_here
```

### 🌐 OpenRouter (Optional — LLM Council fallback)

```bash
# If not set, LLM council falls back to Vertex AI Gemini (which is primary anyway)
# Get from: https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-...
```

### 🌍 Server / CORS

```bash
# Comma-separated list of allowed frontend origins
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Backend proxy port (used by server.js)
PORT=3002
HOST=127.0.0.1

# Frontend connects to backend at this URL
NEXT_PUBLIC_PROXY_URL=http://localhost:3002/api
```

### 🎛️ Feature Flags

```bash
# Demo mode: serves mock images instead of calling real AI APIs
# ALWAYS set to false in production
NEXT_PUBLIC_DEMO_MODE=false

# LLM Council demo mode: returns mock prompts without calling Gemini
NEXT_PUBLIC_COUNCIL_DEMO_MODE=false

# Experimental features
NEXT_PUBLIC_ENABLE_AR_PREVIEW=false
NEXT_PUBLIC_ENABLE_INPAINTING=false
NEXT_PUBLIC_ENABLE_STENCIL_EXPORT=true
```

### 💸 Budget Controls

```bash
# Server-side spend caps (enforced in API routes)
VITE_MAX_DAILY_SPEND=10.00
VITE_TOTAL_BUDGET=500.00
```

### Complete `.env.local` example

```bash
# Auth
FRONTEND_AUTH_TOKEN=
AUTH_COOKIE_SIGNATURE_KEY_CURRENT=
AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS=

# Firebase (client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase (server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# GCP / Vertex AI
GCP_PROJECT_ID=tatt-pro
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
GCS_BUCKET=tatt-pro-images
GEMINI_API_KEY=
GOOGLE_PLACES_API_KEY=
NEXT_PUBLIC_VERTEX_AI_ENABLED=true

# Replicate
REPLICATE_API_TOKEN=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=

# OpenRouter (optional)
OPENROUTER_API_KEY=

# Server
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
PORT=3002
HOST=127.0.0.1
NEXT_PUBLIC_PROXY_URL=http://localhost:3002/api

# Feature flags
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_COUNCIL_DEMO_MODE=false
NEXT_PUBLIC_VERTEX_AI_ENABLED=true
NEXT_PUBLIC_ENABLE_AR_PREVIEW=false
NEXT_PUBLIC_ENABLE_STENCIL_EXPORT=true
```

---

## Database Setup

### Supabase (PostgreSQL + pgvector)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the table creation script:

```bash
# From the repo root:
cat generated/create-table.sql
# Copy and run in Supabase SQL Editor
```

3. Seed the artist data:

```bash
# Insert the 50-artist test dataset:
cat generated/insert-batch-50.sql
# Copy and run in Supabase SQL Editor

# OR use the injection script:
node scripts/inject-supabase-data.js
```

4. Enable the `pgvector` extension (if not already on):
   - Supabase Dashboard → Database → Extensions → Search "vector" → Enable

5. Generate portfolio embeddings:

```bash
npm run seed:embeddings
```

### Neo4j Aura (Graph Database)

1. Create a **free AuraDB instance** at [console.neo4j.io](https://console.neo4j.io)
   - Choose **AuraDB Free** (enough for development)
   - **Save the password** — you can't retrieve it later
   - Note your connection URI (format: `neo4j+s://xxxxxxxx.databases.neo4j.io`)

2. Import the artist graph:

```bash
# Option A: Run the import script
npm run neo4j:import

# Option B: Run Cypher directly in Neo4j Browser
# Open your AuraDB instance → Neo4j Browser → paste:
cat generated/tattoo-artists-neo4j.cypher
```

### Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Add Firebase to your GCP project (or create a new one)
3. Enable **Authentication** → Sign-in methods → Email/Password + Google
4. Create a **Firestore Database** (choose `us-central1` region)
5. Create a **Realtime Database** (choose `us-central1` region)
6. Go to **Project Settings** → **Service Accounts** → **Generate new private key**
   - Save the JSON file as `service-account.json` in the repo root
   - This file is in `.gitignore` — **never commit it**

### Google Cloud Storage

1. Go to [GCP Console → Cloud Storage](https://console.cloud.google.com/storage)
2. Create a new bucket:
   - Name: `tatt-pro-images` (or your choice)
   - Region: `us-central1`
   - Access control: Fine-grained
3. Set `GCS_BUCKET=tatt-pro-images` in your `.env.local`
4. Grant your service account `Storage Object Admin` role on the bucket

---

## Running Locally

```bash
# Terminal 1 — Next.js dev server (port 3000)
npm run dev

# Terminal 2 — Express backend proxy (port 3002)
npm run server
```

The app will be available at **http://localhost:3000**

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server with hot reload |
| `npm run server` | Start Express backend proxy |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest test suite |
| `npm run test:watch` | Tests in watch mode (TDD) |
| `npm run test:coverage` | Test coverage report |
| `npm run test:ui` | Vitest visual UI |
| `npm run seed:embeddings` | Generate and seed Supabase embeddings |
| `npm run neo4j:import` | Import artist graph into Neo4j |

### Quick Smoke Test

After starting the app:

1. Open http://localhost:3000
2. Click **Generate** (or navigate to `/generate`)
3. Enter a style + subject (e.g., "Traditional" + "wolf and moon")
4. Click **Generate Design** → should produce 4 image variations in ~15–30s
5. Navigate to **Artists** → enter a style + zip code → should return ranked matches

If image generation times out or returns demo images, check:
- `NEXT_PUBLIC_DEMO_MODE=false` in your `.env.local`
- `REPLICATE_API_TOKEN` is set and valid
- Backend proxy is running on port 3002

---

## Project Structure

```
TatT/
├── src/
│   ├── app/                    # Next.js App Router (active pages + API routes)
│   │   ├── page.tsx            # Home / Landing
│   │   ├── generate/           # The Forge (canvas + generation)
│   │   ├── smart-match/        # Neural Ink artist matching
│   │   ├── swipe/              # SwipeMatch (Tinder-style)
│   │   ├── artists/            # Artist browse + profiles
│   │   ├── (auth)/             # Login + Signup
│   │   ├── visualize/          # AR visualization
│   │   └── api/
│   │       ├── v1/             # Versioned API endpoints
│   │       │   ├── generate/   # Image generation (Imagen 3 + Replicate)
│   │       │   ├── council/    # LLM prompt enhancement
│   │       │   ├── match/      # Hybrid artist matching
│   │       │   ├── layers/     # Layer decomposition
│   │       │   ├── stencil/    # 300 DPI export
│   │       │   ├── storage/    # GCS upload + signed URLs
│   │       │   └── embeddings/ # Vertex AI vector embeddings
│   │       ├── predictions/    # Replicate polling
│   │       ├── neo4j/          # Neo4j query proxy
│   │       └── health/         # Health checks
│   │
│   ├── components/             # React UI components
│   │   ├── generate/           # Forge canvas components
│   │   ├── artists/            # Artist cards + match UI
│   │   ├── ui/                 # Shared design system components
│   │   └── auth/               # Auth forms + provider
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useImageGeneration.ts
│   │   ├── useArtistMatching.ts
│   │   ├── useLayerManagement.ts
│   │   ├── useVersionHistory.ts
│   │   └── useRealtimeMatchPulse.ts
│   │
│   ├── services/               # Business logic + external API clients
│   │   ├── replicateService.ts         # Replicate image generation
│   │   ├── councilService.ts           # LLM prompt enhancement router
│   │   ├── vertexAICouncil.js          # Gemini 2.0 Flash council
│   │   ├── openRouterCouncil.js        # OpenRouter fallback council
│   │   ├── hybridMatchService.ts       # Neo4j + pgvector + RRF fusion
│   │   ├── neo4jService.ts             # Neo4j Cypher queries
│   │   ├── vectorDbService.ts          # Supabase pgvector queries
│   │   ├── vertex-embedding-service.ts # 1408-dim embeddings
│   │   ├── generationRouter.ts         # Routes to Imagen 3 vs Replicate
│   │   ├── canvasService.ts            # Immutable canvas operations
│   │   ├── versionService.ts           # Design version history
│   │   ├── stencilService.ts           # 300 DPI stencil export
│   │   ├── designLibraryService.ts     # Design library (localStorage/Firestore)
│   │   └── storage/                    # Storage adapters
│   │       ├── LocalStorageAdapter.ts  # Unauthenticated users
│   │       ├── FirestoreAdapter.ts     # Authenticated users
│   │       └── StorageFactory.ts       # Picks adapter by auth state
│   │
│   ├── stores/                 # Zustand state stores
│   │   ├── useForgeStore.ts    # Canvas layers + transforms
│   │   ├── useMatchStore.ts    # Match results + filters
│   │   └── useAuthStore.ts     # Auth state
│   │
│   ├── config/                 # Static configuration
│   │   ├── modelRoutingRules.js        # Which AI model per tattoo style
│   │   ├── promptTemplates.js          # Style-specific prompt engineering
│   │   └── characterDatabase.js        # Known character references
│   │
│   ├── constants/              # Shared app constants
│   │   ├── bodyPartAspectRatios.ts     # Canvas sizing per body placement
│   │   └── featureFlags.ts             # Feature toggle definitions
│   │
│   └── lib/                    # Third-party integrations + utilities
│       ├── firebase-client.ts
│       ├── firebase-admin.ts
│       ├── api-auth.ts
│       └── secret-manager.ts
│
├── generated/                  # Pre-built seed data (checked in)
│   ├── tattoo-artists-supabase.json    # 100 artists for Supabase
│   ├── create-table.sql                # Supabase DDL
│   ├── insert-batch-50.sql             # 50-artist seed SQL
│   ├── tattoo-artists-neo4j.cypher     # Neo4j Cypher import
│   └── tattoo-artists-neo4j.json       # Neo4j JSON data
│
├── scripts/                    # One-time / maintenance scripts
│   ├── seed-artist-embeddings.ts       # Generate + upload embeddings
│   ├── inject-supabase-data.js         # Seed Supabase from JSON
│   └── import-to-neo4j.js             # Import artist graph
│
├── tests/                      # Test files
│   ├── hybridMatching.test.js
│   ├── modelRouting.test.js
│   └── server.test.js
│
├── docs/                       # Extended documentation
│   ├── ARCHITECTURE_MAP_2026.md        # Deep architecture audit
│   ├── API_REFERENCE.md                # Full API endpoint reference
│   ├── gcp-setup.md                    # GCP step-by-step setup
│   ├── firebase-setup.md               # Firebase step-by-step setup
│   └── HYBRID_MATCHING.md              # Matching algorithm docs
│
├── server.js                   # Express backend proxy (legacy Railway path)
├── Dockerfile                  # Container image (Cloud Run deployment)
├── cloudbuild.yaml             # GCP Cloud Build config
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Design system tokens
├── tsconfig.json               # TypeScript config
└── .env.example                # Environment variable template
```

---

## Core Features

### 1. The Forge (Design Generation + Canvas)

**Generate tab** (`/generate`):
- Enter a style (Traditional, Minimalist, Japanese, Blackwork, etc.), subject, body part, and size
- LLM Council (Gemini 2.0 Flash) enhances your prompt into three variants: Simple / Detailed / Ultra
- Model router selects the optimal Replicate model or Imagen 3 for your style
- 4 variations are generated in ~15–30s (Replicate) or ~8–12s (Imagen 3)
- Save designs to your library

**Canvas editor**:
- Layer decomposition breaks a design into linework / shading / color / background layers
- Konva-based canvas supports drag, resize, rotate, flip, and blend modes
- Full undo/redo version history (git-like branching)
- Stencil export at 300 DPI with thermal printer calibration

### 2. Neural Ink (Artist Matching)

**Smart Match** (`/smart-match`):
- Enter style preferences, ZIP code, radius, and budget
- Hybrid search: keyword fuzzy match + 1408-dim vector similarity + Neo4j graph traversal
- Results fused via Reciprocal Rank Fusion (RRF)
- Live score pulse via Supabase Realtime

**Swipe Match** (`/swipe`):
- Tinder-style swipe UI for exploring artists
- Powered by the same hybrid engine

### 3. AR Visualization

**Visualize** (`/visualize`):
- MindAR body detection via camera feed
- Design overlaid and warped to match body surface curvature
- Live preview before committing to appointment

### 4. Design Library

- Save and organize generated designs
- Authenticated users: stored in Firestore (persistent across devices)
- Unauthenticated users: localStorage (up to 50 designs)
- Automatic migration from localStorage → Firestore on first login
- Version history per design (50 snapshots max)

---

## Testing

```bash
# Run all tests
npm run test

# Watch mode (for TDD)
npm run test:watch

# Coverage report
npm run test:coverage

# Visual Vitest UI
npm run test:ui
```

Tests live alongside the code they test: `src/services/matchService.test.js`, `src/hooks/useVersionHistory.test.js`, etc.

Python tests (for execution scripts):

```bash
pip install pytest
pytest tests/execution/
```

---

## Deployment

### Production Architecture (Cloud Run — primary)

```
GitHub Push → GitHub Actions → Docker Build → GCR Push → Cloud Run Deploy
```

Cloud Run service: `pangyo-production` | Region: `us-central1`

Required GitHub secrets for CI/CD:
- `WIF_PROVIDER` — Workload Identity Federation provider
- `WIF_SERVICE_ACCOUNT` — Service account for deployment
- `GCP_PROJECT_ID` — Your GCP project
- All `NEXT_PUBLIC_FIREBASE_*` variables
- All other env vars from the Environment Variables section

```bash
# Manual deploy (if needed)
gcloud builds submit --config cloudbuild.yaml
```

### Legacy Architecture (Railway + Vercel)

The original deployment model used Vercel for the Next.js frontend and Railway for the Express backend proxy. This is **deprecated** — the Cloud Run all-in-one model is the current target.

If you still need it:
1. Push to Railway: `railway up`
2. Set all environment variables in Railway dashboard
3. Deploy frontend to Vercel and set `NEXT_PUBLIC_PROXY_URL` to your Railway URL

### Environment in Production

Set `NEXT_PUBLIC_DEMO_MODE=false` — this is the most critical flag. If it's `true`, all AI calls return Unsplash stock images.

Use [GCP Secret Manager](https://console.cloud.google.com/security/secret-manager) for production secrets instead of environment variables.

---

## Troubleshooting

### "Origin not allowed" CORS error
- Add your frontend URL to `ALLOWED_ORIGINS` in `.env.local`
- Restart `npm run server` after changing `.env.local`

### "REPLICATE_API_TOKEN not configured"
- Token must be set in backend (no `NEXT_PUBLIC_` prefix)
- Restart `npm run server` after adding it
- Verify: `curl -H "Authorization: Token r8_..." https://api.replicate.com/v1/models`

### Images come back as Unsplash stock photos
- `NEXT_PUBLIC_DEMO_MODE` is set to `true` — set it to `false`
- Or `NEXT_PUBLIC_VERTEX_AI_ENABLED` is `false` and Replicate token is missing

### LLM Council returns generic prompts ("demo mode")
- `NEXT_PUBLIC_COUNCIL_DEMO_MODE` is `true` — set it to `false`
- `NEXT_PUBLIC_VERTEX_AI_ENABLED` must be `true`
- Verify `GOOGLE_APPLICATION_CREDENTIALS` points to a valid service account JSON

### Neo4j connection fails
- Verify `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` are set correctly
- Neo4j Aura URIs start with `neo4j+s://` (not `bolt://`)
- Test: `npm run neo4j:import` (fails fast with a clear error)

### Supabase vector search returns no results
- Run `npm run seed:embeddings` to generate portfolio embeddings
- Check that `pgvector` extension is enabled in your Supabase project
- Verify embedding dimension matches the schema (1408-dim for `multimodalembedding@001`)

### Layers not persisting in the Forge
- `sessionStorage` must be enabled in your browser
- Each browser tab gets a unique session ID — switching tabs loses that canvas state
- Check browser console for serialization errors

### Firebase authentication errors
- Verify all 6 `NEXT_PUBLIC_FIREBASE_*` client-side vars are set
- Check that Email/Password auth is enabled in Firebase Console → Authentication
- Ensure the `AUTH_COOKIE_SIGNATURE_KEY_CURRENT` is set (required for server-side session)

### "GCS_BUCKET not configured" / image upload fails
- Create a bucket in GCP Console → Cloud Storage
- Set `GCS_BUCKET=your-bucket-name` in `.env.local`
- Ensure the service account has `Storage Object Admin` role on the bucket

### Build fails with TypeScript errors
- The project is ~40% migrated to TypeScript with `ignoreBuildErrors: true` in `next.config.ts`
- If you turned that off, run `npm run lint` to see what needs fixing
- Known issues tracked in `docs/PHASE_2B_TYPESCRIPT_MIGRATION_COMPLETE.md`

---

## Known Issues & Limitations

| Issue | Status | Workaround |
|---|---|---|
| `VITE_*` env vars ignored by Next.js | Legacy cruft | Use `NEXT_PUBLIC_*` equivalents |
| Embedding dimension inconsistency in docs | Schema is 1408-dim; some docs say 4096 | Always use `multimodalembedding@001` |
| Dual deployment model (Railway vs Cloud Run) | Cloud Run is current target | Ignore Railway references in old docs |
| Budget tracking is client-side only | No server-side spend enforcement yet | Monitor Replicate dashboard directly |
| Mobile app (`mobile/`) is a stub | Expo scaffolding only, no screens | Web app works well on mobile browsers |
| TypeScript migration incomplete (~40%) | `ignoreBuildErrors: true` masks issues | Run `tsc --noEmit` to see current TS errors |

---

## Cost Reference

| Service | Free Tier | Paid Rate |
|---|---|---|
| Replicate SDXL | $0.50 credit on signup | ~$0.022 per generation (4 images) |
| Vertex AI Imagen 3 | $300 GCP credit for new accounts | ~$0.04 per image |
| Gemini 2.0 Flash (Council) | 60 RPM free | Very cheap on Vertex |
| Supabase | 500MB + 2GB transfer free | $25/mo Pro |
| Neo4j Aura Free | 1 free instance (200MB) | $65+/mo for paid |
| Firebase | Generous Spark free tier | Blaze plan (pay-as-you-go) |
| Cloud Run | 2M requests/mo free | $0.024 per vCPU-hour after |

With the default demo seed data (50 artists), you can run the full app for **weeks without spending anything** beyond Replicate image generation costs.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes with tests
4. Run `npm run test` and `npm run lint`
5. Submit a PR

See `ARCHITECTURE.md` for architectural guidelines and `CLAUDE.md` for AI-assisted development patterns.

---

*Last updated: March 2026 | Phase: MVP — "The Forge" + Neural Ink hybrid matching*
