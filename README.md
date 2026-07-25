# TatT

AI-powered tattoo design platform. Council-enhanced prompts run through SDXL or Vertex Imagen to produce multi-layer RGBA output, then artists are matched via a hybrid Supabase pgvector + Neo4j graph search.

## Current state

Production runs on `main`. Live matching against the real scraped artist graph (Neo4j) is deployed and confirmed working at `tatt-app.vercel.app/matches` — this replaced the earlier synthetic 100-artist seed data for the matching flow. `/artists` and `/book` are also live on the graph (`src/lib/artists-graph.ts`), and `/artists` cards render real, self-hosted portfolio photos uploaded to Google Cloud Storage by `scripts/host-artist-images.mjs` (not the expiring scraped CDN URLs). The homepage and `/artists` are public; auth is a soft, action-triggered gate (Firebase email + Google) — a sign-in prompt/modal appears when an unauthenticated user hits a protected action (booking, saving, generating), not a hard route redirect. Login/signup use real Firebase Auth (not localStorage).

The live artist graph holds **8,949 real scraped artists** (`data/cleanup-report.json`) across a national dataset — the earlier 100 synthetic seed artists have been deleted from the graph. `src/data/artists.json` (the 100-artist synthetic set) is now orphaned — nothing in the app reads it (the homepage uses the real `featured-artists.json`); it can be deleted.

Portfolio photos are real: sourced from each artist's Instagram via Apify, then downloaded and **self-hosted on Google Cloud Storage** by `scripts/host-artist-images.mjs` (not the expiring scraped CDN URLs), and written back onto the graph as `Artist.portfolioImages`. A full roster sweep ran on 2026-07-20 (~19k images across thousands of artists, still finalizing). **Style tags are not yet populated** — Instagram bios don't list styles; that's the pending vision pass (issue #63). A separate deterministic shop-site enrichment pipeline exists in the sibling `~/tatt-scraper` repo (`execution/`) as a complementary source. See `TODO.md` for status. The overnight crew (`CREW.md`) works this repo's issue queue in two lanes — `pr-only` (code tickets, PRs only, no paid/data jobs) and `autonomous` (may also merge and run capped data/spend jobs) — currently in `pr-only` mode.

`tatt-app` is the only Vercel project linked to this repo. Two earlier projects that also deployed it — `manama-next` and `generous-success` — were disconnected and deleted respectively (verified 2026-07-21; see `TODO.md`).

**Payments (Stripe, `stripe-launch-deposits`).** Booking deposits run on Stripe Connect via `/api/checkout`. If the artist is **claimed** (has a connected account with charges enabled) the deposit is a destination charge that routes to them, minus TatT's ~10% platform fee (`PLATFORM_FEE_BPS`). If the artist is **unclaimed** (most of the scraped graph), the deposit is instead collected to the platform and **held** (no `transfer_data`, `metadata.depositState='held'`), recorded as a `:BookingRelay` node in Neo4j, and the artist is sent a claim link. When they finish onboarding — via the deposit-driven link or self-serve `v1/connect/claim` → `v1/connect/claim-complete` — held funds are released to them with separate charges & transfers (`source_transaction` = the original charge, `amount` = gross − platform fee). If the artist doesn't claim within the hold window (`DEPOSIT_HOLD_DAYS`, default 7), a daily cron (`/api/cron/expire-deposits`, gated by `CRON_SECRET`, wired in `vercel.json`) fully refunds the customer (TatT absorbs the Stripe fee). A separate SaaS-subscription lane bills artists via Stripe Billing (`STRIPE_PRICE_ARTIST_SUB`), with status persisted onto the `Artist` node from subscription webhooks. Design rationale is in `docs/adr/0005`–`0008`.

## Tech stack

- **Framework**: Next.js 16 (App Router, Turbopack disabled — webpack build)
- **Frontend**: React 19, TypeScript, Tailwind CSS 3
- **State**: Zustand with localStorage persistence
- **AI generation**: Replicate (SDXL), Google Vertex AI (Imagen 3, Gemini 2.0 Flash)
- **Council** (prompt enhancement): Vertex Gemini → OpenRouter fallback
- **Vector search**: Supabase pgvector with Vertex text embeddings
- **Graph DB**: Neo4j Aura — 9-node model (`State`/`City`/`Shop`/`Artist`/`Style`/`Tattoo`/`Instagram`/`Tag`/`Website`), see `NEO4J_MIGRATION.md`
- **Document storage**: Firestore (user designs, versions, per-user config)
- **Real-time**: Firebase Realtime Database
- **Storage**: Google Cloud Storage
- **Auth**: Firebase Auth (email + Google), Bearer ID tokens on protected API routes
- **Deploy**: Vercel (canonical project: `tatt-app`)

## Quick start

```bash
npm install --legacy-peer-deps   # react-tinder-card peer dep conflict; see .npmrc
cp .env.example .env.local       # fill in keys per CLAUDE.md
npm run dev                      # http://localhost:3000
```

The `--legacy-peer-deps` flag is required and enforced by `.npmrc` for CI parity. Without it, `react-tinder-card@1.6.4` (wants `@react-spring/web@^9`) refuses to install against the project's `^10`.

Other scripts:

- `npm run build` — Next production build (webpack, not turbopack)
- `npm run server` — legacy Express proxy (`server.js`) for local dev; not used in production, where Next.js API routes under `src/app/api/` handle everything
- `npm test` — vitest, ~20 test files across services/components/lib
- `npm run lint` — ESLint
- `npm run security:secrets` — scans tracked files for committed secrets; also runs in CI on every push/PR

## Project structure

```
src/
  app/                       # Next App Router
    page.tsx                 # marketing landing
    about/, philosophy/      # marketing pages
    artists/                 # artist directory + [slug] profile (live Neo4j graph, GCS-hosted portfolio images)
    book/, bookings/         # booking flow + user's booking list
    designs/                 # user's saved designs (localStorage)
    generate/                # studio entry + /generate/stencil reference UI
    journey/, smart-match/, swipe/, demo/, dashboard/, gallery/, visualize/  # additional customer-facing flows
    legal/{terms,privacy}/   # static legal pages
    login/, signup/          # Firebase Auth UI (email + Google via authService)
    matches/                 # live semantic + graph matching (wired to real data, PR #46)
    pitch/                   # investor landing (force-dynamic — inits Firebase client SDK)
    pricing/                 # tiered pricing
    settings/                # account settings
    share/                   # shared-design view links
    api/v1/                  # council, generate, match, layers, stencil, storage, AR, booking routes
    api/health/, api/health/council/  # health probes
  components/
    studio/                  # StudioShell, PunkFooter — punk design system primitives
    punk/                    # punk design system components (ArtistCard, etc.)
    auth/                    # SignInPromptGate, AuthModal
  features/
    generate/                # Forge studio (Generate.jsx is ~1,750 lines, due for split)
    match-pulse/             # hybrid RRF artist matching (Neo4j + Supabase)
    inpainting/, stencil/    # selective editing + edge-detection PDF export
  services/                  # councilService, generationService, firebase-match-service, etc.
  store/                     # Zustand stores (useForgeStore, useAuthStore, etc.)
  lib/
    api-auth.ts              # Firebase Bearer token auth — fails closed if unauthenticated
    api-route-security.ts    # security classification for every API route; api-route-security.test.ts
                              # fails the build if a route is added without one
    client-api-auth.ts       # client-side auth header helper; prompts sign-in on missing session
scripts/
  data_acquisition/          # national artist scraper (Places API + shop-site crawler)
  import-to-neo4j.js         # primary Neo4j importer — merge by default, --wipe to reset
  generate-neo4j-cypher.js   # generates standalone .cypher import scripts — merge by default, --wipe to reset
  generate-vertex-embeddings.js
  setup-supabase-vector-schema.js
directives/                  # SOPs in Markdown (Layer 1)
execution/                   # directive → code map (Layer 3 manifest)
docs/SECURITY_MODEL.md       # auth model, secret handling, incident response
NEO4J_MIGRATION.md           # 4-node → 9-node graph schema migration notes
TODO.md                      # shared cross-session work queue — read before starting work
```

## Deployment

Vercel project: `tatt-app` — the sole project linked to this repo as of 2026-07-21. Production branch: `main`.

- `.npmrc` enforces `legacy-peer-deps=true`.
- Env vars live in Vercel project settings. Build will succeed without them, but `/pitch` and any page that hits Firebase at module-import time will crash without `export const dynamic = 'force-dynamic'`.
- Live matching in prod requires `NEO4J_*`, `NEXT_PUBLIC_NEO4J_ENABLED`, and a matched `FRONTEND_AUTH_TOKEN`/`NEXT_PUBLIC_FRONTEND_AUTH_TOKEN` pair set in the deploy target's env — these are set in `tatt-app`'s prod env as of 2026-07-20.
- `vercel.json` exists only to declare the deposit-expiry cron (`/api/cron/expire-deposits`, daily `0 9 * * *`); routing otherwise relies on Next.js App Router auto-detection.
- Payments require `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (and `STRIPE_CONNECT_WEBHOOK_SECRET` for Connect account events), `PLATFORM_FEE_BPS`, `DEPOSIT_HOLD_DAYS`, `CRON_SECRET`, and `STRIPE_PRICE_ARTIST_SUB`; routes fail closed (503) when Stripe is unconfigured.
- Branch protection on `main` is blocked by GitHub's free-plan limits on private repos; see the working agreements in `TODO.md` for the fetch/reset discipline used in its place.

## Documentation

- `DESIGN_SYSTEM.md` — punk design tokens, component patterns, do/don't. Read before touching any UI.
- `CLAUDE.md` — agent instructions, env reference, service map.
- `docs/SECURITY_MODEL.md` — auth model (Firebase Bearer tokens, per-route classification, Cloud Tasks OIDC), secret handling, incident response.
- `NEO4J_MIGRATION.md` — graph schema history and the current 9-node model.
- `TODO.md` — shared, cross-session work queue. Read before starting work; update when you finish or discover work.
- `directives/` — workflow SOPs.
- `docs/archive/` — historical session logs and handoff narratives (dated, not current state).

## Open issues

- **Synthetic data is fully out of the app.** `/matches`, `/artists`, and `/book` all run on the live graph; the dead `ArtistsContent`/`ArtistProfileContent` components (the last synthetic readers) were deleted (#86), leaving `src/data/artists.json` orphaned and deletable. `/smart-match` and `/swipe` remain live but are orphaned from nav — link or retire is a product call (issue #59).
- **~39 TypeScript errors**, masked by `ignoreBuildErrors: true` in `next.config.ts`. Concentrated in `src/services/fetchWithAbort.ts` and a handful of other services/components — does not block build or deploy.
- **`src/features/Generate.jsx` is ~1,750 lines** — still monolithic, due for decomposition.
- **`react-tinder-card@1.6.4` peer-dep conflict** — wants `@react-spring/web@^9`, project is on `^10`; papered over with `legacy-peer-deps` (enforced by `.npmrc`). Proper fix is to upgrade or replace the lib.
- **Neo4j serves dual schemas** (the 9-node real-data model and a legacy seed model) — match queries handle both, see `NEO4J_MIGRATION.md`. Confirm this is still needed before consolidating.
- **Artist enrichment gap** — only ~1.5k of 8,949 real artists have style tags populated; the rest need enrichment from their scraped `sourcePages`. Tracked in `TODO.md` backlog, currently parked.
