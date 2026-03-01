<div align="center">
  <h1>🎨 TatT</h1>
  <p><strong>AI-powered tattoo design studio that turns ideas into ink-ready art</strong></p>
  <p>
    <a href="https://tat-t-3x8t.vercel.app">Live Demo</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#api-reference">API Reference</a> •
    <a href="ARCHITECTURE.md">Architecture</a> •
    <a href="docs/TROUBLESHOOTING.md">Troubleshooting</a>
  </p>
  
  ![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
  ![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
  ![License](https://img.shields.io/badge/License-Proprietary-red)
</div>

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

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
| **Cost Estimator** | Real-time pricing based on size, complexity, and location |

---

## Quick Start

### Prerequisites

- **Node.js 18+** (recommend 20.x or 22.x)
- **npm 9+** or **pnpm**
- **Replicate API token** — [Get one free](https://replicate.com/account/api-tokens)

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/TatT.git
cd TatT
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your API keys. **Minimum required for local development:**

```env
# REQUIRED — Image generation won't work without this
REPLICATE_API_TOKEN=r8_your_token_here

# REQUIRED — Auth token for frontend-to-backend communication
# Generate with: openssl rand -hex 32
FRONTEND_AUTH_TOKEN=your_generated_token
VITE_FRONTEND_AUTH_TOKEN=your_generated_token
```

### 3. Run the Development Server

```bash
# Terminal 1: Start Next.js (port 3000)
npm run dev

# Terminal 2: Start Express proxy (port 3002)
npm run server
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Generate Your First Design

1. Navigate to **Generate** (✨ icon in nav)
2. Select a style (Traditional, Anime, Minimalist, etc.)
3. Describe your idea: `"wolf howling at the moon, pine forest background"`
4. (Optional) Click **Enhance with AI Council** for better prompts
5. Hit **Generate** — wait 10-30 seconds
6. Save to library or export as stencil

---

## Environment Variables

### Required Variables

| Variable | Purpose | How to Get |
|----------|---------|------------|
| `REPLICATE_API_TOKEN` | Image generation (SDXL, etc.) | [replicate.com/account](https://replicate.com/account/api-tokens) |
| `FRONTEND_AUTH_TOKEN` | Frontend ↔ backend auth | `openssl rand -hex 32` |

### Optional Integrations

<details>
<summary><strong>LLM Council (OpenRouter)</strong> — Enhanced prompt generation</summary>

```env
VITE_USE_OPENROUTER=true
VITE_OPENROUTER_API_KEY=your_openrouter_key
```

Uses Claude 3.5 Sonnet, GPT-4 Turbo, and Gemini Pro for prompt enhancement. ~$0.01-0.03 per enhancement.

Get a key at [openrouter.ai/keys](https://openrouter.ai/keys)
</details>

<details>
<summary><strong>Supabase</strong> — Vector search + authentication</summary>

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

Enables semantic artist matching with pgvector embeddings.
</details>

<details>
<summary><strong>Firebase</strong> — User authentication</summary>

```env
# Client-side (safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# Server-side (keep secret)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Cookie signing
AUTH_COOKIE_SIGNATURE_KEY_CURRENT=generate_with_openssl_rand_hex_32
```
</details>

<details>
<summary><strong>Neo4j</strong> — Graph database for artist relationships</summary>

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```
</details>

<details>
<summary><strong>Google Cloud</strong> — Vertex AI (Imagen 3) + Storage</summary>

```env
GCP_PROJECT_ID=your_project_id
VITE_VERTEX_AI_PROJECT_ID=your_project_id
```

Requires GCP service account with Vertex AI and Storage permissions.
</details>

### Feature Flags

```env
VITE_DEMO_MODE=false           # Use mock images (no API calls)
VITE_COUNCIL_DEMO_MODE=true    # Use mock LLM responses
VITE_ENABLE_INPAINTING=true    # Enable inpainting editor
VITE_ENABLE_STENCIL_EXPORT=true # Enable stencil export
VITE_ENABLE_AR_PREVIEW=false   # Enable AR visualization (WIP)
```

### Budget Controls

```env
VITE_MAX_DAILY_SPEND=10.00     # Max daily API spend (USD)
VITE_TOTAL_BUDGET=500.00       # Total budget cap (USD)
```

---

## Development

### Scripts

```bash
npm run dev          # Next.js dev server (port 3000)
npm run server       # Express proxy server (port 3002)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run test suite (Vitest)
npm run test:watch   # Watch mode for tests
npm run test:coverage # Generate coverage report
```

### Development Workflow

1. **Frontend changes:** Edit files in `src/`, Next.js hot-reloads automatically
2. **API changes:** Edit `src/app/api/v1/*/route.ts`, restart dev server if needed
3. **Backend proxy changes:** Edit `server.js`, restart with `npm run server`
4. **Style changes:** Tailwind classes hot-reload, edit `tailwind.config.ts` for theme

### Code Style

- **TypeScript** for new code (migration ~40% complete)
- **ESLint** with Next.js config
- **Prettier** for formatting (configure your editor)
- **Zustand** for state management
- **Services pattern** for business logic (`src/services/`)

### Hot Tips

- Use `VITE_DEMO_MODE=true` to develop UI without burning API credits
- The Express proxy (`server.js`) is only needed for Replicate and Neo4j
- Check `src/config/modelRoutingRules.js` to understand model selection logic
- All API routes follow REST: `POST /api/v1/{resource}/{action}`

---

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

For detailed architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

### Core Flows

| Flow | Path |
|------|------|
| **Design Generation** | User prompt → LLM Council → Model Router → Replicate/Vertex → 4 variations |
| **Artist Matching** | User preferences → Keyword match + Vector search → Weighted score → Ranked results |
| **Stencil Export** | Forge Canvas → Layer composition → 300 DPI export → Thermal printer ready |

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Next.js 16, Tailwind 4, Framer Motion, Zustand, Konva |
| **Backend** | Next.js API routes, Express proxy |
| **Image Gen** | Replicate (SDXL, DreamShaper, Anime XL, Blackwork), Google Vertex AI (Imagen 3) |
| **LLM Council** | OpenRouter (Claude 3.5 Sonnet, GPT-4 Turbo, Gemini Pro 1.5) |
| **Database** | Supabase (PostgreSQL + pgvector), Neo4j |
| **Storage** | Google Cloud Storage |
| **Auth** | Firebase Auth (next-firebase-auth-edge) |
| **Deploy** | Vercel (frontend), Railway (backend) |

---

## API Reference

All endpoints: `POST /api/v1/{resource}/{action}`

### Image Generation

```bash
curl -X POST http://localhost:3000/api/v1/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FRONTEND_AUTH_TOKEN" \
  -d '{
    "prompt": "wolf howling at the moon",
    "style": "traditional",
    "bodyPart": "forearm",
    "numOutputs": 4
  }'
```

### LLM Council Enhancement

```bash
curl -X POST http://localhost:3000/api/v1/council/enhance \
  -H "Content-Type: application/json" \
  -d '{
    "userPrompt": "cool dragon",
    "style": "japanese"
  }'
```

**Response:**
```json
{
  "simple": "Japanese dragon with cloud motifs...",
  "detailed": "Mythological dragon in traditional irezumi style...",
  "ultra": "Full-sleeve composition featuring a serpentine dragon..."
}
```

### Full API Surface

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/generate` | POST | Generate tattoo images |
| `/api/v1/council/enhance` | POST | LLM prompt enhancement |
| `/api/v1/match/semantic` | POST | Vector-based artist matching |
| `/api/v1/match/update` | POST | Update match scores |
| `/api/v1/layers/decompose` | POST | Split image into layers |
| `/api/v1/stencil/export` | POST | Export at 300 DPI |
| `/api/v1/storage/upload` | POST | Upload to GCS |
| `/api/v1/storage/get-signed-url` | POST | Get signed download URL |
| `/api/v1/embeddings/generate` | POST | Generate vector embeddings |
| `/api/v1/ar/visualize` | POST | AR visualization processing |
| `/api/v1/estimate` | POST | Cost estimation |
| `/api/v1/tasks/*` | POST | Background task management |

For complete API documentation, see [docs/API_REFERENCE.md](docs/API_REFERENCE.md).

---

## Testing

### Run Tests

```bash
npm run test              # Run all tests once
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
```

### Test Structure

```
tests/
├── unit/                 # Unit tests for services
├── integration/          # API endpoint tests
└── e2e/                  # End-to-end tests (Playwright)

src/services/__tests__/   # Service-specific tests
```

### Writing Tests

Tests use **Vitest** with **Testing Library**:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

For service tests, see examples in `src/services/councilService.test.js`.

---

## Deployment

### Frontend → Vercel

```bash
# Option 1: CLI deploy
vercel --prod

# Option 2: Connect GitHub (recommended)
# Push to main branch → auto-deploys
```

**Required env vars in Vercel:**
- `REPLICATE_API_TOKEN`
- `FRONTEND_AUTH_TOKEN`
- All Firebase vars (if using auth)
- See [docs/VERCEL_ENVIRONMENT_SETUP.md](docs/VERCEL_ENVIRONMENT_SETUP.md)

### Backend → Railway

```bash
railway up
```

**Required env vars in Railway:**
- `REPLICATE_API_TOKEN`
- `FRONTEND_AUTH_TOKEN`
- `ALLOWED_ORIGINS` (your Vercel URL)
- `PORT` (set automatically)

See [docs/RAILWAY_SETUP.md](docs/RAILWAY_SETUP.md)

### Database Setup

**Supabase:**
```sql
-- Run in Supabase SQL Editor
-- 1. Create tables
\i generated/create-table.sql

-- 2. Seed data
\i generated/insert-batch-50.sql
```

**Neo4j:**
```bash
node scripts/import-to-neo4j.js
```

---

## Troubleshooting

### Common Issues

<details>
<summary><strong>❌ "Failed to generate image" or timeout</strong></summary>

1. Check your `REPLICATE_API_TOKEN` is valid
2. Verify the Express proxy is running: `npm run server`
3. Check Replicate API status: [status.replicate.com](https://status.replicate.com)
4. Try enabling demo mode: `VITE_DEMO_MODE=true`
</details>

<details>
<summary><strong>❌ CORS errors</strong></summary>

1. Ensure `ALLOWED_ORIGINS` includes your frontend URL
2. Check that the Express proxy (`server.js`) is running
3. Verify you're using the correct port (3002 for proxy)
</details>

<details>
<summary><strong>❌ "Council enhancement failed"</strong></summary>

1. If using OpenRouter: check `VITE_OPENROUTER_API_KEY`
2. Try demo mode: `VITE_COUNCIL_DEMO_MODE=true`
3. Check OpenRouter credits/quota
</details>

<details>
<summary><strong>❌ Firebase auth errors</strong></summary>

1. Verify all `NEXT_PUBLIC_FIREBASE_*` vars are set
2. Check `AUTH_COOKIE_SIGNATURE_KEY_*` is generated
3. Ensure Firebase project has Authentication enabled
4. See [docs/firebase-setup.md](docs/firebase-setup.md)
</details>

<details>
<summary><strong>❌ Build fails with TypeScript errors</strong></summary>

1. Run `npm run lint` to see errors
2. The codebase is ~40% migrated; some JS files may have issues
3. Check `tsconfig.json` for excluded files
4. See [docs/MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md)
</details>

For more troubleshooting, see [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

---

## Project Structure

```
TatT/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/v1/             # API routes (/api/v1/*)
│   │   ├── generate/           # Generate page
│   │   ├── artists/            # Artist matching pages
│   │   ├── library/            # Design library page
│   │   └── layout.tsx          # Root layout
│   ├── services/               # Core business logic
│   │   ├── councilService.ts   # LLM council orchestration
│   │   ├── replicateService.ts # Image generation
│   │   ├── matchService.ts     # Artist matching
│   │   ├── hybridMatchService.ts # Vector + keyword matching
│   │   ├── stencilService.ts   # Stencil export
│   │   └── neo4jService.ts     # Graph queries
│   ├── components/             # React UI components
│   │   ├── Forge/              # Canvas/editor components
│   │   ├── Match/              # Artist matching UI
│   │   └── ui/                 # Shared UI primitives
│   ├── stores/                 # Zustand state stores
│   ├── hooks/                  # Custom React hooks
│   ├── config/                 # Configuration files
│   │   ├── modelRoutingRules.js
│   │   └── promptTemplates.js
│   └── constants/              # Feature flags, constants
├── server.js                   # Express proxy server
├── scripts/                    # Build/data scripts
├── generated/                  # Seeded data artifacts
├── docs/                       # Documentation
├── tests/                      # Test files
└── public/                     # Static assets
```

---

## Contributing

### Before You Start

1. Read [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
2. Check [docs/MIGRATION_STATUS.md](docs/MIGRATION_STATUS.md) for TypeScript progress
3. Review [CHANGELOG.md](CHANGELOG.md) for recent changes

### Development Process

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes following code style guidelines
3. Write tests for new functionality
4. Run tests: `npm run test`
5. Run lint: `npm run lint`
6. Build to verify: `npm run build`
7. Submit a PR with clear description

### Code Guidelines

- **New code should be TypeScript** (`.ts`/`.tsx`)
- **Services go in `src/services/`** with corresponding tests
- **Components go in `src/components/`** organized by feature
- **API routes follow REST conventions**
- **Use Zustand for global state**, React state for local

---

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

---

## License

Proprietary. All rights reserved.

---

<div align="center">
  <strong>Turn ideas into ink.</strong>
  <br><br>
  <a href="https://tat-t-3x8t.vercel.app">Try the Demo</a>
</div>
