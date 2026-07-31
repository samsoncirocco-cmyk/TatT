# CLAUDE.md - TatT AI Agent Instructions

## Project Overview

**TatT** is an AI-powered tattoo design platform that combines:
- **AI Tattoo Design Generation** — Council-enhanced prompts → SDXL/Vertex Imagen → multi-layer RGBA output
- **AR Preview** — Live camera compositing of a saved design onto a user-positioned overlay (drag/scale/rotate); no body tracking or depth estimation (ADR-0024)
- **Artist Matching** — Semantic search via Supabase vectors + Neo4j graph relationships + Firebase real-time updates

## Status: pre-launch, stealth

**TatT is not live.** There are no customers, no onboarded artists, and no real
transactions. Everything here is being built so it is *ready* when those exist —
not to keep a running service alive.

**How to judge severity.** A defect found in this repo is "this would be broken
at launch", not "someone is suffering right now". Nobody is. Write findings that
way: no "customers are losing money", no "an artist will email you tomorrow", no
incident framing. The useful question is *would this be wrong on day one*, not
*is this on fire*. Reserve urgency for the things below, which are real today.

**What IS live and does deserve weight:**

- **Spend.** Vertex, Replicate and OpenRouter calls cost real money against a
  real cap (`BUDGET_MAX_SPEND_CENTS`). An unmetered generation path is a genuine
  problem now, not at launch.
- **Third-party data.** A read-only production Neo4j count on 2026-07-30 found
  18,002 artist records. 7,511 have portfolio images attached — 68,532 image
  URLs total. The current scraper stores external source URLs rather than image
  files, but this repo also contains `scripts/host-artist-images.mjs`, an
  operator tool that downloads images into TatT's public GCS bucket. Production
  currently has 26 GCS-hosted portfolio URLs across 6 artists; the other 68,506
  URLs are external. The earlier claim that roughly 62,000 photos were all
  re-hosted is false, but "none are re-hosted" is also false. The artist/shop
  directory data itself is stored in production today, independent of launch.
  Public rendering of unclaimed portfolio images is separately controlled by
  `SHOW_UNCLAIMED_PORTFOLIOS`; do not claim its production value without
  checking it.
- **The deployed site is public.** tatttester.com, tatt-t.com and image2ink.com
  serve anyone who finds them.
- **Security gaps still get fixed properly** — but the framing is "close it
  before anyone can reach it", not "we are being exploited".

Being pre-launch lowers the urgency, not the standard. The work still has to be
right; it just isn't an emergency.

### Mission
Democratize custom tattoo design by lowering the barrier between idea and execution. Empower users to iterate quickly, visualize accurately, and connect with the right artists.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS 3.4 | Server components + client interactivity |
| **UI Libraries** | Framer Motion, Konva/React-Konva, Lucide Icons, react-tinder-card | Animations, canvas manipulation, swipe UX |
| **AI Generation** | Replicate (SDXL models), Google Vertex AI (Imagen 3, Gemini 2.0), OpenRouter (Claude, GPT-4) | Multi-model routing with fallbacks |
| **Council AI** | Vertex AI Gemini 2.0 Flash | Prompt enhancement via multi-agent simulation (Creative + Technical + Style) |
| **Vector Search** | Supabase (pgvector) | Semantic matching for artist portfolios (text-embedding-gecko-002) |
| **Graph Database** | Neo4j | Artist relationships, collaboration history, style hierarchies |
| **Real-time Sync** | Firebase Realtime Database | Live match updates, user presence |
| **Storage** | Google Cloud Storage (GCS) | Layer storage, design exports |
| **Deployment** | Vercel (Node serverless) | Global CDN, serverless functions |

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
npm test                   # Run vitest (~2200 tests across ~206 files)
npm run test:watch         # Watch mode

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
│  API Layer (Node runtime)               │
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

# Stripe — deposits (Connect), held-deposit refunds, artist SaaS billing
STRIPE_SECRET_KEY=sk_***                 # server only; routes fail closed (503) if unset/placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_*** # safe to expose (Stripe.js)
STRIPE_WEBHOOK_SECRET=whsec_***          # verifies /api/webhooks/stripe
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_***  # verifies Connect account.updated events
PLATFORM_FEE_BPS=1000                    # TatT take rate in basis points (1000 = 10%)
STRIPE_CURRENCY=usd
DEPOSIT_HOLD_DAYS=7                       # hold window before an unclaimed deposit auto-refunds
CRON_SECRET=***                          # bearer secret guarding /api/cron/expire-deposits
STRIPE_PRICE_ARTIST_SUB=price_***        # recurring Price id for the artist subscription

# Google Calendar — per-artist availability sync (see docs/google-calendar-setup.md)
GOOGLE_OAUTH_CLIENT_ID=***.apps.googleusercontent.com  # unset ⇒ every artist stays on booking requests
GOOGLE_OAUTH_CLIENT_SECRET=***           # server only
CALENDAR_TOKEN_ENCRYPTION_KEY=***        # base64 of 32 random bytes; seals every artist's refresh token
GOOGLE_CALENDAR_WRITE_ENABLED=false      # write-back to an app-created calendar; false everywhere until deliberate
```

**Booking model** (see `docs/adr/0027`): a booking is a **reservation** for an
artist whose Google Calendar is synced, and a **request** for everyone else —
resolved per artist on every render by `resolveBookingMode`, which fails closed
to "request". Reservation requires all of: a claimed profile, a live calendar
connection, published hours, a fresh free/busy read, and a writable hold store.
Picking a slot takes a 35-minute exclusive hold (`booking_holds`) and the Stripe
Checkout Session's `expires_at` is pinned to it, so Stripe refuses payment for a
lapsed reservation.

**Payment flows** (see `docs/adr/0005`–`0008`):
- **Booking fee** — the client pays a booking fee (`PLATFORM_FEE_BPS`, default 10% of the deposit) **on top** of the deposit; the artist keeps **100%** of the deposit (ADR 0007). The artist subscription lane exists but is dormant at launch.
- **Deposit, claimed artist** — destination charge; `application_fee_amount` = the booking fee, `transfer_data` → artist, so the artist receives the full deposit.
- **Deposit, unclaimed artist** — collected to the platform and HELD as a `:BookingRelay` node; released to the artist as the **full deposit** on claim via separate charges & transfers, or fully refunded to the customer after `DEPOSIT_HOLD_DAYS` by the daily `/api/cron/expire-deposits` cron.
- **Claim flow** — dual entry: the deposit-driven claim link, or self-serve `v1/connect/claim` → `v1/connect/claim-complete`; both converge on `transferHeldDeposits`.
- **Subscription** — artists are billed via Stripe Billing (`STRIPE_PRICE_ARTIST_SUB`); status is persisted onto the `Artist` node from subscription webhooks.

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
   - Open a PR against `main` (tatt-app is the sole Vercel project; the old
     `manama/next` flow is retired)
   - Vercel auto-deploys previews per branch
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

1. Read `directives/setup-local-dev.md` to get started
2. Explore `directives/generate-design.md` to understand the core workflow
3. Check `execution/README.md` to see how directives map to code
4. Run `npm run dev` and test the generation flow at `http://localhost:3000`

---

**Last Updated:** 2026-07-30
**Maintained by:** Samson via Hermes

---

## Engineering Quality Standards

All agents working in this repo must follow these rules. No exceptions.

### Core Philosophy (Karpathy Rules)

1. **Think Before Coding:** Analyze requirements deeply. If a request is ambiguous, stop and ask clarifying questions. Never make blind assumptions.
2. **Simplicity First:** Write clean, readable, and minimal code. Avoid over-engineering. If a senior engineer would find a solution unnecessarily complex, simplify it.
3. **Surgical Changes:** Make precise edits. Only modify lines directly relevant to the task. Avoid broad, messy, or cosmetic rewrites that bloat the Git diff.
4. **Goal-Driven Execution:** Work toward clear, verifiable success criteria (e.g., a passing unit test or specific compiler output). Iterate on errors until the goal is met.

### Development Workflow

**Phase 1 — Architecture & Alignment:**
- Do not jump straight into writing code.
- Analyze the existing files first.
- Present a high-level technical approach detailing pros, cons, and potential edge cases.
- Wait for human approval before implementing the chosen solution.

**Phase 2 — Micro-Incremental Implementation:**
- Break large features down into the smallest possible logical steps.
- Implement, run, and test one single micro-change at a time.
- Verify the change works before moving to the next block of logic.

**Phase 3 — Git & Commit Hygiene:**
- Keep Git diffs highly isolated and clean.
- Group changes into strictly atomic commits (one logical feature, fix, or step per commit).
- Ensure code builds and passes tests at every single commit checkpoint.
- Use precise, concise, and professional commit messages that describe what changed and why.

### Code Quality Guardrails

- **Self-Correction:** If a command or build fails, read the error stack trace completely, diagnose the root cause, and fix it systematically. Do not guess wildly.
- **Maintain Consistency:** Match the existing codebase's architecture, design patterns, naming conventions, and file structures exactly.
- **No Hallucinated Dependencies:** Do not invent or import external libraries unless explicitly instructed. Leverage built-in or already-installed tools first.
- **No Vibe Coding:** Treat this repository with rigorous engineering discipline, judgment, and taste.
- **Testing:** Run the full `npm test` suite once at session start (to establish a clean baseline — this is what catches stale `node_modules` and pre-existing breakage), and again after any change. Skip the redundant pre-change run on every subsequent commit within the same session. Run `npm run build` locally only when a change plausibly affects compilation (config, imports, types, new files) — for docs/TODO or one-line logic edits, skip it, since Vercel runs the identical production build on push anyway. The full suite is the merge gate — branch protection on `main` requires the CI checks (secret scan, JS + Python tests, demo build) to pass, and PR branches must be up to date with `main` — so never skip the after-change run.

### Worktrees & the Primary Checkout

Many agent sessions share the one primary checkout at `/Users/samson/TatT`.
Work in a **git worktree**, not in that checkout. Two sessions editing it at
once is exactly how changes end up uncommitted with no owner.

**A dirty tree in the primary checkout is a stop sign, not an obstacle.** Those
files are unsaved and exist nowhere else — not on GitHub, not on any branch.
Assume another session owns them.

- Never run `git checkout .`, `git restore`, `git stash`, `git clean`, or
  `git reset --hard` against the primary checkout.
- Never sweep someone else's unsaved files into your commit (`git add -A`,
  `git commit -a`).
- Never layer your edits on top of theirs.
- If your task needs those files, ask who owns the changes first.

The `SessionStart` hook in `.claude/hooks/dirty-tree-check.py` surfaces this
state at session start; it is silent when the tree is clean.
