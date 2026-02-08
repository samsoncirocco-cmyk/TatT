# Agent Instructions

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.

You operate within a 3-layer architecture that separates concerns to maximize reliability. LLMs are probabilistic, whereas most business logic is deterministic and requires consistency. This system fixes that mismatch.

## The 3-Layer Architecture

**Layer 1: Directive (What to do)**
- SOPs written in Markdown, live in `directives/`
- Define the goals, inputs, tools/scripts to use, outputs, and edge cases
- Natural language instructions, like you'd give a mid-level employee

**Layer 2: Orchestration (Decision making)**
- This is you. Your job: intelligent routing.
- Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
- You're the glue between intent and execution. E.g you don't try generating tattoo designs yourself—you read `directives/generate-design.md` and then run the appropriate execution script

**Layer 3: Execution (Doing the work)**
- Deterministic scripts in `execution/`
- Environment variables and API tokens stored in `.env.local`
- Handle API calls, data processing, file operations, database interactions
- Reliable, testable, fast. Use scripts instead of manual work.

**Why this works:** if you do everything yourself, errors compound. 90% accuracy per step = 59% success over 5 steps. The solution is push complexity into deterministic code. That way you just focus on decision-making.

## Operating Principles

**1. Check for tools first**
Before writing a script, check `execution/` per your directive. Only create new scripts if none exist.

**2. Self-anneal when things break**
- Read error message and stack trace
- Fix the script and test it again (unless it uses paid tokens/credits/etc—in which case you check w user first)
- Update the directive with what you learned (API limits, timing, edge cases)
- Example: you hit a Replicate API rate limit → investigate → find a batch endpoint → rewrite script → test → update directive.

**3. Update directives as you learn**
Directives are living documents. When you discover API constraints, better approaches, common errors, or timing expectations—update the directive. But don't create or overwrite directives without asking unless explicitly told to. Directives are your instruction set and must be preserved (and improved upon over time, not extemporaneously used and then discarded).

## Self-annealing loop

Errors are learning opportunities. When something breaks:
1. Fix it
2. Update the tool
3. Test tool, make sure it works
4. Update directive to include new flow
5. System is now stronger

## Project Overview

**TatTester** is an AI-powered tattoo design generator and visualization platform built with React + Next.js + Tailwind CSS. It helps first-time tattoo seekers overcome commitment anxiety through custom design generation, layer-based editing, AR preview capabilities, and artist matching.

**Current Phase**: MVP (Phase 1) - "The Forge" design studio with hybrid vector-graph matching

**Core Stack**:
- **Frontend**: React 18 + Next.js + Tailwind CSS
- **Backend**: Express.js proxy server (`server.js`) on port 3001/3002
- **AI Generation**: Vertex AI Imagen 3.0 (primary), Replicate (legacy fallback)
- **AI Council**: Vertex AI Gemini (free) → OpenRouter multi-model (paid fallback)
- **Graph DB**: Neo4j (artist relationships, portfolios, styles)
- **Vector DB**: Supabase pgvector (semantic similarity matching)
- **Matching**: Hybrid RRF (Reciprocal Rank Fusion) combining graph + vector results

## File Organization

**Directory structure:**
- `directives/` - SOPs in Markdown (8 workflow guides — see Available Directives below)
- `execution/` - Script manifest mapping directives to scripts in `scripts/`
- `src/` - Application source code
  - `src/services/` - Business logic & API clients
  - `src/hooks/` - Custom React hooks (stateful logic)
  - `src/components/` - React components
  - `src/pages/` - Route pages
  - `src/constants/` - Shared constants
  - `src/api/routes/` - Backend API v1 routes
- `scripts/` - Build and utility scripts
- `tests/` - Test files
- `.env.local` - Environment variables and API keys (git-ignored)
- `.env.example` - Template for required env vars

**Key principle:** Deliverables live in cloud services where the user can access them. Local intermediate files can be deleted and regenerated.

## Available Directives

Before starting any workflow, check `directives/` for an existing SOP:

| Directive | Purpose | Cost |
|-----------|---------|------|
| `setup-local-dev.md` | Full local stack setup from scratch | Free |
| `database-setup.md` | Neo4j + Supabase + GCS infrastructure setup | Free tier |
| `import-artists.md` | Generate and import artist data to Neo4j + Supabase | Free |
| `generate-embeddings.md` | Text embeddings for artist matching (Vertex AI) | Free |
| `deploy.md` | Deploy frontend (Vercel) + backend (Railway) | ~$5/mo |
| `generate-design.md` | AI tattoo design generation via Imagen | $0.02/image |
| `council-enhance.md` | AI prompt enhancement (multi-model council) | Free (Vertex AI) or $0.08 (OpenRouter) |
| `docker-dev.md` | Docker-based dev environment | Free |

See `execution/README.md` for the script mapping between directives and execution scripts.

## Development Commands

```bash
# Development (requires two terminals)
npm run dev        # Frontend dev server (port 3000)
npm run server     # Backend proxy server (port 3001/3002)

# Testing
npm run test              # Run tests once
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report

# Build & Deploy
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # ESLint check
```

## Architecture Essentials

### Data Layer: Hybrid Vector-Graph System

Three complementary data sources for artist matching:

1. **Neo4j Graph DB** - Relationship-based: "Artists who specialize in Japanese + have 5+ similar pieces"
2. **Supabase Vector DB** - Semantic similarity: "Visually similar portfolios even if different style tags"
3. **RRF Fusion** - Combines both: `score = 1 / (k + rank)` where k=60

Key services: `hybridMatchService.js`, `vectorDbService.js`, `neo4jService.js`, `matchService.js`

### Canvas Layer System

Multi-layer compositing via `canvasService.ts`:
- Immutable layer operations (never mutates input)
- Blend modes, transforms, export as PNG or AR-ready 1024x1024
- State flow: User Action → Hook (`useLayerManagement`) → Service → Canvas Render

### AI Council Pattern

Consolidated multi-agent prompt refinement via `councilService.ts`:
- Fallback chain: Vertex AI (free) → OpenRouter ($0.08) → Demo → API → Mock
- Specialist agents: Creative Director, Technical Expert, Style Specialist
- Flow: User Prompt → Council Enhancement → Imagen API → Generated Images → Layers
- See `directives/council-enhance.md` for full SOP

### Backend Auth

All API calls require bearer token:
```javascript
headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_FRONTEND_AUTH_TOKEN}` }
```

Rate limiting: 100 req/hr semantic match, 20 req/hr council, 10 req/min generation

## Environment Variables

```bash
# Required
GCP_PROJECT_ID=tatt-pro              # Vertex AI project
GCP_REGION=us-central1               # Vertex AI region
FRONTEND_AUTH_TOKEN=your-secret      # Must match on frontend + backend
NEXT_PUBLIC_FRONTEND_AUTH_TOKEN=your-secret
NEXT_PUBLIC_PROXY_URL=http://127.0.0.1:3001/api

# Supabase (vector DB)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...          # Backend only

# Neo4j (graph DB)
NEO4J_URI=neo4j+s://...
NEO4J_USER=neo4j
NEO4J_PASSWORD=...

# OpenRouter (AI Council)
OPENROUTER_API_KEY=sk-or-...
```

## Key Constraints

- **$500 Vertex AI Imagen budget** for Phase 1 — always check w user before running paid API calls
- **localStorage ~5-10MB** — version history capped at 20 entries, 90-day auto-purge
- **Canvas ops < 16ms** (60fps target)
- **API tokens never exposed to client** in production

## Design System

- **Primary**: Ducks Green (`#154733`)
- **Secondary**: Ducks Yellow (`#FEE123`)
- **Background**: Pure black (`#000000`) - "Tactile Scar Tissue" aesthetic
- **Fonts**: Space Grotesk (headings), Outfit (body), JetBrains Mono (technical)
- **Pattern**: `.glass-panel` frosted glass containers, `border-white/10` subtle borders

## Adding Features (Service-First Pattern)

1. **Service** in `src/services/` — pure functions, no React
2. **Hook** in `src/hooks/` — wraps service with state (if stateful)
3. **Component** in `src/components/` — purely presentational
4. **Test** in corresponding `.test.js` file

## Summary

You sit between human intent (directives) and deterministic execution (scripts). Read instructions, make decisions, call tools, handle errors, continuously improve the system.

Be pragmatic. Be reliable. Self-anneal.
