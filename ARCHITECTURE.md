# Architecture — TatT

> How the system connects, from user input to generated tattoo.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                           │
│  React 19 + Next.js 16 + Tailwind + Zustand + Framer Motion        │
│                                                                     │
│  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  │
│  │  Home   │ │ Generate  │ │Visualize │ │ Artists  │ │ Library │  │
│  │         │ │ (Forge)   │ │  (AR)    │ │ (Match)  │ │         │  │
│  └─────────┘ └─────┬─────┘ └──────────┘ └────┬─────┘ └─────────┘  │
└──────────────────────┼─────────────────────────┼────────────────────┘
                       │                         │
                       ▼                         ▼
┌──────────────────────────────┐  ┌──────────────────────────────────┐
│    Next.js API Routes        │  │    Express Proxy (Railway)       │
│    /api/v1/*                 │  │    server.js                     │
│                              │  │                                  │
│  • /generate                 │  │  • Replicate API proxy           │
│  • /council/enhance          │  │  • Neo4j query proxy             │
│  • /match/semantic           │  │  • CORS + auth middleware        │
│  • /stencil/export           │  │  • Rate limiting                 │
│  • /layers/decompose         │  │  • Layer upload handling         │
│  • /storage/*                │  │                                  │
└──────────┬───────────────────┘  └──────────────┬───────────────────┘
           │                                      │
           ▼                                      ▼
┌─────────────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
│  Google Vertex   │ │Replicate │ │Supabase │ │  Neo4j   │
│  AI (Imagen 3)   │ │  (SDXL)  │ │(pgvector│ │ (Graph)  │
│                  │ │          │ │ + Auth) │ │          │
└─────────────────┘ └──────────┘ └─────────┘ └──────────┘
```

## Core Flows

### 1. Design Generation

```
User prompt → LLM Council Enhancement → Model Router → Image Generation → Results
```

1. **User Input**: Style, subject, body part, size
2. **Council Enhancement** (`councilService.ts`): Sends the user's idea to 3 LLM models via OpenRouter (Claude, GPT-4, Gemini). Returns Simple/Detailed/Ultra prompt variants.
3. **Model Router** (`styleModelMapping.js`): Selects optimal image model based on style + complexity + body part. Uses cached availability checks with a 60s TTL.
4. **Image Generation** (`replicateService.ts`): Calls Replicate with the enhanced prompt and selected model. Generates 4 variations.
5. **Result Display**: Images rendered in a grid with "AI Enhanced" badges. User can save to library.

**Models available:**
| Model | Best For | Provider |
|---|---|---|
| SDXL | General purpose | Replicate |
| DreamShaper Turbo | Fast iterations | Replicate |
| Anime XL (Niji SE) | Anime/manga styles | Replicate |
| Tattoo Flash Art | Traditional flash | Replicate |
| Blackwork Specialist | Blackwork/linework | Replicate |
| Imagen 3 | Photorealism | Google Vertex AI |

### 2. Artist Matching (Neural Ink)

```
User preferences → Hybrid Score → Ranked Results
```

1. **Input**: Style preference, location (zip), budget, radius
2. **Keyword Matching** (`matchService.ts`): Fuzzy text matching on style, specialty, location
3. **Vector Search** (`hybridMatchService.ts`): Supabase pgvector cosine similarity on portfolio embeddings (4096-dimensional CLIP vectors)
4. **Score Aggregation** (`scoreAggregation.js`): Weighted combination of keyword + vector scores
5. **Real-time Updates** (`useRealtimeMatchPulse.ts`): Live score pulse via Supabase Realtime

### 3. Forge Canvas (Layer Editor)

```
Generated image → Layer decomposition → Transform + Edit → Stencil export
```

1. **Layer Decomposition** (`layerDecompositionService.js`): Breaks a design into separate layers (linework, shading, color, background) via Vertex AI segmentation
2. **Canvas Rendering** (`ForgeCanvas.tsx`): Konva-based canvas with react-konva. Supports drag, resize, rotate, blend modes.
3. **Version History** (`versionService.ts`): Undo/redo with full layer state snapshots
4. **Stencil Export** (`stencilService.ts`): Exports at 300 DPI with proper thermal printer calibration

### 4. AR Visualization

```
Camera feed → Body detection → Design overlay → Live preview
```

1. **Camera**: MindAR session via `mindarSession.js`
2. **Depth Mapping**: `depthMappingService.js` estimates surface curvature
3. **Overlay**: Design placed and warped to match body surface

## Data Architecture

### Supabase (PostgreSQL + pgvector)
- `tattoo_artists`: Artist profiles (name, style, location, rating, pricing)
- `portfolio_embeddings`: 4096-dimensional CLIP vectors for semantic search
- Authentication and row-level security

### Neo4j (Graph Database)
- Artist → Style relationships
- Artist → Location proximity
- Design → Style → Artist recommendation paths

### Local Storage
- Design library (up to 50 designs)
- User preferences
- Budget tracking

## State Management

- **Zustand Stores:**
  - `useForgeStore.ts`: Canvas layers, active layer, transform state, version history
  - `useMatchStore.ts`: Match results, filters, loading states
  - `useAuthStore.ts`: Authentication state

- **React Context:**
  - `ToastContext.tsx`: Global notification system

## API Architecture

All API routes follow the pattern `/api/v1/{resource}/{action}`:

| Route | Method | Purpose |
|---|---|---|
| `/api/v1/generate` | POST | Generate tattoo images |
| `/api/v1/council/enhance` | POST | Enhance prompt via LLM council |
| `/api/v1/match/semantic` | POST | Semantic artist matching |
| `/api/v1/match/update` | POST | Update match scores |
| `/api/v1/layers/decompose` | POST | Decompose image into layers |
| `/api/v1/stencil/export` | POST | Export stencil at 300 DPI |
| `/api/v1/storage/upload` | POST | Upload to GCS |
| `/api/v1/storage/get-signed-url` | POST | Get signed URL for GCS object |
| `/api/v1/embeddings/generate` | POST | Generate vector embeddings |
| `/api/v1/ar/visualize` | POST | AR visualization processing |

## Security

- **Auth Token**: Shared secret (`FRONTEND_AUTH_TOKEN`) between Vercel frontend and Railway backend
- **Rate Limiting**: Per-IP rate limits on all API routes
- **CORS**: Whitelisted origins only
- **API Keys**: Server-side only — Replicate/Vertex keys never exposed to client
- **Input Validation**: Centralized validation middleware (`src/api/middleware/validation.js`)

## Deployment

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│   Vercel     │────▶│   Railway    │────▶│  Replicate    │
│  (Frontend)  │     │  (Backend)   │     │  (AI Models)  │
│  Next.js SSR │     │  Express.js  │     └───────────────┘
└──────┬───────┘     └──────┬───────┘
       │                     │
       ▼                     ▼
┌─────────────┐     ┌───────────────┐     ┌───────────────┐
│  Supabase   │     │   Neo4j      │     │  Google Cloud  │
│  (DB+Auth)  │     │  (Graph DB)  │     │  Storage (GCS) │
└─────────────┘     └───────────────┘     └───────────────┘
```

## Generated Data (`generated/`)

Pre-built data artifacts for seeding databases. Created by `scripts/generate-tattoo-artists-data.js` and related scripts.

| File | Description |
|---|---|
| `tattoo-artists-supabase.json` | Full artist dataset (100 artists) formatted for Supabase insert |
| `tattoo-artists-batch-50.json` | Smaller 50-artist batch for testing |
| `create-table.sql` | DDL for the `tattoo_artists` table in Supabase/PostgreSQL |
| `insert-batch-50.sql` | INSERT statements for the 50-artist batch |
| `tattoo-artists-neo4j.json` | Full artist dataset formatted for Neo4j import |
| `tattoo-artists-neo4j.cypher` | Cypher CREATE statements for all artists, styles, and relationships |
| `tattoo-artists-neo4j-batch.cypher` | Optimized batch Cypher using `UNWIND` with parameter references |
| `tattoo-artists-neo4j-params.json` | Parameter file for the batch Cypher script |

**Usage:**
- **Supabase:** Run `create-table.sql` then `insert-batch-50.sql` in the SQL Editor, or use `scripts/inject-supabase-data.js`
- **Neo4j:** Run `tattoo-artists-neo4j.cypher` directly, or use `scripts/import-to-neo4j.js` with the JSON/params files
- **These files are checked in** so the project works without running the generation scripts

## Key Configuration

- **Model Routing Rules**: `src/config/modelRoutingRules.js` — defines which AI model to use per style
- **Prompt Templates**: `src/config/promptTemplates.js` — style-specific prompt engineering
- **Character Database**: `src/config/characterDatabase.js` — known character references for enhancement
- **Feature Flags**: `src/constants/featureFlags.ts` — toggle experimental features
- **Body Part Ratios**: `src/constants/bodyPartAspectRatios.ts` — canvas sizing per body placement

## TypeScript Migration Status

The codebase is ~40% migrated to TypeScript (Phases 0–2c complete). Migration follows a bottom-up strategy:

1. ✅ **Contexts** — `ToastContext.tsx`
2. ✅ **Hooks** — all critical hooks (`useImageGeneration.ts`, `useArtistMatching.ts`, `useVersionHistory.ts`, etc.)
3. ✅ **Core Services** — `replicateService.ts`, `councilService.ts`, `matchService.ts`, `versionService.ts`
4. ✅ **Pages** — `SmartMatch.tsx`, `SwipeMatch.tsx`
5. ⏳ **Phase 3** — remaining services, pages, components; then enable `strict: true`

See `CHANGELOG.md` for detailed migration history.
