# TatT

AI-powered tattoo design platform. Council-enhanced prompts run through SDXL or Vertex Imagen to produce multi-layer RGBA output, then artists are matched via a hybrid Supabase pgvector + Neo4j graph search.

## Current state

Production runs on `main`, deployed to Vercel (project `manama-next`). The Next.js 16 punk-design migration is done and live; the earlier 71-day deploy outage (Mar 9 → May 19 2026) is history. Auth is wired to Firebase (email + Google), the Forge studio loads (ToastProvider crash fixed, PR #33), and a 6,434-artist national dataset has been scraped (`data/national-artists-2026-07-15.json`).

Biggest remaining gap: the customer-facing pages still read the **100 synthetic seed artists** in `src/data/artists.json`, not the real scraped dataset — swapping that in is the next high-value change.

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
    login/, signup/          # Firebase Auth UI (email + Google via authService)
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
    generate/                # Forge studio (Generate.jsx is ~1,750 lines, due for split)
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
- `docs/archive/HANDOFF.md` — Phase 1 handoff narrative.
- `docs/archive/SESSION_RECAP_2026-05-19.md` — session log (deploy recovery, audit fixes, design iterations).
- `CLAUDE.md` — agent instructions, env reference, service map.
- `directives/` — workflow SOPs.
- `~/audit/AUDIT-REPORT.md`, `~/audit/DEEP-INSIGHTS.md`, `~/audit/TATT-REALITY.md` — `/code-upgrade` audit findings from 2026-05-19.

## Open issues

- **App runs on seed data, not the real scrape.** `src/lib/artists.ts` loads `src/data/artists.json` (100 synthetic artists, placeholder-free but not real). The scraped 6,434-artist dataset in `data/national-artists-2026-07-15.json` is not yet wired into `/artists`, `/matches`, or the match API.
- **~41 TypeScript errors**, masked by `ignoreBuildErrors: true` in `next.config.ts`. Concentrated in `src/services/fetchWithAbort.ts` (25), plus `useImageGeneration.ts`, `generate/stencil/page.tsx`, and assorted services. (The five api/v1 routes the old README named are now clean.)
- **`src/features/Generate.jsx` is ~1,750 lines** — still monolithic, due for decomposition.
- **`react-tinder-card@1.6.4` peer-dep conflict** — wants `@react-spring/web@^9`, project is on `^10`; papered over with `legacy-peer-deps` (enforced by `.npmrc`). Proper fix is to upgrade or replace the lib.
- **Neo4j serves dual schemas** (seed + national) after PR #34; match queries handle both. Confirm this is intended before consolidating.
