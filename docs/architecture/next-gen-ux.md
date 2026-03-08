---
title: "TatT — Next-Gen UX Architecture"
date: 2026-03-08
author: paul (AI Architect)
tags: [architecture, tatt, next-gen-ux, yc-prep, multi-agent, do-it-now]
status: canonical
---

# TatT — Next-Gen UX Architecture

> **Think it. Ink it. Ship it.**
> This document synthesises the multi-agent role-specialisation framework, the `do-it-now` bypass pattern, and the full platform architecture into a single canonical reference. It is the source of truth for platform decisions from March 2026 onward.

---

## Table of Contents

1. [Strategic Context](#1-strategic-context)
2. [System Component Diagram](#2-system-component-diagram)
3. [API Contract Sketch](#3-api-contract-sketch)
4. [Database Schema Diff (Current → Target)](#4-database-schema-diff-current--target)
5. [CI/CD Flow](#5-cicd-flow)
6. [Role-Specialisation: Agent Mesh](#6-role-specialisation-agent-mesh)
7. [Do-It-Now Bypass — Platform Integration](#7-do-it-now-bypass--platform-integration)
8. [Phased Build Roadmap](#8-phased-build-roadmap)
9. [Open Issues & Infra Debt](#9-open-issues--infra-debt)

---

## 1. Strategic Context

TatT is a **three-sided marketplace**: consumers who want custom tattoo designs, artists who sell time and creativity, and an AI layer that unlocks both sides. The core UX insight from user research is this:

> *People don't know what they want until they see it on their body.*

Everything in this architecture flows from that constraint. The platform must collapse the feedback loop between **idea → visual → AR preview → artist match → booking** into a single, sub-5-minute experience.

### Current State (March 2026)

| Layer | Technology | Status |
|---|---|---|
| Frontend | Next.js 16 + React 19 + Tailwind v4 | ✅ Live (tatt-app.vercel.app) |
| Auth | Firebase Auth v12 + next-firebase-auth-edge | ✅ Working |
| AI Image Gen | Vertex AI Imagen 3 + Replicate (fallback) | ⚠️ Demo flags misconfigured |
| AR Preview | MindAR + Three.js on-device | ✅ Built, needs mobile QA |
| Artist Matching | Neo4j graph + Supabase pgvector (RRF fusion) | ⚠️ Neo4j connection failing |
| Canvas/Editor | Konva-based Forge with drag-and-drop layers | ✅ Working |
| LLM Council | OpenRouter multi-model prompt enhancement | ✅ Working |
| Backend API | Express + Next.js API routes (dual) | ⚠️ CORS issues, dual-host confusion |
| Storage | GCS (designs + layers) | ❌ GCS_BUCKET env missing |
| Observability | GCP Cloud Monitoring | ✅ Wired |

### North Star KPIs (18 months)

- 100K active users
- 50K paid subscribers ($9.99–$24.99/mo)
- 1,000 verified artists onboarded
- 1M+ designs generated
- $100K MRR → Series A trigger

---

## 2. System Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TATT PLATFORM                                      │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  CDN / EDGE LAYER  (Vercel Edge Network + Cloudflare)                    │  │
│  │  • Static asset caching   • Edge middleware (auth token verification)    │  │
│  │  • A/B test routing        • Rate-limit headers                          │  │
│  └───────────────────────────┬──────────────────────────────────────────────┘  │
│                               │                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  FRONTEND  (Next.js 16 App Router — tatt-app.vercel.app)                 │  │
│  │                                                                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │  │
│  │  │  /        │  │/generate │  │/visualize│  │ /artists │  │/journey  │ │  │
│  │  │ Landing   │  │ AI Forge │  │AR Preview│  │ Swipe+   │  │Onboarding│ │  │
│  │  │           │  │ Canvas   │  │ MindAR   │  │ SmartMatch│  │  Flow    │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │  │
│  │                                                                          │  │
│  │  State: Zustand stores (useAuthStore, useMatchStore, useDesignStore)     │  │
│  │  Anim:  Framer Motion + react-spring   DnD: @dnd-kit                    │  │
│  └───────────────────────────┬──────────────────────────────────────────────┘  │
│                               │  HTTPS / REST + WebSocket                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  API GATEWAY  (Next.js API Routes — /api/v1/*)                           │  │
│  │  Auth middleware → Firebase token verify → rate-limit (express-rate-limit)│  │
│  │                                                                          │  │
│  │   /v1/generate          /v1/council/enhance    /v1/ar/visualize          │  │
│  │   /v1/match/semantic    /v1/match/update       /v1/embeddings/generate   │  │
│  │   /v1/layers/decompose  /v1/stencil/export     /v1/storage/*             │  │
│  │   /v1/estimate          /v1/book               /v1/designs/share/*       │  │
│  │   /v1/tasks/generate    /api/health/*           /api/predictions/*       │  │
│  └───┬───────┬───────┬───────┬──────────┬──────────┬───────────────────────┘  │
│      │       │       │       │          │          │                            │
│  ┌───▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼───┐ ┌───▼──┐ ┌────▼────┐                     │
│  │ AI   │ │Match│ │Store│ │ LLM  │ │Canvas│ │ Tasks   │                     │
│  │Layer │ │Layer│ │Layer│ │Council│ │/Forge│ │ Queue   │                     │
│  └──────┘ └─────┘ └─────┘ └──────┘ └──────┘ └─────────┘                     │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  AI / ML LAYER                                                           │  │
│  │                                                                          │  │
│  │  ┌────────────────────┐    ┌─────────────────────────────────────────┐  │  │
│  │  │  Generation Router │    │  LLM Council (OpenRouter)               │  │  │
│  │  │  (generationRouter)│    │  ┌──────────┐ ┌──────────┐ ┌─────────┐ │  │  │
│  │  │                    │    │  │ GPT-4o   │ │ Claude   │ │Llama 3.3│ │  │  │
│  │  │  Style → Model Map │    │  │(detail)  │ │(narrative)│ │(speed)  │ │  │  │
│  │  │  styleModelMapping │    │  └──────────┘ └──────────┘ └─────────┘ │  │  │
│  │  │                    │    └─────────────────────────────────────────┘  │  │
│  │  │  Primary: Vertex   │                                                 │  │
│  │  │  Imagen 3          │    ┌─────────────────────────────────────────┐  │  │
│  │  │  Fallback:Replicate│    │  Vertex AI Embeddings (text-embed-005)  │  │  │
│  │  │  (SDXL, FLUX)      │    │  1408-dim multimodal → artist matching  │  │  │
│  │  └────────────────────┘    └─────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  MATCHING LAYER (Hybrid RRF Fusion)                                      │  │
│  │                                                                          │  │
│  │  ┌──────────────────────┐         ┌────────────────────────────────┐   │  │
│  │  │  Neo4j (Graph DB)    │         │  Supabase (pgvector)           │   │  │
│  │  │  AuraDB (cloud)      │         │  • artist_embeddings (1408-dim)│   │  │
│  │  │  • Artists → Styles  │   RRF   │  • cosine similarity search    │   │  │
│  │  │  • Styles → Tags     │ ──────► │  • tag-based filtering         │   │  │
│  │  │  • Artist ↔ Artist   │  fusion │                                │   │  │
│  │  │    (collab graph)    │         └────────────────────────────────┘   │  │
│  │  └──────────────────────┘                                               │  │
│  │                          ↓                                               │  │
│  │               Ranked artist results + match_score                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  STORAGE LAYER                                                           │  │
│  │                                                                          │  │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │  │
│  │  │  Firestore (NoSQL) │  │  GCS Bucket        │  │  Firebase RTDB   │  │  │
│  │  │  • user profiles   │  │  • generated images│  │  • real-time     │  │  │
│  │  │  • design metadata │  │  • canvas layers   │  │    match updates │  │  │
│  │  │  • bookings        │  │  • stencil exports │  │  • notifications │  │  │
│  │  │  • artist listings │  │  • AR models       │  │                  │  │  │
│  │  └────────────────────┘  └────────────────────┘  └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  INFRA / OBSERVABILITY                                                   │  │
│  │  GCP Project: tatt-pro  |  GCP Cloud Monitoring  |  Secret Manager      │  │
│  │  Workload Identity Federation (GitHub Actions WIF)                       │  │
│  │  Cloud Tasks (async generation queue)                                    │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Ownership (Agent Mesh)

| Component | Primary Owner | On-Call |
|---|---|---|
| Frontend routes, Zustand stores | SLED Codex Agent | paul |
| API routes (`/api/v1/*`) | SLED Codex Agent | paul |
| AI generation pipeline | SLED Codex Agent | paul |
| Neo4j schema + queries | SLED Codex Agent | — |
| Supabase pgvector schema | SLED Codex Agent | — |
| Firestore rules + schema | SLED Codex Agent | — |
| CI/CD pipeline | paul (Infra Saturday) | — |
| Vault docs + status reports | Second Brain Agent | paul |
| Salesforce (artist leads) | SFDC Agent | paul |

---

## 3. API Contract Sketch

All API routes follow the contract below. Any deviation is a bug, not a feature.

### Global Headers

```
Authorization: Bearer <firebase-id-token>   # required on all /api/v1/* routes
Content-Type: application/json
X-Request-ID: <uuid>                        # optional; returned in response for tracing
```

### Global Response Envelope

```jsonc
// Success
{
  "success": true,
  "data": { /* route-specific payload */ },
  "requestId": "abc-123",
  "durationMs": 342
}

// Error
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",          // machine-readable
    "message": "You've hit your design quota for this month.",  // human-readable
    "details": {}                           // optional: validation errors, etc.
  },
  "requestId": "abc-123"
}
```

### Core Endpoints

#### `POST /api/v1/generate`

Generate a tattoo design using the AI pipeline.

**Request:**
```jsonc
{
  "prompt": "small traditional rose on forearm, black and grey",
  "style": "traditional",                // enum: traditional | neo-traditional | realism | geometric | watercolor | minimalist | japanese | blackwork | tribal
  "size": "small",                       // enum: small | medium | large | full-sleeve
  "placement": "forearm",               // body placement hint for style optimisation
  "modelOverride": null,                 // optional: force specific model (vertex | replicate-sdxl | replicate-flux)
  "councilEnhance": true,               // run LLM council prompt enhancement before generation
  "layered": false                       // return multi-layer output for Forge editor
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "designId": "des_7f3a9c2b",
    "imageUrl": "https://storage.googleapis.com/tatt-designs/des_7f3a9c2b/main.png",
    "thumbnailUrl": "https://storage.googleapis.com/tatt-designs/des_7f3a9c2b/thumb.png",
    "layers": [],                        // populated if layered=true
    "model": "vertex-imagen-3",
    "enhancedPrompt": "Traditional American rose tattoo...",  // council output
    "costEstimate": { "usd": 0.04 },
    "generationMs": 3200
  }
}
```

**Error codes:** `QUOTA_EXCEEDED`, `INVALID_STYLE`, `GENERATION_FAILED`, `COUNCIL_TIMEOUT`

---

#### `POST /api/v1/council/enhance`

Run the LLM Council to enhance a raw user prompt into a generation-ready tattoo brief.

**Request:**
```jsonc
{
  "rawPrompt": "I want something tribal but modern",
  "style": "tribal",
  "placement": "shoulder",
  "contextTags": ["bold lines", "geometric influence"]
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "enhancedPrompt": "Bold Polynesian-influenced tribal tattoo...",
    "vibeChips": ["geometric", "bold", "ancestral"],
    "suggestedStyles": ["tribal", "geometric"],
    "councilVotes": {
      "gpt4o": "Polynesian-inspired...",
      "claude": "Geometric tribal fusion...",
      "llama": "Traditional tribal..."
    },
    "finalBlend": "weighted-majority"
  }
}
```

---

#### `POST /api/v1/match/semantic`

Find artists whose portfolio best matches a design or prompt.

**Request:**
```jsonc
{
  "designId": "des_7f3a9c2b",            // OR
  "prompt": "geometric blackwork",       // one of these required
  "embedding": null,                     // OR pass precomputed 1408-dim vector
  "filters": {
    "location": "Los Angeles, CA",
    "maxDistanceKm": 50,
    "stylesTags": ["blackwork", "geometric"],
    "priceRange": { "min": 150, "max": 400 }
  },
  "limit": 10,
  "returnExplanation": true
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "artists": [
      {
        "artistId": "art_9d2f1a",
        "name": "Mika Reyes",
        "studio": "Dark Matter Ink, LA",
        "matchScore": 0.93,
        "explanation": "Portfolio strong in blackwork geometric — 87% tag overlap",
        "profileUrl": "https://tatt-app.vercel.app/artists/art_9d2f1a",
        "portfolioSamples": ["url1", "url2"],
        "pricingEstimate": "$200–350 / session",
        "availability": "2026-03-15"
      }
    ],
    "matchMethod": "rrf-fusion",         // rrf-fusion | vector-only | graph-only
    "vectorScore": 0.91,
    "graphScore": 0.95
  }
}
```

---

#### `POST /api/v1/ar/visualize`

Return AR placement data for a design on a body part.

**Request:**
```jsonc
{
  "designId": "des_7f3a9c2b",
  "bodyPart": "forearm",                 // enum: forearm | upper-arm | shoulder | back | chest | leg | ankle | neck | hand
  "skinToneHint": "medium",             // optional: light | medium | dark (for opacity tuning)
  "format": "mindar-target"             // format expected by frontend AR engine
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "arTargetUrl": "https://storage.googleapis.com/.../ar-target.mind",
    "overlayImageUrl": "https://storage.googleapis.com/.../overlay.png",
    "anchorPoints": { "x": 0.5, "y": 0.3, "scale": 0.8 },
    "depthHint": "cylinder",
    "placementMs": 180
  }
}
```

---

#### `POST /api/v1/estimate`

Return cost and complexity estimate for a design before committing AI credits.

**Request:**
```jsonc
{
  "prompt": "Japanese sleeve with koi fish, waves, and cherry blossoms",
  "style": "japanese",
  "size": "full-sleeve",
  "layered": true
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "complexity": "high",
    "estimatedSessions": "8–12",
    "artistPriceRange": { "low": 2400, "high": 4800, "currency": "USD" },
    "aiCreditCost": { "usd": 0.12 },
    "generationTimeEstimate": "6–10 seconds",
    "warnings": ["Full sleeve designs perform best with layered=true for Forge editing"]
  }
}
```

---

#### `POST /api/v1/book`

Initiate a booking request between a user and an artist.

**Request:**
```jsonc
{
  "artistId": "art_9d2f1a",
  "designId": "des_7f3a9c2b",
  "requestedDate": "2026-03-20",
  "notes": "First tattoo, would love a consultation first",
  "depositAmount": 100                   // USD, platform captures via Stripe
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "bookingId": "bk_4c8e2f",
    "status": "pending_artist_confirm",
    "stripePaymentIntentId": "pi_abc123",
    "depositCaptured": false,           // captured on artist confirmation
    "estimatedConfirmationHours": 24,
    "messagingThreadId": "thread_8a2c"
  }
}
```

---

#### `POST /api/v1/embeddings/generate`

Generate and store a vector embedding for a design or prompt (used for matching and search).

**Request:**
```jsonc
{
  "text": "blackwork geometric sleeve with sacred geometry",
  "imageUrl": "https://storage.googleapis.com/...",  // optional: multimodal
  "entityType": "design",              // design | artist-portfolio | style-tag
  "entityId": "des_7f3a9c2b"
}
```

**Response:**
```jsonc
{
  "success": true,
  "data": {
    "embeddingId": "emb_2b9f4c",
    "dimensions": 1408,
    "storedIn": "supabase",
    "model": "text-embedding-005"
  }
}
```

---

### Rate Limits

| Tier | Designs/month | AR previews | Match searches | Bookings |
|---|---|---|---|---|
| Free | 3 | 10 | 20 | 1 |
| Creator ($9.99) | 30 | 100 | unlimited | 5 |
| Pro ($24.99) | 150 | unlimited | unlimited | unlimited |
| Artist (portal) | N/A | N/A | N/A | N/A |

Limits enforced via `src/lib/quota-tracker.ts` + Firestore quota documents per user.

---

## 4. Database Schema Diff (Current → Target)

### Supabase (pgvector) — Artist Embeddings

**Current schema:**
```sql
CREATE TABLE artist_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id   TEXT NOT NULL,
  embedding   VECTOR(1408),
  tags        TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**Target schema (add):**
```sql
-- Add: design embeddings table
CREATE TABLE design_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id   TEXT NOT NULL UNIQUE,
  user_id     TEXT NOT NULL,
  embedding   VECTOR(1408),
  style       TEXT,
  body_part   TEXT,
  tags        TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE INDEX ON design_embeddings USING ivfflat (embedding vector_cosine_ops);

-- Add: style similarity cache
CREATE TABLE style_similarity_cache (
  style_a     TEXT NOT NULL,
  style_b     TEXT NOT NULL,
  similarity  FLOAT NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (style_a, style_b)
);

-- Modify: artist_embeddings — add portfolio richness score
ALTER TABLE artist_embeddings
  ADD COLUMN portfolio_score   FLOAT DEFAULT 0,
  ADD COLUMN verified          BOOLEAN DEFAULT FALSE,
  ADD COLUMN location_point    GEOGRAPHY(POINT, 4326),
  ADD COLUMN price_floor_usd   INTEGER,
  ADD COLUMN price_ceiling_usd INTEGER,
  ADD COLUMN updated_at        TIMESTAMPTZ DEFAULT NOW();

-- Add: booking intent signals (for match ranking tuning)
CREATE TABLE match_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  artist_id   TEXT NOT NULL,
  design_id   TEXT,
  event_type  TEXT NOT NULL,  -- view | save | inquire | book | reject
  match_score FLOAT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON match_events (artist_id, event_type);
CREATE INDEX ON match_events (user_id, created_at DESC);
```

---

### Firestore — Collections

**Current collections:**
- `users/{uid}` — profile, quotaUsed, tier
- `designs/{designId}` — imageUrl, prompt, metadata
- `artists/{artistId}` — name, bio, styles, portfolioUrls

**Target additions:**
```
bookings/{bookingId}
  ├── userId: string
  ├── artistId: string
  ├── designId: string
  ├── status: "pending" | "confirmed" | "cancelled" | "completed"
  ├── stripePaymentIntentId: string
  ├── depositAmount: number
  ├── sessionDate: Timestamp
  ├── notes: string
  ├── messagingThreadId: string
  └── timestamps: { created, updated, confirmed, completed }

messagingThreads/{threadId}
  ├── participants: [userId, artistId]
  ├── bookingId: string
  └── messages (subcollection)/{messageId}
        ├── senderId: string
        ├── text: string
        ├── attachmentUrl: string | null
        └── sentAt: Timestamp

artistOnboarding/{artistId}
  ├── status: "applied" | "under_review" | "approved" | "rejected"
  ├── portfolioSubmitted: boolean
  ├── idVerified: boolean
  ├── stripeAccountId: string
  ├── reviewedBy: string (admin uid)
  └── timestamps: { applied, reviewed, approved }

reviews/{reviewId}
  ├── bookingId: string
  ├── userId: string
  ├── artistId: string
  ├── rating: 1–5
  ├── body: string
  ├── photoUrls: string[]
  └── createdAt: Timestamp
```

---

### Neo4j — Graph Schema

**Current nodes/relationships:**
```
(:Artist {id, name, styles[], tags[], city})
(:Style {name})
(:Tag {name})
(:Artist)-[:SPECIALIZES_IN]->(:Style)
(:Style)-[:HAS_TAG]->(:Tag)
```

**Target additions:**
```
// New node types
(:User {id, city, preferredStyles[]})
(:Design {id, style, tags[], embedding_id})
(:Booking {id, status, date})
(:Studio {id, name, city, lat, lng})

// New relationships
(:Artist)-[:WORKS_AT]->(:Studio)
(:User)-[:GENERATED]->(:Design)
(:User)-[:BOOKED]->(:Booking)
(:Booking)-[:WITH_ARTIST]->(:Artist)
(:Booking)-[:FOR_DESIGN]->(:Design)
(:Artist)-[:COLLABORATED_WITH]->(:Artist)   // built from shared-style signals
(:User)-[:INSPIRED_BY]->(:Design)            // saved/liked designs

// New relationship properties
(:Artist)-[:SPECIALIZES_IN {proficiency: 0.0–1.0}]->(:Style)

// Indexes
CREATE INDEX artist_city FOR (a:Artist) ON (a.city)
CREATE INDEX style_name FOR (s:Style) ON (s.name)
```

---

## 5. CI/CD Flow

```
Developer / Agent Push
         │
         ▼
  ┌─────────────┐
  │  GitHub PR  │
  │  (feature/*)│
  └──────┬──────┘
         │
         ▼
  ┌─────────────────────────────────────────────┐
  │  GitHub Actions — CI Pipeline               │
  │  Trigger: push to PR branch                 │
  │                                             │
  │  1. checkout + cache restore                │
  │  2. pnpm install --frozen-lockfile          │
  │  3. ESLint + TypeScript check               │
  │  4. Vitest unit tests (src/**/*.test.ts)    │
  │  5. GCP auth (Workload Identity Federation) │
  │     ├── WIF_PROVIDER (secret)               │
  │     └── WIF_SERVICE_ACCOUNT (secret)        │
  │  6. Build: next build                       │
  │  7. Smoke test: curl /api/health            │
  └──────┬──────────────────────────────────────┘
         │  PR merged → main
         ▼
  ┌─────────────────────────────────────────────┐
  │  Deploy Pipeline — main branch              │
  │                                             │
  │  Parallel:                                  │
  │  ┌─────────────────┐  ┌───────────────────┐ │
  │  │  Vercel Deploy  │  │  Cloud Run Deploy │ │
  │  │  (frontend +    │  │  (backend server  │ │
  │  │   API routes)   │  │   pangyo-prod)    │ │
  │  │                 │  │                   │ │
  │  │  vercel --prod  │  │  gcloud run       │ │
  │  │  [auto via      │  │  deploy --image   │ │
  │  │   GitHub int.]  │  │  gcr.io/tatt-pro/ │ │
  │  └────────┬────────┘  └────────┬──────────┘ │
  │           │                    │             │
  │           ▼                    ▼             │
  │     Vercel health         Cloud Run health   │
  │     /api/health           /api/health        │
  └──────┬──────────────────────────────────────┘
         │  Both healthy
         ▼
  ┌─────────────────────────────────────────────┐
  │  Post-Deploy                                │
  │  1. Invalidate Vercel cache (revalidate)    │
  │  2. Trigger embedding refresh (Cloud Tasks) │
  │  3. Notify #tatt-dev Slack channel          │
  │  4. Update CHANGELOG.md + version tag       │
  └─────────────────────────────────────────────┘
```

### Secrets Checklist (all must exist in GitHub repo secrets)

| Secret Name | Where Used | Current Status |
|---|---|---|
| `WIF_PROVIDER` | GCP auth in CI | ❌ MISSING — set up WIF |
| `WIF_SERVICE_ACCOUNT` | GCP auth in CI | ❌ MISSING |
| `GCP_PROJECT_ID` | Cloud Run deploy | ❌ MISSING |
| `VERCEL_TOKEN` | Vercel deploy | verify in repo settings |
| `VERCEL_ORG_ID` | Vercel deploy | verify in repo settings |
| `VERCEL_PROJECT_ID` | Vercel deploy | verify in repo settings |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Server-side Firebase | ❌ rotate + add |
| `NEO4J_URI` + `NEO4J_PASSWORD` | Railway/Cloud Run | ❌ rotate, add to CI |
| `REPLICATE_API_TOKEN` | Generation fallback | ✅ on Railway |

### Environment Variable Audit

**Required in production (Vercel) — currently misconfigured:**

```bash
# WRONG (Vite-style, Next.js ignores these):
VITE_DEMO_MODE=false
VITE_COUNCIL_DEMO_MODE=true

# CORRECT (Next.js reads these):
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_COUNCIL_DEMO_MODE=false
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tatt-pro

# Server-side only (NOT prefixed):
GCS_BUCKET=tatt-designs
GCP_PROJECT_ID=tatt-pro
NEO4J_URI=neo4j+s://...aura.io
NEO4J_PASSWORD=...
REPLICATE_API_TOKEN=...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
OPENROUTER_API_KEY=...
```

---

## 6. Role-Specialisation: Agent Mesh

The TatT platform is built and maintained by a **4-agent mesh**, not a single monolithic AI. This is the most important operational insight of the March 2026 architecture review.

```
┌──────────────────────────────────────────────────────────────────┐
│  paul (Orchestrator) — paul-macpro                               │
│  • Routes all tasks. Direct Samson interface.                    │
│  • Monitors agent health, surfaces blockers.                     │
│  • Handles heartbeat, Slack comms, briefings.                    │
│  • NEVER executes domain work directly.                          │
└───────────────────────┬──────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│ SLED Codex   │ │  SFDC Agent  │ │  2nd Brain Agent │
│   Agent      │ │              │ │                  │
│              │ │ Domain:      │ │ Domain:          │
│ Domain:      │ │ Salesforce   │ │ Vault content,   │
│ TatT code,   │ │ ops, quotes, │ │ MEMORY.md,       │
│ AI features, │ │ territories  │ │ concept docs,    │
│ E-Rate,      │ │              │ │ brain.6eyes.dev  │
│ voice caller │ │ Host:        │ │                  │
│              │ │ paul-macpro  │ │ Host: Killua     │
│ Host: Killua │ │ (isolated)   │ │ (overnight)      │
└──────────────┘ └──────────────┘ └──────────────────┘
```

### Why This Matters for TatT

Every TatT code change flows through the **SLED Codex Agent** running on Killua. This keeps:
- Codex sessions off paul-macpro (Killua has the hardware headroom)
- paul's context clean for routing and Samson conversations
- Vault docs from being polluted with code comments
- SFDC updates from triggering unrelated TatT deploys

**Spawn pattern for TatT work:**
```bash
bash tools/killua-codex.sh tatt-[feature-name] "[task description]"
# Logs to today's daily note under ## 🔧 Open Projects automatically
```

**Handoff triggers (paul → SLED Codex):**

Any message from Samson containing: `TatT`, `generate`, `AR`, `artist matching`, `council`, `Neo4j`, `Supabase`, `Forge`, `canvas`, `stencil`, `deploy TatT`, `fix TatT`

---

## 7. Do-It-Now Bypass — Platform Integration

The **`do-it-now`** bypass is not just a personal assistant feature — it is a **platform-level architectural pattern** that should be reflected in how TatT itself handles power-user actions.

### The Core Insight

> *Delegation has latency. When a user knows exactly what they want, every routing step is friction.*

This applies to the AI orchestration layer:

| Current (over-delegated) | Target (bypass-aware) |
|---|---|
| User types prompt → council always runs → adds 2–4s | If `directMode=true`, skip council, go straight to Imagen |
| Every generate hits quota check → Firestore read on each call | Quota cached in-memory (Redis/Vercel KV), sync async |
| AR always loads model detection → 3–5s cold start | Pre-warm AR model on `/generate` page load |
| Match search always hits Neo4j + Supabase → 1.2s avg | Add `quickMatch` mode: vector-only, <200ms |

### Bypass Routing in the API

```typescript
// src/services/generationRouter.ts — proposed bypass logic

export async function route(req: GenerateRequest): Promise<GenerateResponse> {
  const { directMode, councilEnhance, prompt, style } = req;

  // BYPASS: User is a Pro subscriber who explicitly opted out of council
  if (directMode && req.userTier === 'pro') {
    return await generateDirect(prompt, style);  // ~1.5s
  }

  // COUNCIL PATH: Default — enhance prompt then generate
  if (councilEnhance !== false) {
    const enhanced = await councilEnhance(prompt);  // ~1.5s
    return await generateDirect(enhanced.prompt, style);  // ~3s total
  }

  // FAST PATH: council disabled but not direct mode (e.g. Creator tier)
  return await generateDirect(prompt, style);  // ~1.5s, no enhancement
}
```

### "Do It Now" in the UI

Proposed Pro-tier UI element on the Generate page:

```
┌──────────────────────────────────────────────────────┐
│  [⚡ Direct Mode]  Skip AI council · Fastest results  │
│  Design generates in ~1.5s instead of ~4s            │
│  (Pro feature — less prompt refinement)              │
└──────────────────────────────────────────────────────┘
```

This mirrors paul's bypass pattern: Power users who know what they want should never wait for delegation overhead.

### Bypass in the Agent Mesh (Heartbeat Integration)

paul checks `memory/pending-wake-NOW.txt` at every heartbeat **before anything else**. For TatT specifically:

1. Samson writes `!now: redeploy TatT to Vercel` in Slack
2. Next heartbeat (~4h or manual trigger) picks up the bypass
3. paul executes inline: `cd repos/TatT && git push origin main` → triggers Vercel auto-deploy
4. Reports completion in Slack #tatt-dev

**The key property:** Bypass tasks are never queued, never delegated, never buffered. They go to the front of the line.

---

## 8. Phased Build Roadmap

### Phase 0 — Production Stabilisation (Week 1–2)
*Goal: Get every existing feature working in production, no exceptions.*

**P0 blockers to clear:**

| Task | Owner | ETA |
|---|---|---|
| Fix `VITE_*` → `NEXT_PUBLIC_*` env vars | SLED Codex | 1h |
| Set `NEXT_PUBLIC_DEMO_MODE=false` in Vercel | paul (inline) | 15m |
| Create GCS bucket `tatt-designs`, add `GCS_BUCKET` env | paul (inline) | 30m |
| Rotate all secrets (service account, Neo4j, Replicate) | paul → SLED Codex | 2h |
| Configure GitHub WIF secrets for CI/CD | paul (Infra Saturday) | 1h |
| Commit local canvas service fixes from paul-macpro | paul (inline) | 30m |
| Fix Neo4j AuraDB connection (check encryption settings) | SLED Codex | 1h |
| Redeploy to `tatt-app.vercel.app` as canonical URL | paul (inline) | 15m |

**Definition of done:** `/api/health/startup` returns 200 with all services green.

---

### Phase 1 — Core UX Polish (Weeks 3–6)
*Goal: YC Demo Day-ready. Every feature demoed live, nothing mocked.*

**Features:**

| Feature | Description | Effort |
|---|---|---|
| Gallery page | `/gallery` route with user's saved designs, shareable links | M |
| Design sharing | `/api/v1/designs/share` → public URL with OG metadata | S |
| Mobile AR QA | Test MindAR on iOS + Android, fix scaling/anchor bugs | L |
| Artist profile pages | Full `/artists/[id]` pages with portfolio grid, booking CTA | M |
| Booking flow v1 | Request → artist confirm → Stripe deposit capture | L |
| Review system | Post-booking review UI + Firestore schema | M |
| Quota dashboard | Show users remaining designs + upgrade path | S |
| `directMode` toggle | Pro-tier bypass for council (see §7) | S |

**KPIs for Phase 1 exit:**
- All routes return 200 in production
- End-to-end flow: generate → AR → match → book works without manual intervention
- 10 beta artists onboarded with real profiles

---

### Phase 2 — Artist Marketplace (Months 2–3)
*Goal: Revenue-generating. First real bookings processed.*

**Features:**

| Feature | Description | Effort |
|---|---|---|
| Artist onboarding portal | Self-service application, portfolio upload, ID verify | XL |
| Stripe Connect | Artist payouts, platform commission (15%), deposit handling | XL |
| Messaging system | In-app threads between user and artist (Firebase RTDB) | L |
| Calendar integration | Artist availability → iCal sync | M |
| Artist analytics | Views, matches, conversions, earnings dashboard | L |
| Neo4j `COLLABORATED_WITH` | Build collaboration graph from shared booking history | M |
| Featured listings | Artist paid placement in match results | M |
| Style model fine-tuning | Use generated + rated designs to improve style routing accuracy | XL |

**KPIs for Phase 2 exit:**
- 50 verified artists live
- 100 completed bookings
- $5K GMV processed

---

### Phase 3 — Growth Engine (Months 4–6)
*Goal: Viral distribution + retention loops.*

**Features:**

| Feature | Description | Effort |
|---|---|---|
| Social sharing | One-tap TikTok/Instagram share with TatT watermark | M |
| Design collections | Curated galleries by style, era, trend | M |
| Artist following | Follow artists, notification on new portfolio additions | M |
| "Ink the look" | Upload reference photo → generate similar tattoo style | XL |
| Convention mode | Geo-fenced artist discovery at tattoo conventions | L |
| Referral program | User invites → free design credits | M |
| SEO landing pages | `/styles/[style]` static pages for organic traffic | M |
| Push notifications | Mobile PWA notifications for booking updates, new matches | L |

**KPIs for Phase 3 exit:**
- 10K MAU
- 15% week-over-week user growth
- 2.5% free → paid conversion rate

---

### Phase 4 — Platform Expansion (Months 7–12)
*Goal: Beyond tattoos. Body art ecosystem.*

**Features:**

| Feature | Description | Effort |
|---|---|---|
| Expo mobile app | Native iOS + Android (stubbed, needs real screens) | XL |
| Piercing marketplace | Expand matching to piercing artists | L |
| Body paint / henna | Temporary art as intro product for non-committed users | M |
| Studio booking | Book studios (not just individual artists) | L |
| AI style transfer | Apply your design to real reference tattoo photos | XL |
| International markets | Multi-currency, locale-aware artist matching | L |
| Insurance integration | Tattoo-specific liability coverage embedded in booking | XL |
| B2B studio tools | Studio management SaaS ($99–299/mo) | XL |

---

### Roadmap Timeline View

```
Mar 2026    Apr 2026    May 2026    Jun 2026    Jul–Sep     Oct–Mar
────────────────────────────────────────────────────────────────────
│Phase 0│                                                          
    │Phase 1 (YC Demo Day target)│                               
                │Phase 2 — Artist Marketplace│                  
                                │Phase 3 — Growth│             
                                            │Phase 4 (Expansion)│
```

---

## 9. Open Issues & Infra Debt

Issues that must not be carried past Phase 1:

| # | Issue | Severity | Owner |
|---|---|---|---|
| 1 | `firebase-service-account.json` committed to public repo | P0 🔥 | paul |
| 2 | `VITE_*` env vars ignored by Next.js — demo mode always on | P0 🔥 | paul |
| 3 | Dual deployment (Cloud Run + Railway) causing CORS split | P0 🔥 | SLED Codex |
| 4 | `GCS_BUCKET` not set — image uploads fail silently | P0 🔥 | paul |
| 5 | GitHub Actions CI secrets not configured | P0 🔥 | paul (Infra Sat) |
| 6 | Primary Vercel URL (tat-t-3x8t) returns 404 | P1 | paul |
| 7 | Gallery page 404 | P1 | SLED Codex |
| 8 | Supabase project possibly paused (free tier) | P1 | paul |
| 9 | Neo4j encryption mismatch | P1 | SLED Codex |
| 10 | Cost estimator endpoint not deployed to Vercel | P1 | SLED Codex |
| 11 | Canvas service thumbnail timeout fixes uncommitted | P2 | paul |
| 12 | No Sentry / error monitoring | P2 | SLED Codex |
| 13 | `quota-tracker.ts` doesn't cache — Firestore read per request | P2 | SLED Codex |
| 14 | No `/gallery` route | P2 | SLED Codex |

---

## Appendix: Key File Locations

| Purpose | Path |
|---|---|
| Generation router | `src/services/generationRouter.ts` |
| Style → model mapping | `src/utils/styleModelMapping.js` |
| Model routing rules | `src/config/modelRoutingRules.js` |
| LLM Council | `src/services/openRouterCouncil.js` |
| Match (RRF fusion) | `src/services/matchService.ts` |
| Firebase match service | `src/services/firebase-match-service.ts` |
| Vertex embeddings | `src/services/vertex-embedding-service.ts` |
| GCS service | `src/services/gcs-service.js` |
| Canvas / Forge | `src/services/canvasService.ts` |
| Stencil export | `src/services/stencilService.ts` |
| Cost estimator | `src/services/costEstimatorService.ts` |
| Rate limiting | `src/lib/rate-limit.ts` |
| Quota tracking | `src/lib/quota-tracker.ts` |
| AR visualize | `src/app/api/v1/ar/visualize/route.ts` |
| Deploy directive | `directives/deploy.md` |
| CI config | `.github/workflows/` (to be created) |
| Cloud Build | `cloudbuild.yaml` |

---

*Document generated by paul (subagent) · 2026-03-08 · Session: build-overnight-architecture-plan*
*Next review: Phase 1 exit (estimated late March 2026)*
