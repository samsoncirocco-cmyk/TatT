# CLAUDE.md - TatT AI Agent Instructions

## Project Overview

**TatT** is an AI-powered tattoo design platform that combines:
- **AI Tattoo Design Generation** — Council-enhanced prompts → SDXL/Vertex Imagen → multi-layer RGBA output
- **AR Preview** — Real-time body overlay with depth mapping for realistic placement visualization
- **Artist Matching** — Semantic search via Supabase vectors + Neo4j graph relationships + Firebase real-time updates

### Mission
Democratize custom tattoo design by lowering the barrier between idea and execution. Empower users to iterate quickly, visualize accurately, and connect with the right artists.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router), React 19, Tailwind CSS | Server components + client interactivity |
| **UI Libraries** | Framer Motion, Konva/React-Konva, Lucide Icons, react-tinder-card | Animations, canvas manipulation, swipe UX |
| **AI Generation** | Replicate (SDXL models), Google Vertex AI (Imagen 3, Gemini 2.0), OpenRouter (Claude, GPT-4) | Multi-model routing with fallbacks |
| **Council AI** | Vertex AI Gemini 2.0 Flash | Prompt enhancement via multi-agent simulation (Creative + Technical + Style) |
| **Vector Search** | Supabase (pgvector) | Semantic matching for artist portfolios (text-embedding-gecko-002) |
| **Graph Database** | Neo4j | Artist relationships, collaboration history, style hierarchies |
| **Real-time Sync** | Firebase Realtime Database | Live match updates, user presence |
| **Storage** | Google Cloud Storage (GCS) | Layer storage, design exports |
| **Deployment** | Vercel (Edge Runtime) | Global CDN, serverless functions |

---

## Architecture: 3-Layer Framework

### **Layer 1: Directives** 📋
High-level workflow SOPs in `directives/`. Each directive is a **what** and **why** guide:
- User-facing goal (e.g., "Generate a 4-layer tattoo design")
- When to use this workflow
- Prerequisites and cost considerations
- Expected outputs and edge cases

**Location:** `directives/*.md`

### **Layer 2: Orchestration** 🎯
**(Future)** Complex multi-step workflows that chain directives together.  
For now, directives themselves provide orchestration guidance.

**Location:** `orchestration/*.md` (reserved for future use)

### **Layer 3: Execution** ⚙️
Actual code that implements directives. The `execution/README.md` maps each directive to:
- API routes (e.g., `/api/v1/generate`)
- Service files (e.g., `src/services/councilService.ts`)
- Scripts (e.g., `scripts/generate-vertex-embeddings.js`)
- Feature modules (e.g., `src/features/generate/`)

**Location:** `execution/README.md` + actual code in `src/`, `scripts/`

---

## Key Commands

```bash
# Development
npm run dev                # Start dev server (http://localhost:3000)
npm run build              # Production build
npm run start              # Start production server
npm run lint               # Run ESLint

# Testing
npm test                   # Run Jest tests (if configured)

# Database Setup
node scripts/setup-supabase-vector-schema.js  # Initialize Supabase schema
node scripts/import-to-neo4j.js               # Seed Neo4j graph
node scripts/generate-vertex-embeddings.js    # Generate embeddings for artists

# Deployment
vercel deploy              # Deploy to Vercel preview
vercel --prod              # Deploy to production
```

---

## Service Dependency Map

```
User Request
    ↓
┌─────────────────────────────────────────┐
│  API Layer (Edge Runtime)               │
│  - /api/v1/generate                     │
│  - /api/v1/council/enhance              │
│  - /api/v1/match/semantic               │
│  - /api/v1/stencil/export               │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  Service Layer                          │
│  ┌─────────────────────────────────┐   │
│  │ councilService.ts               │   │  ← Vertex AI Gemini (prompt enhancement)
│  │   ↓                             │   │
│  │ generationService.ts            │   │  ← Routes to Replicate/Vertex
│  │   ↓                             │   │
│  │ replicateService.js             │   │  ← SDXL models (4 variants)
│  │ vertex-imagen-client.ts         │   │  ← Imagen 3 (RGBA layers)
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ matchService.js                 │   │  ← RRF (Reciprocal Rank Fusion)
│  │   ├─ vectorDbService.js         │   │  ← Supabase pgvector
│  │   ├─ neo4jService.ts            │   │  ← Neo4j graph queries
│  │   └─ firebase-match-service.js  │   │  ← Firebase real-time
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ stencilService.js               │   │  ← Canvas → PDF/PNG
│  │   ├─ stencilEdgeService.js      │   │  ← Edge detection
│  │   └─ pdfGenerator.js            │   │  ← jsPDF export
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ layerDecompositionService.js    │   │  ← Segmentation (Vertex Vision API)
│  │ multiLayerService.js            │   │  ← Layer merging/upload to GCS
│  │ gcs-service.ts                  │   │  ← Google Cloud Storage
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  External APIs                          │
│  - Replicate (SDXL models)              │
│  - Google Vertex AI (Imagen, Gemini)    │
│  - Supabase (pgvector + Postgres)       │
│  - Neo4j (graph database)               │
│  - Firebase (real-time sync)            │
│  - Google Cloud Storage (GCS)           │
└─────────────────────────────────────────┘
```

---

## Environment Variables

Create `.env.local` with:

```bash
# Replicate
REPLICATE_API_TOKEN=r8_***

# Google Cloud (Vertex AI, GCS)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCP_PROJECT_ID=tatt-pro
GCP_REGION=us-central1
NEXT_PUBLIC_VERTEX_AI_PROJECT_ID=tatt-pro

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://***.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***

# Neo4j
NEO4J_URI=neo4j+s://***.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=***

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=***
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=***.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=***
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://***.firebaseio.com

# OpenRouter (for Council fallback)
OPENROUTER_API_KEY=sk-or-***

# API Auth (optional)
TATT_API_KEY=your-secret-key

# Feature Flags
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_COUNCIL_DEMO_MODE=false
```

---

## Development Workflow

1. **Feature Development:**
   - Read relevant directive in `directives/`
   - Check `execution/README.md` for code locations
   - Modify/extend services in `src/services/` or `src/features/`
   - Test locally with `npm run dev`

2. **Adding New Workflows:**
   - Create directive in `directives/my-workflow.md`
   - Implement in `src/services/` or `src/features/`
   - Update `execution/README.md` with mappings
   - Add tests (e.g., `src/services/__tests__/`)

3. **Database Changes:**
   - Supabase: Update schema in `scripts/setup-supabase-vector-schema.js`
   - Neo4j: Add Cypher queries to `scripts/generate-neo4j-cypher.js`

4. **Deployment:**
   - Push to `manama/next` branch
   - Vercel auto-deploys previews
   - Merge to `main` for production

---

## Cost Monitoring

| Service | Approximate Cost | Notes |
|---------|-----------------|-------|
| **Replicate SDXL** | ~$0.0055/image | 4 outputs = $0.022 per generation |
| **Vertex Imagen 3** | ~$0.04/image | RGBA support, higher quality |
| **Vertex Gemini (Council)** | ~$0.02/request | Prompt enhancement via 3-agent simulation |
| **Vertex Vision API** | ~$0.0015/image | Segmentation for layer decomposition |
| **Supabase** | Free tier OK | Vector search is fast (<100ms) |
| **Neo4j** | Free tier OK | Aura free instance sufficient for dev |
| **Firebase** | Free tier OK | Real-time sync, minimal usage |
| **GCS** | ~$0.02/GB | Storage for layers/exports |

**Monthly Budget Target:** ~$500 (22,700 SDXL generations or ~5,000 full workflows)

---

## Quick Reference: Where is Everything?

| What | Where |
|------|-------|
| API routes | `src/app/api/` (App Router format) |
| Services | `src/services/` (shared business logic) |
| Features | `src/features/*/` (domain-specific modules) |
| Scripts | `scripts/` (DB setup, migrations, data generation) |
| Components | `src/components/` + feature-specific in `src/features/*/components/` |
| Directives | `directives/*.md` (workflow SOPs) |
| Execution Manifest | `execution/README.md` (directive → code map) |
| Config | `src/config/` (skill packs, model routing, prompts) |
| Utils | `src/utils/` (helpers, mappings, scoring) |

---

## Troubleshooting

### "Council enhancement failed"
- Check `GOOGLE_APPLICATION_CREDENTIALS` is set
- Verify Vertex AI API is enabled in GCP project
- Fallback to OpenRouter if Vertex is unavailable (set `OPENROUTER_API_KEY`)

### "Vector search returns no results"
- Run `node scripts/generate-vertex-embeddings.js` to populate embeddings
- Check Supabase connection: `node scripts/test-supabase-connection.js`

### "Neo4j connection timeout"
- Verify `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` in `.env.local`
- Check Neo4j Aura instance is running
- Demo mode available if Neo4j fails (see `demoMatchService.js`)

### "Layer upload fails"
- Check GCS bucket permissions (service account needs `storage.objects.create`)
- Verify bucket name in `gcs-service.ts`

---

## Next Steps

1. Read `directives/local-dev-setup.md` to get started
2. Explore `directives/generate-tattoo.md` to understand the core workflow
3. Check `execution/README.md` to see how directives map to code
4. Run `npm run dev` and test the generation flow at `http://localhost:3000`

---

**Last Updated:** 2026-02-08  
**Maintained by:** Samson via OpenClaw
