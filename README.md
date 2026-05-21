# TatT

AI-powered tattoo design platform. Council-enhanced prompts run through SDXL or Vertex Imagen to produce multi-layer RGBA output, then artists are matched via a hybrid Supabase pgvector + Neo4j graph search.

## Current state

Next.js 16 migration on branch `samson/port-artist-crawler`. As of 2026-05-19 all 14+ customer-facing routes are scaffolded in the new punk design system, but most pages use inline mock data — real API wiring is pending. The Vercel deploy was broken for 71 days (Mar 9 → May 19) and was unblocked today; subsequent commits have green builds.

The original Vite app (`~/Desktop/TatT`) still has work that hasn't been ported. The crawler and GraphInsight viz were ported today.

## Tech stack

- **Framework**: Next.js 16 (App Router, Turbopack disabled — webpack build)
- **Frontend**: React 19, TypeScript, Tailwind CSS 3
- **State**: Zustand with localStorage persistence
- **AI generation**: Replicate (SDXL), Google Vertex AI (Imagen 3, Gemini 2.0 Flash)
- **Council** (prompt enhancement): Vertex Gemini → OpenRouter fallback. No silent mock fallback as of `499a072`.
- **Vector search**: Supabase pgvector with Vertex text embeddings
- **Graph DB**: Neo4j Aura
- **Real-time**: Firebase Realtime Database
- **Storage**: Google Cloud Storage
- **Deploy**: Vercel (project: `manama-next`)

## Quick start

```bash
npm install --legacy-peer-deps   # react-tinder-card peer dep conflict; see .npmrc
cp .env.example .env.local       # fill in keys per CLAUDE.md
npm run dev                      # http://localhost:3000
```

The `--legacy-peer-deps` flag is required and enforced by `.npmrc` for CI parity. Without it, `react-tinder-card@1.6.4` (wants `@react-spring/web@^9`) refuses to install against the project's `^10`.

Other scripts:

- `npm run build` — Next production build (webpack, not turbopack)
- `npm run server` — Express proxy at port 3001
- `npm test` — vitest, currently ~197 tests across 14 files
- `npm run lint` — ESLint

## Project structure

```
src/
  app/                       # Next App Router
    page.tsx                 # marketing landing
    about/                   # about page
    artists/                 # artist directory + [slug] profile
    book/                    # 3-step booking flow
    bookings/                # user's booking list
    designs/                 # user's saved designs (localStorage)
    generate/                # studio entry + /generate/stencil reference UI
    legal/{terms,privacy}/   # static legal pages
    login/, signup/          # mock-localStorage auth UI (NOT wired to Firebase Auth yet)
    matches/                 # swipe matching UI
    pitch/                   # investor landing (force-dynamic)
    pricing/                 # tiered pricing
    settings/                # account settings
    api/v1/                  # council, generate, match, layers, stencil, storage, AR routes
    api/health/council/      # provider health probe (no auth)
  components/
    studio/                  # StudioShell, PunkFooter — punk design system primitives
    GraphInsight.jsx         # YC-pitch graph viz, ported from Vite today
  features/
    generate/                # Forge studio (Generate.jsx is ~2000 lines, due for split)
    match-pulse/             # hybrid RRF artist matching
    inpainting/, stencil/    # selective editing + edge-detection PDF export
  services/                  # councilService, generationService, firebase-match-service, etc.
  stores/                    # Zustand stores (useForgeStore, etc.)
  lib/api-auth.ts            # Bearer token auth — fails closed if env missing (since 0d467a2)
scripts/
  data_acquisition/          # parallel artist crawler ported from Vite TatT
  setup-supabase-vector-schema.js
  import-to-neo4j.js
  generate-vertex-embeddings.js
directives/                  # SOPs in Markdown (Layer 1)
execution/                   # directive → code map (Layer 3 manifest)
```

## Deployment

Vercel project: `manama-next`. Production branch: `main`. Preview deploys run on every push to `samson/port-artist-crawler`.

- `.npmrc` enforces `legacy-peer-deps=true`.
- Env vars: 43 keys live in Vercel project settings, mirrored from `.env.local`. Build will succeed without them but `/pitch` and any page that hits Firebase at module-import time will crash without `export const dynamic = 'force-dynamic'`.
- There is no `vercel.json` — Next.js App Router uses Vercel's auto-detection. The previous file was a Vite-era SPA rewrite that broke routing.

## Documentation

- `DESIGN_SYSTEM.md` — punk design tokens, component patterns, do/don't. Read before touching any UI.
- `HANDOFF.md` — Phase 1 handoff narrative.
- `SESSION_RECAP_2026-05-19.md` — today's session log (deploy recovery, audit fixes, design iterations).
- `CLAUDE.md` — agent instructions, env reference, service map.
- `directives/` — workflow SOPs.
- `~/audit/AUDIT-REPORT.md`, `~/audit/DEEP-INSIGHTS.md`, `~/audit/TATT-REALITY.md` — `/code-upgrade` audit findings from 2026-05-19.

## Open issues

- Pre-existing TypeScript errors in `src/app/api/v1/stencil/export/route.ts`, `src/app/api/v1/council/enhance/route.ts`, `src/app/api/v1/layers/decompose/route.ts`, `src/app/api/v1/match/semantic/route.ts`, and `src/app/page.tsx` (framer-motion `Variants` type). Don't block build.
- `src/features/Generate.jsx` is ~2000 lines — needs decomposition.
- Auth on customer-facing routes (`/login`, `/signup`, `/settings`) writes to `localStorage` only; not yet wired to Firebase Auth.
- New `/artists`, `/matches`, `/designs`, `/book`, `/pricing` pages use hardcoded inline mock data — no service-layer calls yet.
- `react-tinder-card@1.6.4` peer-dep conflict is papered over with `legacy-peer-deps`; proper fix is to upgrade or replace the lib.
- Forge studio (`Generate.jsx`) and the new punk shell render two headers in some flows — track on the PR.
