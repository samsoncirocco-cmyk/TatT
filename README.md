# TatT

AI-powered tattoo design platform for Demo Day: design faster, preview on-body, and match with the right artist.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js) ![React](https://img.shields.io/badge/React-19-149eca?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript) ![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss) ![Vertex%20AI](https://img.shields.io/badge/Google%20Vertex%20AI-Imagen%203%20%2B%20Gemini-4285F4?logo=googlecloud) ![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ecf8e?logo=supabase) ![Neo4j](https://img.shields.io/badge/Neo4j-GraphDB-4581c3?logo=neo4j) ![Railway](https://img.shields.io/badge/Deployed%20on-Railway-0b0d0e?logo=railway)

**Production URL:** https://tatt-production.up.railway.app

## The Problem
Tattoo design is still a fragmented, high-anxiety workflow:

- Commitment anxiety is massive: users must commit to permanent ink with limited iteration tools.
- The tattoo market is large (multi-billion, often cited around **$10B+ globally**) but tooling is still mostly manual.
- Regret is common (industry surveys often report regret rates around **40%** depending on cohort).
- There is no unified product that lets users quickly iterate design intent, preview realistic placement, and immediately find the right artist.

## The Solution
TatT turns tattoo planning into a 3-step, AI-native flow:

1. **Design**: generate and refine concepts with AI + layer-aware editing.
2. **Preview**: see the tattoo overlaid on body placement via AR visualization.
3. **Match**: instantly find artists using semantic + relationship-aware ranking.

## Features

### AI Design Generation
- Multi-model generation pipeline: **Google Vertex AI Imagen 3** with fallback flows that include SDXL paths.
- Multi-output generation support (up to 4) and model metadata returned per request.
- Layer-ready image outputs used in the Forge editor.

### AI Council Prompt Enhancement
- Multi-agent prompt enhancement simulation:
  - Creative Director
  - Technical Expert
  - Style Specialist
- Produces structured enhanced prompt variants before image generation.
- Built for better first-pass quality and fewer regeneration loops.

### Multi-layer Canvas Editing
- Layer stack operations with transforms, blend modes, visibility toggles, and ordering.
- Z-order management and drag-reorder flow in the Forge editor.
- Export-ready composites for downstream AR and stencil workflows.

### AR Preview
- Body-part-aware AR visualization route with placement metadata.
- Supports depth-aware and fallback modes for practical demo reliability.

### Artist Matching (Hybrid Vector + Graph)
- **Supabase pgvector** semantic similarity for prompt-to-portfolio matching.
- **Neo4j** graph scoring for style lineage and artist relationship context.
- Hybrid rank fusion to produce better match quality than vector-only ranking.

### Stencil Export
- Edge-detection pipeline for stencil-ready design simplification.
- Export path supports production stencil artifacts, including PDF workflows.

### Inpainting
- Selective region refinement for iterative edits without regenerating full designs.
- Enables fast “keep most / change this area” creative loops.

## Architecture
TatT uses a 3-layer DOE framework:

- **Directives** (`directives/`): high-level SOPs defining what to do and why.
- **Orchestration** (`orchestration/`, evolving): cross-directive workflow coordination.
- **Execution** (`src/`, `scripts/`, `execution/README.md`): concrete services, routes, and scripts.

Flow:

```text
User Intent
  -> Directives (workflow contract)
  -> Orchestration (decision + routing)
  -> Execution (API route -> service -> external systems)
```

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | Next.js App Router, React 19, Tailwind CSS, Framer Motion, Konva |
| AI Models | Vertex AI Imagen 3, Vertex Gemini 2.0 Flash (Council), Replicate SDXL fallback |
| Matching Intelligence | Supabase Postgres + pgvector, Neo4j, Reciprocal Rank Fusion |
| Realtime + State | Firebase Realtime Database, Zustand |
| Storage | Google Cloud Storage |
| Deployment | Railway (production), Vercel-compatible Next.js stack |

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- GCP project + service account (Vertex/GCS)
- Supabase project
- Neo4j instance (Aura or local)

### 1) Install

```bash
git clone <repo-url>
cd TatT
npm install
```

### 2) Configure Environment

```bash
cp .env.example .env.local
```

Fill at least:

```bash
REPLICATE_API_TOKEN=
GOOGLE_APPLICATION_CREDENTIALS=
GCP_PROJECT_ID=
GCP_REGION=us-central1
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEO4J_URI=
NEO4J_USERNAME=
NEO4J_PASSWORD=
TATT_API_KEY=
```

### 3) Run Locally

```bash
npm run dev
```

App runs at `http://localhost:3000`.

### 4) Optional Data/Infra Setup

```bash
node scripts/setup-supabase-vector-schema.js
node scripts/import-to-neo4j.js
node scripts/generate-vertex-embeddings.js
```

## API Reference (v1)
Base path: `/api/v1`

Most protected routes require:

```http
Authorization: Bearer <TATT_API_KEY>
```

### `POST /generate`
Generate tattoo images from a prompt.

```bash
curl -X POST http://localhost:3000/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TATT_API_KEY" \
  -d '{
    "prompt": "fine-line phoenix wrapping forearm",
    "style": "fine-line",
    "bodyPart": "forearm",
    "sampleCount": 2
  }'
```

### `POST /council/enhance`
Enhance a user prompt using the 3-agent Council.

```bash
curl -X POST http://localhost:3000/api/v1/council/enhance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TATT_API_KEY" \
  -d '{
    "user_prompt": "koi fish and peony sleeve",
    "style": "japanese",
    "body_part": "arm"
  }'
```

### `POST /match/semantic`
Hybrid semantic + graph artist matching.

```bash
curl -X POST http://localhost:3000/api/v1/match/semantic \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TATT_API_KEY" \
  -d '{
    "query": "blackwork geometric sleeve",
    "location": "San Francisco",
    "radius": 25,
    "max_results": 10
  }'
```

### `POST /ar/visualize`
Generate AR-ready placement visualization metadata.

### `POST /stencil/export`
Generate stencil export artifacts and metadata.

### `POST /layers/decompose`
Decompose image into layer candidates for editing workflows.

### `POST /upload-layer`
Upload a layer image to storage.

### `POST /storage/upload`
Upload arbitrary file payload to configured storage path.

### `POST /storage/get-signed-url`
Create signed read/write URLs for stored assets.

### `POST /embeddings/generate`
Generate/store embedding vectors for matching workflows.

### `POST /match/update`
Write match updates to realtime backend state.

## Status

- ✅ **MVP Phase 1 complete**: core Forge studio, Council enhancement, generation, matching, and export flows.
- 🚧 **Phase 2 in progress**: mobile experience hardening, user auth, and monetization layers.

## Repo Pointers

- Architecture + operating context: `CLAUDE.md`
- Phase handoff + known issues: `HANDOFF.md`
- Migration status: `MIGRATION_STATUS.md`
- Embedding deployment plan: `EMBEDDING_DEPLOYMENT_PLAN.md`
- Directive-to-code map: `execution/README.md`
- API routes: `src/app/api/v1/`
