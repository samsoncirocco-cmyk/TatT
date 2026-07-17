# TatTester Phase 1 Handoff

## Project Overview

TatTester is an AI-powered tattoo design generator and visualization platform. It helps first-time tattoo seekers overcome commitment anxiety through custom design generation, layer-based editing, AR preview, and artist matching.

**Current Phase**: MVP (Phase 1) complete — "The Forge" design studio with hybrid vector-graph artist matching.

**Stack**: React 19 + Next.js 16 + Tailwind CSS 3, Express.js proxy (port 3001/3002), Zustand state management, Vertex AI (Imagen 3.0 + Gemini), Neo4j graph DB, Supabase pgvector.

## What Was Completed in Phase 1

### Core Design Studio ("The Forge")
- **AI image generation** via Vertex AI Imagen 3.0 with Replicate fallback — `src/services/generationService.ts`
- **AI Council prompt enhancement** — multi-agent refinement (Creative Director, Technical Expert, Style Specialist) with fallback chain: Vertex AI (free) -> OpenRouter (paid) -> Demo -> Mock — `src/services/councilService.ts`
- **Multi-layer canvas compositing** — blend modes, transforms, z-ordering, export as PNG/AR-ready 1024x1024 — `src/features/generate/services/canvasService.ts`
- **Layer management** with drag-and-drop reordering (dnd-kit) — `src/features/generate/hooks/useLayerManagement.ts`
- **Version history** — dual snapshot/transform system, capped at 20 entries — `src/features/generate/hooks/useVersionHistory.js`, `src/features/generate/services/versionService.js`
- **Image registry** — ref-counted blob URL management to prevent memory leaks — `src/services/forgeImageRegistry.ts`
- **Forge state store** — Zustand with localStorage persistence — `src/stores/useForgeStore.ts`
- **Main Forge UI** — `src/features/Generate.jsx` (primary page component)

### Artist Matching (Hybrid Vector-Graph)
- **Neo4j graph queries** — relationship-based artist matching by style, specialization — `src/features/match-pulse/services/neo4jService.ts`
- **Supabase vector search** — semantic similarity via pgvector embeddings — `src/features/match-pulse/services/vectorDbService.js`
- **Hybrid RRF fusion** — combines graph + vector results with Reciprocal Rank Fusion — `src/features/match-pulse/services/hybridMatchService.ts`
- **Text embeddings** — Vertex AI embeddings for artist portfolios — `src/features/match-pulse/services/embeddingService.ts`
- **Match Pulse UI** — real-time artist matching sidebar — `src/features/match-pulse/components/Match/`

### Inpainting
- **Selective region editing** — mask-based inpainting for design refinement — `src/features/inpainting/`

### Stencil Export
- **Stencil generation** — edge detection and PDF export for tattoo application — `src/features/stencil/`

### Infrastructure
- **3-layer architecture** — Directives (SOPs) + Orchestration (AI) + Execution (scripts) — `directives/`, `execution/`
- **API routes** — Next.js App Router API at `src/app/api/v1/` covering: council, generate, match, layers, stencil, storage, embeddings, AR, upload-layer
- **Auth** — Bearer token auth on all API routes with rate limiting (100/hr match, 20/hr council, 10/min generation)
- **GCS layer upload** — cloud storage for generated layers — `src/services/gcs-service.ts`
- **Artist import scripts** — Neo4j + Supabase population utilities — `scripts/`

### Migration Work
- Migrated from Vite to Next.js (env vars, routing, SSR compatibility)
- Converted critical services to TypeScript (canvasService, councilService, generationService, etc.)
- Consolidated 4 separate council services into one
- Fixed SSR issues (window references, persist middleware guards)

## Architecture Summary

```
User Action
  -> React Component (src/features/*)
    -> Hook (useLayerManagement, useImageGeneration, etc.)
      -> Service (pure functions, no React)
        -> API Route (src/app/api/v1/*)
          -> External API (Vertex AI, Neo4j, Supabase, GCS)
```

**Key services** (in `src/services/`):
| Service | Purpose |
|---------|---------|
| `generationService.ts` | Image generation with retry + exponential backoff |
| `councilService.ts` | Multi-agent prompt enhancement with fallback chain |
| `canvasService.ts` | Immutable layer compositing (also in features/generate/services/) |
| `forgeImageRegistry.ts` | Ref-counted blob URL management |
| `hybridMatchService.ts` | RRF fusion of graph + vector match results |

**State management**: Zustand store at `src/stores/useForgeStore.ts` with localStorage persistence and SSR guard.

**Image handling**: Layer images stored as registry ref strings (not raw URLs). Resolve with `getImageUrl(ref)` from `forgeImageRegistry.ts`.

## Known Issues

### Pre-existing TypeScript Errors (not blockers)
- `src/app/api/v1/council/enhance/route.ts` — `result` typed as `unknown`
- `src/app/api/v1/layers/decompose/route.ts` — possibly undefined method
- `src/app/api/v1/match/semantic/route.ts` — missing module import
- `src/app/page.tsx` — framer-motion `Variants` type incompatibility

### Other Notes
- `Generate.jsx` is 78KB / ~2000 lines — candidate for decomposition in Phase 2
- Some duplicated service files exist in both `src/services/` and `src/features/*/services/` (e.g., `canvasService.ts`, `hybridMatchService.ts`) — needs consolidation
- Several untracked files in working tree (see `git status`) — new feature work in progress

## Environment Setup

### Prerequisites
- Node.js 18+
- Google Cloud credentials (for Vertex AI)
- Neo4j instance (local or Aura)
- Supabase project (for pgvector)

### Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd manama-next
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in required values (see CLAUDE.md for full list):
#   GCP_PROJECT_ID, GCP_REGION, FRONTEND_AUTH_TOKEN,
#   NEXT_PUBLIC_FRONTEND_AUTH_TOKEN, NEXT_PUBLIC_PROXY_URL,
#   SUPABASE_URL, SUPABASE_ANON_KEY, NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

# 3. Run (two terminals)
npm run dev        # Frontend on port 3000
npm run server     # Backend proxy on port 3001

# 4. Seed data (optional)
# See directives/import-artists.md and directives/generate-embeddings.md
```

### Detailed Setup
See `directives/setup-local-dev.md` for the full local dev SOP, and `directives/database-setup.md` for Neo4j + Supabase + GCS infrastructure.

## Phase 2 Roadmap

### Stencil Export Enhancement
- Improve edge detection quality in `src/features/stencil/services/stencilEdgeService.js`
- Add calibration tools for print sizing — `src/features/stencil/utils/stencilCalibration.js`
- PDF generation refinement — `src/features/stencil/utils/pdfGenerator.js`

### Vibe Chips (Style Exploration)
- Swipeable style tags for quick design iteration
- Build on existing `SwipeMatch.jsx` pattern

### Version Branching
- Extend version history from linear to branching model
- Allow design forks and comparisons — build on `VersionTimeline.jsx` and `VersionComparison.jsx`

### Match Pulse
- Real-time artist availability and matching — `src/features/match-pulse/`
- Integrate embedding-based similarity with live artist data
- Match store at `src/features/match-pulse/store/useMatchStore.js`

### AR Preview
- Body placement visualization — `src/services/ar/`, `src/app/api/v1/ar/`
- Build on existing `Visualize.jsx`

### Tech Debt
- Break up `Generate.jsx` (~2000 lines) into smaller components
- Consolidate duplicated services between `src/services/` and `src/features/*/services/`
- Resolve pre-existing TypeScript errors
- Add comprehensive test coverage (currently minimal)

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| **Next.js over Vite** | SSR support, API routes, better production deployment (Vercel) |
| **Zustand over Redux** | Simpler API, smaller bundle, built-in persist middleware |
| **Ref-counted image registry** | Prevents blob URL memory leaks in long editing sessions |
| **Hybrid RRF matching** | Graph DB captures relationships (style lineage), vector DB captures visual similarity — fusion gives best results |
| **Council fallback chain** | Vertex AI Gemini is free-tier; OpenRouter paid backup ensures reliability without defaulting to expensive calls |
| **Snapshot + transform history** | Full snapshots for undo reliability, transforms for storage efficiency |
| **3-layer directive architecture** | Separates human intent (directives) from AI decision-making from deterministic execution — reduces compounding errors |
| **Canvas ops < 16ms target** | 60fps required for smooth layer manipulation UX |
| **$500 Imagen budget cap** | Phase 1 constraint — generation calls must be intentional, not speculative |
