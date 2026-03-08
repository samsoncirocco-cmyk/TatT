# TatT — Next-Gen UX Architecture
**Document Version:** 1.0  
**Date:** 2026-03-08  
**Author:** paul (AI co-pilot)  
**Status:** Active Design Reference  
**Audience:** Founding team, future CTO, YC technical reviewers

---

> **Key Insight Framing**  
> Two patterns from the agent-orchestration layer apply directly to TatT's product UX:
>
> 1. **"Do it now" bypass** — Skip delegation overhead when the user already knows what they want. In TatT, this means surfacing a zero-friction direct-generation path that skips the Council pipeline when the user's intent is clear.
> 2. **Role-specialisation** — The LLM Council (Creative Director / Technical Expert / Style Specialist) is the product's core differentiator. Each role has a narrow, well-defined job. Specialisation beats generalism at every quality benchmark.
>
> This document makes both patterns first-class architectural concerns throughout the stack.

---

## Table of Contents

1. [System Component Diagram](#1-system-component-diagram)
2. [The Council Pipeline (Role-Specialisation Deep Dive)](#2-the-council-pipeline-role-specialisation-deep-dive)
3. ["Do It Now" Fast-Path — Bypass Architecture](#3-do-it-now-fast-path--bypass-architecture)
4. [API Contract Sketch](#4-api-contract-sketch)
5. [DB Schema Diff (Current → Next-Gen)](#5-db-schema-diff-current--next-gen)
6. [CI/CD Flow](#6-cicd-flow)
7. [Phased Build Roadmap](#7-phased-build-roadmap)
8. [Open Risks & Mitigations](#8-open-risks--mitigations)

---

## 1. System Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER'S DEVICE                                      │
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                     TatT SPA  (React 19 + Next.js 16)                  │   │
│   │                                                                         │   │
│   │  ┌─────────┐  ┌───────────────┐  ┌──────────┐  ┌────────┐  ┌───────┐  │   │
│   │  │  Home   │  │  Forge Studio │  │  AR Viz  │  │Artists │  │Library│  │   │
│   │  │         │  │  (Generate)   │  │          │  │(Match) │  │       │  │   │
│   │  └─────────┘  └───────┬───────┘  └────┬─────┘  └───┬────┘  └───────┘  │   │
│   │                       │               │             │                   │   │
│   │  ┌────────────────────┴───────────────┴─────────────┴─────────────┐    │   │
│   │  │           Client-Side State (Zustand + React Query)            │    │   │
│   │  │  useGenerationStore · useMatchStore · useAuthStore             │    │   │
│   │  └─────────────────────────────────────────────────────────────────┘    │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│            │ HTTPS + WebSocket                                                   │
└────────────┼────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY LAYER                                    │
│                                                                                 │
│   ┌──────────────────────────────────┐   ┌──────────────────────────────────┐  │
│   │   Next.js API Routes (Vercel)    │   │   Express Proxy (Railway)        │  │
│   │   /api/v1/*                      │   │   server.js                      │  │
│   │                                  │   │                                  │  │
│   │  • /generate (standard path)     │   │  • Replicate webhook receiver    │  │
│   │  • /generate/fast  ← BYPASS      │   │  • Neo4j query proxy             │  │
│   │  • /council/enhance              │   │  • Cloud Tasks consumer          │  │
│   │  • /council/stream  ← SSE        │   │  • Rate limiting (express-rl)    │  │
│   │  • /match/semantic               │   │  • Auth middleware + RBAC        │  │
│   │  • /match/swipe-rank             │   │  • Layer upload multipart        │  │
│   │  • /stencil/export               │   │  • /api/health + /health/startup │  │
│   │  • /layers/decompose             │   │                                  │  │
│   │  • /estimate                     │   └───────────────┬──────────────────┘  │
│   │  • /storage/upload               │                   │                     │
│   │  • /storage/signed-url           │                   │                     │
│   │  • /tasks/generate               │                   │                     │
│   └──────────────┬───────────────────┘                   │                     │
└──────────────────┼────────────────────────────────────────┼────────────────────┘
                   │                                        │
          ┌────────┴──────────────────┐                    │
          ▼                           ▼                    ▼
┌──────────────────┐  ┌─────────────────────────┐  ┌──────────────┐
│  AI / ML Tier    │  │  Data / Storage Tier     │  │ Graph Tier   │
│                  │  │                          │  │              │
│  ┌────────────┐  │  │  ┌────────────────────┐  │  │  ┌────────┐  │
│  │ Vertex AI  │  │  │  │ Supabase           │  │  │  │ Neo4j  │  │
│  │ • Imagen 3 │  │  │  │ • PostgreSQL       │  │  │  │ Artist │  │
│  │ • Gemini   │  │  │  │ • pgvector (4096d) │  │  │  │ Graph  │  │
│  │   2.0 Flash│  │  │  │ • Realtime WS      │  │  │  │ Nodes/ │  │
│  │ • text-    │  │  │  │ • Auth + RLS       │  │  │  │ Rels   │  │
│  │   embed-   │  │  │  └────────────────────┘  │  │  └────────┘  │
│  │   005 768d │  │  │                          │  │              │
│  └────────────┘  │  │  ┌────────────────────┐  │  └──────────────┘
│                  │  │  │ Firestore          │  │
│  ┌────────────┐  │  │  │ • artist_embeddings│  │
│  │ Replicate  │  │  │  │   (768d vectors)   │  │
│  │ • SDXL     │  │  │  │ • design_library   │  │
│  │ • DreamSh. │  │  │  │ • match_history    │  │
│  │ • AnimeXL  │  │  │  └────────────────────┘  │
│  │ • Flash Art│  │  │                          │
│  │ • Blackwork│  │  │  ┌────────────────────┐  │
│  └────────────┘  │  │  │ GCS Buckets        │  │
│                  │  │  │ • generated-designs│  │
│  ┌────────────┐  │  │  │ • stencil-exports  │  │
│  │ OpenRouter │  │  │  │ • layer-segments   │  │
│  │ • Claude   │  │  │  └────────────────────┘  │
│  │   3.5 Son. │  │  │                          │
│  │ • GPT-4T   │  │  │  ┌────────────────────┐  │
│  │ • Gemini   │  │  │  │ Firebase RTDB      │  │
│  │   Pro 1.5  │  │  │  │ • auth sessions    │  │
│  └────────────┘  │  │  │ • realtime signals │  │
│                  │  │  └────────────────────┘  │
└──────────────────┘  └──────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
          ┌──────────────────┐      ┌─────────────────────┐
          │ Google Cloud     │      │ Observability        │
          │ Tasks            │      │                      │
          │ (async queues)   │      │ • Cloud Monitoring   │
          │ • generation     │      │ • performanceMonitor │
          │   jobs           │      │ • budget alerts      │
          │ • email delivery │      │ • Secret Manager     │
          └──────────────────┘      └─────────────────────┘
```

### Key Topology Decisions

| Decision | Current | Next-Gen Target |
|---|---|---|
| Auth boundary | Firebase + Supabase split | Consolidate to Supabase Auth + Firebase for RTDB only |
| Image model routing | Client-side JS (generationRouter.ts) | Server-side edge function — hide model keys |
| Council calls | Client → OpenRouter direct | Server-side SSE stream (keys never leave server) |
| Fast-path bypass | None — all requests go through Council | `/generate/fast` skips Council, returns in <5s |
| Realtime | Supabase Realtime (WebSocket) | Keep + add SSE stream for Council deliberation steps |

---

## 2. The Council Pipeline (Role-Specialisation Deep Dive)

> **Insight:** The LLM Council is the product moat. No competitor routes different LLM roles to specialised models with domain-specific system prompts fused with anatomical + aesthetic knowledge. This section specifies how to make it production-grade.

### 2.1 Current State

```
User idea
    │
    ▼
buildCouncilSystemPrompt()
    │  (bodyPart → anatomicalFlow token)
    │  (isStencilMode → stencilRule)
    │
    ▼  parallel fan-out (OpenRouter)
    ├─→ [Creative Director]  claude-3.5-sonnet   → base enhanced prompt
    ├─→ [Technical Expert]   gpt-4-turbo          → technical refinements
    └─→ [Style Specialist]   gemini-pro-1.5       → style + cultural accuracy
    │
    ▼
Consensus aggregation (client-side)
    │
    ▼
{ simple, detailed, ultra } variants → user selects → image generation
```

### 2.2 Next-Gen: Streaming Council with Dedicated Roles

Each council member gets a **narrower, more specialised prompt** and the deliberation is streamed to the UI in real time:

```
User idea + context
    │
    ▼
/api/v1/council/stream  (SSE endpoint)
    │
    │  Stage 1 — Parallel (150ms deadline)
    ├──→ ROLE: Creative Director (claude-3.5-sonnet)
    │        System: "You are a Senior Tattoo Artistic Director.
    │                 Your ONLY job: cinematic composition + emotional resonance.
    │                 Output: ONE paragraph, max 4 sentences."
    │        → emits SSE event: { role: "creative", chunk: "..." }
    │
    ├──→ ROLE: Technical Expert (gpt-4-turbo)
    │        System: "You are a Professional Tattoo Feasibility Analyst.
    │                 Your ONLY job: flag ink-bleeding risks, line-weight issues,
    │                 skin-tone compatibility, and stencil transfer constraints.
    │                 Output: bullet list, max 5 items."
    │        → emits SSE event: { role: "technical", chunk: "..." }
    │
    └──→ ROLE: Style Specialist (gemini-pro-1.5)
             System: "You are a Tattoo Style & Cultural Accuracy Specialist.
                      Your ONLY job: ensure style vocabulary is authentic
                      (e.g., irezumi ≠ neo-traditional; blackwork ≠ fineline).
                      Output: corrected style tokens + rationale, max 3 lines."
             → emits SSE event: { role: "style", chunk: "..." }
    │
    │  Stage 2 — Sequential (runs after all Stage 1 responses collected)
    ▼
ROLE: Prompt Synthesiser (gemini-2.0-flash — fast, cheap)
    System: "You are a Master Prompt Engineer for tattoo image generation.
             You receive 3 council opinions. Synthesise into 3 prompt variants:
             SIMPLE / DETAILED / ULTRA.
             Inject COUNCIL_SKILL_PACK tokens:
               - negativeShield (always)
               - anatomicalFlow[bodyPart]
               - aestheticAnchors
               - positionalInstructions if multi-subject
             Return JSON."
    → emits SSE event: { role: "synthesiser", variants: { simple, detailed, ultra }, negativePrompt }
    │
    ▼
Client receives stream → animated Council Discussion UI → user selects variant
    │
    ▼
Model Router (server-side) → Image Generation Provider
```

### 2.3 Role Skill Matrix

| Role | Model | Skill Tokens | Max Tokens | Deadline |
|---|---|---|---|---|
| Creative Director | `claude-3.5-sonnet` | artisticVision, composition | 500 | 4s |
| Technical Expert | `gpt-4-turbo` | feasibility, inkSafety | 300 | 3s |
| Style Specialist | `gemini-pro-1.5` | styleVocabulary, cultural | 300 | 3s |
| Prompt Synthesiser | `gemini-2.0-flash` | COUNCIL_SKILL_PACK all | 600 | 2s |

**Timeout policy:** If a Stage 1 council member exceeds deadline, Synthesiser runs with available inputs. Never block generation on a single model.

### 2.4 COUNCIL_SKILL_PACK Upgrade

```js
// Current (councilSkillPack.js) — extend with:
export const COUNCIL_SKILL_PACK_V2 = {
  ...COUNCIL_SKILL_PACK,

  // New: ink safety rules injected into Technical Expert's system prompt
  inkSafetyRules: {
    fineline: 'Warn: fine lines <1mm may blur within 2-3 years. Recommend 1.5-2mm minimum stroke.',
    whitework: 'Warn: white ink fades on pale skin. Recommend UV-reactive or grey wash alternative.',
    blackwork: 'Safe for all skin tones. Prefer for longevity.',
    watercolor: 'Warn: no outlines causes rapid fade. Recommend shadow outline layer.'
  },

  // New: style vocabulary guard tokens for Style Specialist
  styleVocabularyGuards: {
    irezumi: ['no outline gradients', 'bold bokashi shading', 'negative space clouds'],
    blackwork: ['no grey wash', 'solid black fill only', 'geometric precision'],
    fineline: ['<0.5mm stroke simulation', 'single-needle aesthetic', 'delicate detail']
  },

  // New: positional anchor grammar for multi-subject designs
  positionalGrammar: [
    '[Subject] positioned at [LEFT|CENTER|RIGHT]',
    '[Foreground element] overlaps [Background element]',
    '[Subject] faces [LEFT|RIGHT] with [MOTION DIRECTION]'
  ]
};
```

---

## 3. "Do It Now" Fast-Path — Bypass Architecture

> **Insight:** Not every user wants the 8–12s Council deliberation. A power user who knows "I want a blackwork snake on my forearm" should get straight to generation in <5s. The bypass is a **first-class product feature**, not a shortcut.

### 3.1 Decision Logic

```
User submits generation request
         │
         ▼
    Bypass Eligible?
         │
    ┌────┴────────────────────────────────────────────────────────┐
    │ YES — bypass if ANY of these match:                        │
    │  • User has Pro/Creator subscription (trust the prompt)    │
    │  • Prompt contains ≥3 expert style tokens from             │
    │    COUNCIL_SKILL_PACK.stencilKeywords or                   │
    │    styleVocabularyGuards keys                              │
    │  • User explicitly clicks "Quick Generate" CTA             │
    │  • Prompt is a refinement of a previous Council output     │
    │    (has session.councilSessionId)                          │
    └────────────────────────────────────────────────────────────┘
         │                       │
         ▼                       ▼
 FAST PATH                FULL COUNCIL PATH
 /api/v1/generate/fast    /api/v1/council/stream
                          → /api/v1/generate
         │                       │
         │                       │
    ┌────┴────┐             ┌────┴────┐
    │ Target  │             │ Target  │
    │ <5s     │             │ 8-15s   │
    │ latency │             │ latency │
    └─────────┘             └─────────┘
```

### 3.2 Fast-Path API Route

```
POST /api/v1/generate/fast
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "blackwork snake coiling around forearm, bold linework, no shading",
  "style": "blackwork",
  "bodyPart": "forearm",
  "mode": "preview",              // "preview" | "high-quality"
  "skipCouncil": true,            // explicit bypass flag
  "councilSessionId": null        // or prior session ID for refinement
}

→ Response (streaming NDJSON):
{ "status": "routing",  "modelId": "sdxl", "provider": "replicate" }
{ "status": "queued",   "predictionId": "abc123" }
{ "status": "progress", "logs": "...", "step": 3 }
{ "status": "complete", "images": ["https://..."], "metadata": { "cost": 0.003, "latencyMs": 3800 } }
```

### 3.3 Bypass Eligibility Service (Server-Side)

```typescript
// /src/services/bypassEligibilityService.ts

interface BypassContext {
  userId: string;
  subscriptionTier: 'free' | 'creator' | 'pro';
  prompt: string;
  hasCouncilSessionId: boolean;
  explicitBypass: boolean;
}

export function isBypassEligible(ctx: BypassContext): boolean {
  // Explicit user choice always wins
  if (ctx.explicitBypass) return true;

  // Prior Council session = user is refining, not exploring
  if (ctx.hasCouncilSessionId) return true;

  // Pro/Creator users trust their own taste
  if (['creator', 'pro'].includes(ctx.subscriptionTier)) return true;

  // Detect expert-level prompt vocabulary
  const expertTokenCount = countExpertTokens(ctx.prompt);
  if (expertTokenCount >= 3) return true;

  return false;
}

function countExpertTokens(prompt: string): number {
  const expertTokens = [
    ...COUNCIL_SKILL_PACK.stencilKeywords,
    ...Object.keys(COUNCIL_SKILL_PACK_V2.styleVocabularyGuards),
    'irezumi', 'bokashi', 'tebori', 'flash art', 'neo-trad',
    'blackwork', 'fineline', 'geometric', 'dotwork', 'watercolor'
  ];
  return expertTokens.filter(t => prompt.toLowerCase().includes(t)).length;
}
```

### 3.4 UX Surfaces

| Trigger | UX Interaction | Notes |
|---|---|---|
| "Quick Generate" button | Visible alongside "Enhance with Council" | Default for Creator/Pro |
| Style token detection | System auto-promotes to bypass; subtle badge "Expert prompt detected" | Optional — can toggle off |
| Council refinement | After Council session, regeneration uses bypass automatically | Session continuity |
| Keyboard shortcut | `Cmd+Enter` = bypass; `Enter` = Council path | Power user feature |

---

## 4. API Contract Sketch

> Full OpenAPI spec lives at `/openapi/`. This section describes the critical contracts for the next-gen endpoints.

### 4.1 Core Endpoints

#### `POST /api/v1/generate/fast`
```yaml
summary: Zero-council direct generation
security: [bearerAuth]
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [prompt, style, bodyPart]
        properties:
          prompt:         { type: string, maxLength: 500 }
          style:          { type: string, enum: [traditional, blackwork, fineline, irezumi, neoTraditional, anime, watercolor, realism] }
          bodyPart:       { type: string, enum: [forearm, shin, chest, back, shoulder, hip, ankle, neck, ribcage] }
          mode:           { type: string, enum: [preview, high-quality], default: preview }
          skipCouncil:    { type: boolean, default: true }
          councilSessionId: { type: string, nullable: true }
          count:          { type: integer, minimum: 1, maximum: 4, default: 4 }
responses:
  '200':
    description: NDJSON stream of generation events
    content:
      application/x-ndjson:
        schema:
          oneOf:
            - { $ref: '#/components/schemas/RoutingEvent' }
            - { $ref: '#/components/schemas/QueuedEvent' }
            - { $ref: '#/components/schemas/ProgressEvent' }
            - { $ref: '#/components/schemas/CompleteEvent' }
  '402': { description: Quota exceeded }
  '429': { description: Rate limited }
```

#### `GET /api/v1/council/stream`
```yaml
summary: SSE stream of council deliberation
security: [bearerAuth]
parameters:
  - name: idea
    in: query
    required: true
    schema: { type: string, maxLength: 300 }
  - name: style
    in: query
    schema: { type: string }
  - name: bodyPart
    in: query
    schema: { type: string }
  - name: isStencilMode
    in: query
    schema: { type: boolean, default: false }
responses:
  '200':
    description: Server-Sent Events stream
    content:
      text/event-stream:
        schema:
          description: |
            Events emitted in order:
              data: {"role":"creative","status":"thinking"}
              data: {"role":"creative","status":"done","content":"..."}
              data: {"role":"technical","status":"thinking"}
              data: {"role":"technical","status":"done","content":"..."}
              data: {"role":"style","status":"thinking"}
              data: {"role":"style","status":"done","content":"..."}
              data: {"role":"synthesiser","status":"done","variants":{...},"negativePrompt":"...","councilSessionId":"uuid"}
              data: [DONE]
```

#### `POST /api/v1/match/semantic`
```yaml
summary: Vector-semantic artist matching
security: [bearerAuth]
requestBody:
  content:
    application/json:
      schema:
        type: object
        required: [designDescription]
        properties:
          designDescription: { type: string }
          styleWeights:      { type: object, additionalProperties: { type: number } }
          locationZip:       { type: string }
          radiusMiles:       { type: integer, default: 50 }
          budgetRange:
            type: object
            properties:
              min: { type: integer }
              max: { type: integer }
          limit:             { type: integer, default: 20 }
responses:
  '200':
    content:
      application/json:
        schema:
          type: object
          properties:
            artists:
              type: array
              items: { $ref: '#/components/schemas/ArtistMatch' }
            matchMetadata:
              type: object
              properties:
                vectorScore: { type: number }
                keywordScore: { type: number }
                blendedScore: { type: number }
                latencyMs: { type: integer }
```

#### `POST /api/v1/estimate`
```yaml
summary: AI-powered cost & complexity estimation
security: [bearerAuth]
requestBody:
  content:
    application/json:
      schema:
        type: object
        required: [prompt, size]
        properties:
          prompt:    { type: string }
          size:      { type: string, enum: [tiny, small, medium, large, full-sleeve] }
          placement: { type: string }
          style:     { type: string }
responses:
  '200':
    content:
      application/json:
        schema:
          type: object
          properties:
            estimatedHours:  { type: number }
            priceRangeLow:   { type: integer }
            priceRangeHigh:  { type: integer }
            complexity:      { type: string, enum: [simple, moderate, complex, masterpiece] }
            inkSafetyFlags:  { type: array, items: { type: string } }
            artistTierMatch: { type: string, enum: [apprentice, journeyman, senior, master] }
```

### 4.2 Authentication Flow

```
Client                Next.js                Firebase Auth          Supabase
  │                      │                        │                     │
  │ → POST /auth/login    │                        │                     │
  │    (email+password)   │                        │                     │
  │                       │ → signInWithPassword() │                     │
  │                       │                        │ → idToken (JWT)     │
  │                       │ ← idToken              │                     │
  │                       │ → verifyIdToken()      │                     │
  │                       │              (next-firebase-auth-edge)       │
  │                       │ → exchangeForSupabaseToken()                 │
  │                       │                                    → RLS JWT │
  │ ← { accessToken,      │                                              │
  │     supabaseToken }   │                                              │
  │                       │                                              │
  │ (all subsequent API calls carry Authorization: Bearer <accessToken>) │
```

### 4.3 Rate Limiting Matrix

| Endpoint | Free | Creator | Pro | Artist |
|---|---|---|---|---|
| `/generate` | 3/day | 50/day | 200/day | 100/day |
| `/generate/fast` | 0/day | 30/day | 200/day | — |
| `/council/stream` | 3/day | 20/day | 100/day | — |
| `/match/semantic` | 10/day | 100/day | 500/day | 500/day |
| `/estimate` | 10/day | unlimited | unlimited | unlimited |
| `/stencil/export` | 1/design | 5/design | unlimited | unlimited |

---

## 5. DB Schema Diff (Current → Next-Gen)

### 5.1 Supabase (PostgreSQL + pgvector)

#### Current State
```sql
-- artists table (inferred from matching service)
CREATE TABLE artists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  styles      TEXT[],
  location    TEXT,
  zip         TEXT,
  bio         TEXT,
  hourly_rate INTEGER,
  portfolio   TEXT[],  -- GCS URLs
  embedding   vector(4096)  -- CLIP multimodal embeddings
);

-- designs table (inferred from library service)
CREATE TABLE designs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  prompt      TEXT,
  style       TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

#### Next-Gen Schema Additions
```sql
-- ✅ ADD: council_sessions — persist Council deliberation output
CREATE TABLE council_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  idea              TEXT NOT NULL,
  style             TEXT,
  body_part         TEXT,
  is_stencil_mode   BOOLEAN DEFAULT FALSE,
  creative_output   TEXT,
  technical_output  TEXT,
  style_output      TEXT,
  variants          JSONB,              -- { simple, detailed, ultra }
  negative_prompt   TEXT,
  selected_variant  TEXT,              -- which variant the user picked
  bypass_used       BOOLEAN DEFAULT FALSE,
  latency_ms        INTEGER,
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_council_sessions_user ON council_sessions(user_id, created_at DESC);

-- ✅ ADD: generation_jobs — track async generation with full lineage
CREATE TABLE generation_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  council_session_id UUID REFERENCES council_sessions(id),
  prompt            TEXT NOT NULL,
  style             TEXT,
  body_part         TEXT,
  model_id          TEXT NOT NULL,
  provider          TEXT NOT NULL,       -- 'replicate' | 'vertex-ai'
  prediction_id     TEXT,               -- external provider job ID
  status            TEXT DEFAULT 'queued',  -- queued|processing|complete|failed
  images            TEXT[],             -- GCS URLs
  cost_usd          NUMERIC(8,5),
  latency_ms        INTEGER,
  bypass_used       BOOLEAN DEFAULT FALSE,
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  completed_at      TIMESTAMPTZ
);
CREATE INDEX idx_generation_jobs_user ON generation_jobs(user_id, created_at DESC);
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status) WHERE status != 'complete';

-- ✅ MODIFY: designs — add council lineage + bypass flag
ALTER TABLE designs
  ADD COLUMN IF NOT EXISTS council_session_id UUID REFERENCES council_sessions(id),
  ADD COLUMN IF NOT EXISTS generation_job_id  UUID REFERENCES generation_jobs(id),
  ADD COLUMN IF NOT EXISTS body_part          TEXT,
  ADD COLUMN IF NOT EXISTS mode               TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS bypass_used        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_stencil_mode    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS embedding          vector(768),  -- downgrade from 4096 CLIP to 768 Vertex
  ADD COLUMN IF NOT EXISTS ink_safety_flags   TEXT[];

-- ✅ ADD: bypass_analytics — track bypass usage for product decisions
CREATE TABLE bypass_analytics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id),
  trigger       TEXT NOT NULL,   -- 'explicit' | 'expert_tokens' | 'council_refinement' | 'subscription'
  prompt        TEXT,
  expert_token_count INTEGER,
  subscription_tier TEXT,
  latency_ms    INTEGER,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ✅ ADD: artist_bookings — marketplace transaction layer
CREATE TABLE artist_bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id     UUID REFERENCES artists(id),
  user_id       UUID REFERENCES auth.users(id),
  design_id     UUID REFERENCES designs(id),
  status        TEXT DEFAULT 'inquiry',   -- inquiry|accepted|scheduled|completed|cancelled
  message       TEXT,
  budget_range  NUMRANGE,
  preferred_date DATE,
  commission_pct NUMERIC(4,2) DEFAULT 15.00,  -- TatT takes 15%
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 Firestore Collections

#### Current
```
artist_embeddings/{artistId}
  - embedding: vector(768)
  - model: "text-embedding-004"
  - sourceText: string
  - createdAt: Timestamp
```

#### Next-Gen Additions
```
design_interactions/{userId}/events/{eventId}
  - type: "view" | "save" | "share" | "book_inquiry" | "generate_variant"
  - designId: string
  - timestamp: Timestamp
  - metadata: map

council_feedback/{sessionId}
  - userId: string
  - selectedVariant: "simple" | "detailed" | "ultra"
  - rating: 1-5 (optional, post-generation)
  - generatedImageId: string
  - timestamp: Timestamp

model_performance/{modelId}/runs/{date}
  - totalRequests: number
  - avgLatencyMs: number
  - successRate: number
  - avgCostUsd: number
  - byStyle: map<string, number>
```

### 5.3 Neo4j Graph Schema

#### Current (inferred)
```cypher
(Artist)-[:SPECIALISES_IN]->(Style)
(Artist)-[:LOCATED_IN]->(City)
(User)-[:LIKED]->(Artist)
```

#### Next-Gen Additions
```cypher
// Design lineage graph
(Design)-[:GENERATED_FROM]->(CouncilSession)
(Design)-[:USED_MODEL]->(AIModel)
(Design)-[:DEPICTS_STYLE]->(Style)
(Design)-[:PLACED_ON]->(BodyPart)

// Artist capability graph
(Artist)-[:MASTERED]->(Style {level: "expert"|"proficient"|"learning"})
(Artist)-[:AVAILABLE_IN]->(City)
(Artist)-[:RATED_BY]->(User {score: float, timestamp: datetime})

// Booking relationship (future)
(User)-[:BOOKED]->(Artist {via_design: designId, status: string})
```

---

## 6. CI/CD Flow

```
Developer pushes to GitHub (branch or main)
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GitHub Actions                                      │
│                                                                             │
│  .github/workflows/ci.yml                                                   │
│                                                                             │
│  [on: push to any branch]                                                   │
│    ├─ lint: eslint + tsc --noEmit                                           │
│    ├─ unit-test: vitest (src/**/*.test.ts)                                  │
│    │     includes: councilSkillPack.test.js, multiLayerService.test.js      │
│    ├─ build: next build (fails fast on type errors)                         │
│    └─ security: npm audit --audit-level=high                                │
│                                                                             │
│  [on: push to main]  (all above pass first)                                 │
│    ├─ integration-test: vitest --config vitest.config.js (API mocks)        │
│    ├─ deploy-preview: Vercel preview URL (auto-comment on PR)               │
│    └─ notify: Slack #tatt-dev "✅ CI green — preview: <url>"               │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │  main branch only, all checks green
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Deployment Pipeline                                   │
│                                                                             │
│  Vercel (Frontend + Next.js API Routes)                                     │
│    • Auto-deploy on push to main (GitHub integration)                       │
│    • Preview deploys on PRs                                                 │
│    • Env vars: managed in Vercel dashboard + Secret Manager pull            │
│    • Rollback: vercel rollback <deployment-id>                              │
│                                                                             │
│  Railway (Express Proxy + Webhook Receiver)                                 │
│    • Auto-deploy from Dockerfile on railway.json config                     │
│    • Health check: /api/health/startup must return 200 before traffic       │
│    • Env vars: GCP_PROJECT_ID, GCS_BUCKET_NAME, NEO4J_URI, credentials     │
│    • Rollback: Railway dashboard → previous deployment                      │
│                                                                             │
│  Google Cloud Build (cloudbuild.yaml — optional heavy jobs)                 │
│    • Used for: embedding batch jobs, model fine-tuning triggers             │
│    • Triggered manually or via Cloud Scheduler                              │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Post-Deploy Verification                                  │
│                                                                             │
│  Automated smoke tests (run after each production deploy):                  │
│    curl /api/health → expect {"status":"ok"}                               │
│    curl /api/health/startup → expect all services green                     │
│    POST /api/v1/generate/fast (mock prompt) → expect prediction_id          │
│    GET /api/v1/council/stream (mock idea) → expect SSE stream starts        │
│                                                                             │
│  Failure → auto-rollback + Slack alert #tatt-dev                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Branch Strategy

```
main ─────────────────────────────────────────→ Production (Vercel + Railway)
  │
  ├── feat/council-stream ──────────→ Preview deploy + PR review
  ├── feat/fast-path-bypass ────────→ Preview deploy + PR review
  ├── feat/db-schema-v2 ──────────→ Preview deploy + DB migration review
  └── fix/* ────────────────────────→ Patch deploy (fast lane)
```

### 6.2 Secret Rotation Policy

| Secret | Location | Rotation Freq | Alert Channel |
|---|---|---|---|
| OPENROUTER_API_KEY | Vercel + Secret Manager | 90 days | #tatt-dev |
| REPLICATE_API_TOKEN | Railway + Secret Manager | 90 days | #tatt-dev |
| FIREBASE_SERVICE_ACCOUNT | Railway (secret volume) | 180 days | #alerts |
| SUPABASE_SERVICE_KEY | Vercel | On breach only | #alerts |
| GCP_CREDENTIALS | Secret Manager | 180 days | #alerts |

See `directives/rotate-secrets.md` for procedure.

---

## 7. Phased Build Roadmap

> **Guiding principle:** Each phase must be independently deployable and deliver user value. No phase blocks the next unless explicitly marked.

---

### Phase 1 — Foundation Hardening (Weeks 1–2)
*Goal: Make what exists actually work in production.*

| Task | Owner | Blocking? |
|---|---|---|
| Fix Railway env vars: `GCP_PROJECT_ID`, `GCS_BUCKET_NAME` | Samson | Yes — blocks all GCP features |
| Mount GCP service account JSON on Railway | Samson | Yes — blocks Firestore, GCS |
| Fix Neo4j connection (encryption mismatch) | Samson | Yes — blocks artist matching |
| Verify Supabase project status (may be paused) | Samson | Yes — blocks auth + vector search |
| Redeploy to Vercel (push main or `vercel --prod`) | paul | Yes — current deploy is stale |
| Add `/gallery` page (or redirect `/gallery` → `/generate`) | paul | No |
| Add `/api/health/startup` to deployment smoke test | paul | No |
| Move Council API calls server-side (hide OpenRouter key) | paul | Security — do ASAP |

**Exit Criteria:** `/api/health/startup` returns all green. `tatt-app.vercel.app` serves `/generate`, `/artists`, `/gallery`, `/login`.

---

### Phase 2 — Fast-Path Bypass (Weeks 3–4)
*Goal: Ship the "Do It Now" bypass as a product feature.*

| Task | Details |
|---|---|
| `bypassEligibilityService.ts` | Server-side eligibility check (§3.3) |
| `/api/v1/generate/fast` endpoint | Streaming NDJSON response (§3.2) |
| `COUNCIL_SKILL_PACK_V2` | Expert token vocabulary expansion (§2.4) |
| UX: "Quick Generate" button | Alongside Council enhance; default for Creator/Pro |
| UX: Expert prompt detection badge | "Expert prompt detected — using fast path" |
| DB: `bypass_analytics` table | Track bypass usage (§5.1) |
| DB: `generation_jobs` table | Full job lineage (§5.1) |
| Rate limit differentiation | Free gets 0 fast-path; Creator/Pro unlocked (§4.3) |

**Exit Criteria:** Pro user can generate 4 images in <5s without Council. Bypass analytics are being logged.

---

### Phase 3 — Council Streaming (Weeks 5–7)
*Goal: Make the Council deliberation feel like watching experts work in real time.*

| Task | Details |
|---|---|
| `/api/v1/council/stream` SSE endpoint | Server-side, streamed, keys never client-side (§2.2) |
| Stage 1 parallel fan-out | 3 council members, 150ms aggregate deadline |
| Stage 2 synthesiser | Gemini 2.0 Flash, structured JSON output |
| `councilSessionId` persistence | Supabase `council_sessions` table (§5.1) |
| `COUNCIL_SKILL_PACK_V2` injection | inkSafetyRules + styleVocabularyGuards |
| UI: Real-time council animation | Each role card animates in as SSE events arrive |
| UI: Ink safety warning display | Show Technical Expert's flags below design |
| Council → bypass handoff | After Council completes, refinements use fast path automatically |
| Feedback collection | Post-generation: "Which variant did you use?" → Firestore |

**Exit Criteria:** Council deliberation streams to UI in real time. `councilSessionId` links Council → generation → design in DB. Ink safety flags shown to users.

---

### Phase 4 — Artist Marketplace MVP (Weeks 8–12)
*Goal: Connect users with artists. Close the loop from design to booking.*

| Task | Details |
|---|---|
| `artist_bookings` table | Supabase (§5.1) |
| `/api/v1/bookings` CRUD | Create inquiry, accept/reject, schedule |
| Artist dashboard | View inquiries, portfolio analytics, booking calendar |
| `POST /api/v1/match/semantic` upgrade | Return `artistTierMatch` from `/estimate` data (§4.1) |
| Neo4j graph enrichment | Add Design → Artist capability edges (§5.3) |
| Commission tracking | 15% platform fee on bookings |
| Artist onboarding flow | Portfolio upload → embedding generation → Neo4j seeding |
| Stripe integration | Payment processing for bookings |
| Email notifications | `emailQueueService.js` → booking confirmations |

**Exit Criteria:** User can go from design → find artist → send booking inquiry → artist responds. First paid booking processed.

---

### Phase 5 — Mobile-First & Growth (Weeks 13–20)
*Goal: AR experience on mobile, viral sharing, social proof.*

| Task | Details |
|---|---|
| MindAR stabilisation | Fix depth-aware placement for real-world use |
| Progressive Web App (PWA) | Offline design library, push notifications |
| Design sharing card | Branded shareable image with TatT watermark + QR code |
| TikTok-style design feed | Discovery page: trending styles, top artists |
| Referral system | User invites artist → earns booking fee credit |
| A/B test: Council vs Bypass CTR | Measure which path leads to more completions |
| Convention mode | Kiosk layout for tablet — artist can show clients at events |

---

### Phase 6 — Scale & Series A (Months 6–12)
*Goal: 100K users, $100K MRR, 1,000 artists, Series A ready.*

| Task | Details |
|---|---|
| Multi-region Vercel Edge | Reduce latency for EU/APAC users |
| Model fine-tuning | Fine-tune SDXL on curated tattoo dataset |
| Custom Replicate deployment | Dedicated model endpoints for < $0.001/generation |
| Enterprise artist tools | Studio dashboard, team accounts, client CRM |
| White-label API | Let tattoo studios embed TatT generation in their own sites |
| Analytics dashboard | Internal: cost per generation, LTV by tier, artist NPS |
| YC Demo Day pack | Live demo script, backup data, offline fallback mode |

---

## 8. Open Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| OpenRouter key exposed client-side | 🔴 Critical | Move Council to server-side SSE (Phase 3) |
| Railway infra completely broken | 🔴 Critical | Phase 1 fix (§7 Phase 1 — Week 1) |
| Supabase free tier paused | 🟠 High | Upgrade to Pro ($25/mo) before any user testing |
| Neo4j AuraDB encryption mismatch | 🟠 High | Verify `NEO4J_URI` scheme: `neo4j+s://` vs `bolt://` |
| Model costs uncontrolled | 🟠 High | `monitor-budget.md` directive + hard limits per user tier |
| Council latency >12s on slow models | 🟡 Medium | Timeout policy (§2.2) + graceful degradation to bypass |
| No CI/CD smoke tests post-deploy | 🟡 Medium | Phase 1: add automated health checks to deploy pipeline |
| CLIP 4096d embeddings slow at scale | 🟡 Medium | Migrate to Vertex `text-embedding-005` 768d (already partially done in Firestore) |
| No stencil export in production | 🟡 Medium | Verify `/api/v1/stencil/export` end-to-end after Railway fix |
| Solo founder bus factor | 🟡 Medium | Write `directives/onboard-engineer.md` + record Loom architecture walk |

---

## Appendix A — Environment Variable Checklist

### Vercel (Frontend + Next.js API)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_OPENROUTER_API_KEY       ← move to server-only (Phase 3)
OPENROUTER_API_KEY                   ← server-side only
REPLICATE_API_TOKEN                  ← add to Vercel (currently Railway-only)
GCP_PROJECT_ID
VERTEX_AI_LOCATION
GOOGLE_APPLICATION_CREDENTIALS_JSON  ← base64 encoded service account
FIREBASE_SERVICE_ACCOUNT_JSON        ← base64 encoded
```

### Railway (Express Proxy)
```
GCP_PROJECT_ID                       ← MISSING — add now
GCS_BUCKET_NAME                      ← MISSING — add now
GOOGLE_APPLICATION_CREDENTIALS       ← path to mounted secret file
NEO4J_URI
NEO4J_USER
NEO4J_PASSWORD
REPLICATE_API_TOKEN
PORT=3001
NODE_ENV=production
```

---

## Appendix B — Glossary

| Term | Definition |
|---|---|
| **Council** | The 3-LLM panel (Creative Director, Technical Expert, Style Specialist) that enhances user prompts before generation |
| **Bypass / Fast Path** | Direct generation route that skips the Council, targeting <5s latency |
| **COUNCIL_SKILL_PACK** | Shared configuration object containing anatomical flow tokens, aesthetic anchors, stencil keywords, and safety rules injected into Council system prompts |
| **Synthesiser** | The 4th LLM (Gemini 2.0 Flash) that aggregates Council opinions into Simple/Detailed/Ultra prompt variants |
| **councilSessionId** | UUID that links a Council deliberation → selected variant → generation job → saved design, enabling full lineage tracing |
| **bypassEligibilityService** | Server-side function that determines whether a request qualifies for the fast path based on subscription, prompt vocabulary, or explicit user choice |
| **Forge Canvas** | TatT's layer-based design editor — allows users to segment, rearrange, and colour-correct generated tattoo layers |
| **Neural Ink** | Marketing name for TatT's semantic artist-matching feature |
| **anatomicalFlow** | Per-body-part composition guidelines injected into Council prompts (e.g., forearm = vertical + tapered; chest = symmetrical + landscape) |
| **pgvector** | PostgreSQL extension for vector similarity search — used in Supabase for artist matching |

---

*Document generated by paul (AI co-pilot) | TatT workspace | 2026-03-08*  
*Next review: after Phase 2 completion*
