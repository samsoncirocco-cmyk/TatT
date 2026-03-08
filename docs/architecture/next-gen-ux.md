# TatT Platform — Next-Gen UX Architecture
> **Document status:** Living reference  
> **Created:** 2026-03-08  
> **Expanded:** 2026-03-08 12:15 MST — §11 Feature Flag System, §12 Multi-Agent Coordination Protocol, Appendix H Incident Response Playbook  
> **Prior:** 2026-03-08 11:30 MST — §9 Testing Strategy, §10 Load Benchmarks, Appendix G User Journey State Machine  
> **Prior:** 2026-03-08 10:45 MST — §2.3 Agent OS↔TatT parallels, Appendix E Observability, Appendix F Security  
> **Prior:** 2026-03-08 09:15 MST — Appendix D: production status audit  
> **Prior:** 2026-03-08 07:45 MST — initial overnight build  
> **Author:** paul (agent) — build-overnight-architecture-plan session  
> **Scope:** Full-stack architecture expansion, multi-agent UX layer, phased roadmap through YC Demo Day and beyond  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Key Architectural Insights](#2-key-architectural-insights)
   - 2.1 [The "Do It Now" Bypass Pattern — Applied to UX](#21-the-do-it-now-bypass-pattern--applied-to-ux)
   - 2.2 [Role-Specialisation Layer](#22-role-specialisation-layer)
   - 2.3 [Agent OS ↔ TatT Pattern Library (Structural Parallels)](#23-agent-os--tatt-pattern-library-structural-parallels)
3. [System Component Diagram](#3-system-component-diagram)
4. [API Contract Sketch](#4-api-contract-sketch)
5. [Database Schema Diff](#5-database-schema-diff)
6. [CI/CD Flow](#6-cicd-flow)
7. [Phased Build Roadmap](#7-phased-build-roadmap)
8. [Open Blockers & Risk Register](#8-open-blockers--risk-register)
9. [Testing Strategy](#9-testing-strategy)
10. [Load Benchmarks & Demo Day Readiness](#10-load-benchmarks--demo-day-readiness)
11. [Feature Flag System](#11-feature-flag-system)
12. [Multi-Agent Coordination Protocol](#12-multi-agent-coordination-protocol)
- Appendix A — File Map
- Appendix B — Model Routing Reference
- Appendix C — Council System Prompts
- Appendix D — Production Status (2026-03-08)
- Appendix E — Observability, SLOs & Budget Controls
- Appendix F — Security Model & Auth Flow
- Appendix G — User Journey State Machine
- Appendix H — Incident Response Playbook

---

## 1. Executive Summary

TatT is 90% built. The gap is not features — it's **orchestration quality, agent routing, and UX coherence** between AI subsystems. This document codifies the architectural decisions needed to close that gap and ship a YC Demo Day-ready product.

Three structural problems drive the next-gen design:

| # | Problem | Architectural Response |
|---|---|---|
| 1 | AI subsystems operate in silos (Imagen, Replicate, Council, matching) | Unified Generation Router with role-specialised councils |
| 2 | User flow has latency dead-zones (generation → preview → match) | "Do It Now" bypass pattern applied to the UX request pipeline |
| 3 | Dual deployment (Cloud Run + Railway) causes auth fragmentation | Single Cloud Run primary; Railway as hot standby only |

---

## 2. Key Architectural Insights

### 2.1 The "Do It Now" Bypass Pattern — Applied to UX

#### Origin: The Agent OS Pattern

In the agent OS layer (`directives/do-it-now.md`), the bypass pattern was invented to solve one problem: **delegation latency**. When Samson types `!now: check PM2`, the agent runs it inline in the current session — no subagent spawn, no Codex queue, no wait. Result arrives in seconds instead of minutes.

The implementation operates in two tiers:

```
Tier 1: Direct Session Injection (gateway up — ~0s latency)
  CLI → openclaw gateway → chat.send(sessionKey, "!now: task")
  → Agent processes inline → result in real time

Tier 2: Heartbeat Queue (gateway down — up to 5-10 min latency)
  CLI → writes memory/pending-wake-NOW.txt
  → Next heartbeat reads it first → executes inline → deletes file
```

**The invariant:** every piece of routing overhead is stripped. The work fires as close to the user's intent as possible.

#### The Same Problem Exists in TatT's Generation Pipeline

TatT's current generation flow has **delegation overhead baked into the UX**. The user types a prompt and hits Submit. Then they wait. Here's what happens behind the scenes:

```
User submits prompt
  → PromptEnhancer (LLM call #1, ~800ms)
    → generationRouter picks model (style lookup, ~50ms)
      → Imagen 3 / Replicate generates (5–15s, silent spinner)
        → canvasService receives blob, renders layer (200ms)
          → matchUpdateService triggers async (silent, unknown timing)
            → User finally sees design
```

**Dead zones:** The user sees a loading spinner for 5–15 seconds with zero signal. Every step is delegation: PromptEnhancer delegates to the router, router delegates to the model, model delegates to canvas. Nothing is inline. Nothing is visible. If any step silently fails, the user stares at a spinner indefinitely.

This is the same problem the `!now:` bypass solves in the agent OS — but here, the victim isn't an engineer waiting for a PM2 check. It's a first-time tattoo buyer deciding whether to trust the product. **They will close the tab.**

#### The "Do It Now" UX Cascade — Full Design

The fix is not to make generation faster (we can't control Imagen's latency). The fix is to **eliminate silence** at every tier. Every delegation step must emit a visible signal immediately, in parallel where possible.

```
User submits prompt
  │
  ├─ [< 100ms] Skeleton canvas appears (blank frame, pulsing)
  │            → feels like the app is "on it" immediately
  │
  ├─ [~800ms]  Prompt enhancement result streamed to UI chip
  │            "✨ Geometric wolf · blackwork · forearm wrap"
  │            → user sees the AI understood their intent
  │
  ├─ [~4s]     512px preview tile rendered (fast model pass)
  │            BEFORE the 1024px version is ready
  │            → eliminates the "is it even working?" doubt
  │
  ├─ [8-15s]   Full 1024px image seamless-swaps over the preview
  │            canvas transition: blur-in → sharp
  │            → feels like a reveal, not a page load
  │
  └─ [parallel to generation]
               Artist match cards appear in bottom sheet
               as RRF fusion completes (typically < 3s)
               → user is already browsing artists while image finalises
```

**The result:** 5-15 seconds of generation time becomes 5-15 seconds of *progressive engagement*. The user is never staring at a spinner. They are reading enriched prompt feedback, evaluating the 512px preview, and swiping artist cards before the final image lands.

#### Implementation Touch-Points

| File | Change |
|---|---|
| `src/services/generationRouter.ts` | Add `onProgress(step: ProgressStep, payload: any): void` callback to `GenerationRoute` type and route through all async calls |
| `src/services/canvasService.ts` | Accept `previewMode: "fast" \| "full"` flag; on `"fast"`, skip multi-layer compositing and return raw 512px blob |
| `src/components/DesignGenerator.jsx` | Subscribe to progress events; render skeleton→prompt chip→preview→full in sequence |
| `src/hooks/useGenerationStream.ts` | **New file.** SSE or polling wrapper that feeds the cascade. Accepts `onStep: (event: GenerationEvent) => void` handler |
| `src/services/vertex-ai-edge.ts` | Low-res pass: call Imagen 3 with `sampleCount: 1, aspectRatio: "1:1", guidanceScale: 7` for the fast 512px preview first |
| `src/services/matchUpdateService.js` | Trigger matching at `generation_start` (not `generation_done`) so results arrive in parallel with the final image |

#### The Bypass Rule (matches `do-it-now.md` Scope Guard)

Just as the agent OS has a scope guard ("if task >10 min, confirm first"), the UX cascade has a bypass rule:

> **If `councilEnabled=true` and council latency > 3000ms:** skip council enrichment and fire generation with raw prompt + cached style defaults. Never block the image model on council timeout.

This is enforced in `generationRouter.ts` via:

```typescript
const COUNCIL_TIMEOUT_MS = 3000;

const councilResult = await Promise.race([
  runCouncil(input),
  timeout(COUNCIL_TIMEOUT_MS, { reason: 'COUNCIL_TIMEOUT', fallback: 'raw_prompt' })
]);

// Emit progress regardless of which resolved first
onProgress('council_done', { ...councilResult, bypassed: councilResult.reason === 'COUNCIL_TIMEOUT' });
```

**The invariant:** generation always fires. The council enriches it when possible. The UX always progresses.

#### Why This Matters for YC Demo Day

Judges and investors see the first 10 seconds. The 512px preview tile at 4 seconds — with the enriched prompt chip already visible — signals AI comprehension *before the image renders*. The bottom-sheet artist matches arriving while the full image loads demonstrates a live, connected system rather than a static demo. A spinner kills confidence. A cascade of progressive signals sells it.

---

### 2.2 Role-Specialisation Layer

#### Origin: Multi-Agent OS Design

The agent OS runs one main agent (Layer 2: orchestration) backed by role-specialised subagents spawned for specific work. The routing logic is:

- Codex CLI for code generation (has filesystem access, runs tests, iterates)
- Subagent sessions for research, writing, architecture (this very document)
- The main agent stays in orchestration — it delegates, monitors, synthesises

Each role has a **well-defined input/output contract**, runs with minimal overhead, and the main agent collects results without caring how they were produced.

**The TatT council is supposed to be the same thing — but it's disconnected.**

#### Current State: Connected by Name, Disconnected by Wire

Looking at the actual codebase, three council-related files exist:

```
src/config/councilSkillPack.js      — the "knowledge" layer
src/services/openRouterCouncil.js   — the "execution" layer  
src/services/generationRouter.ts    — the "dispatch" layer
src/components/DesignGeneratorWithCouncil.jsx — the only caller
```

**The disconnect:** `generationRouter.ts` never imports or calls `openRouterCouncil.js`. The council is an island. It only runs when `DesignGeneratorWithCouncil.jsx` is explicitly rendered — which is not the default generation path. The routing rules in `modelRoutingRules.js` don't reference council output. The stencil parameters in `councilSkillPack.js` are never pre-computed for `stencilService.ts`.

This is equivalent to having three specialised subagents that are brilliant at their jobs, but whose outputs are never read by the orchestrator before work begins.

#### The Actual Council Member Definitions (from code)

`openRouterCouncil.js` defines three members, each with a distinct model and role:

| Role | Model | Focus |
|---|---|---|
| `creative` | `anthropic/claude-3.5-sonnet` | Artistic vision, composition, aesthetic appeal |
| `technical` | `openai/gpt-4-turbo` | Tattoo-specific technical details and feasibility |
| `style` | `google/gemini-pro-1.5` | Style authenticity and cultural accuracy |

The system prompt builder (`buildCouncilSystemPrompt`) already injects body-part-specific anatomical flow from `councilSkillPack.js`:

```js
// councilSkillPack.js — the actual skill data
export const COUNCIL_SKILL_PACK = {
  negativeShield: '(shading, gradients, shadows, blur, 3d, realistic, photorealistic, ...)',
  anatomicalFlow: {
    forearm: 'vertical flow, tapered composition, elongated, wraps around limb',
    chest:   'symmetrical, landscape, follows pectoral contour, centered focal point',
    back:    'symmetrical, massive scale, follows spine alignment, landscape',
    shoulder:'radial composition, follows joint curvature, dynamic movement',
    // ...
  },
  aestheticAnchors: 'high-contrast blackwork, professional flash art, masterpiece line-work, ...',
  positionalInstructions: 'Use explicit positional anchoring ...',
  stencilKeywords: ['stencil', 'linework', 'blackwork', 'flash', 'outline', 'transfer']
};
```

This data is gold. It's exactly what the image model needs to produce tattoo-ready output. **It's just never reaching the image model.**

#### Target Architecture: Role-Specialised Council Wired to Orchestrator

The fix is to wire all three council members into `GenerationOrchestrator` — a new service layer that sits between `generationRouter.ts` and the image model call — and run them in parallel.

```
┌─────────────────────────────────────────────────────┐
│  GenerationOrchestrator  (new: src/services/        │
│  generationOrchestrator.ts)                         │
│                                                     │
│  Input:  raw prompt + user context (style, body,   │
│          skin tone, session)                        │
│  Output: EnrichedGenerationContext → image model   │
└────────────┬─────────────────────────────────────────┘
             │  Promise.all — all 3 run simultaneously
    ┌────────┼──────────────────────┐
    ▼        ▼                      ▼
┌────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Style Council  │ │ Placement        │ │ Artist           │
│ (claude-3.5)   │ │ Specialist       │ │ Matchmaker       │
│                │ │ (gpt-4-turbo)    │ │ (gemini-pro +    │
│ Input:         │ │                  │ │  Vertex vectors) │
│  raw prompt    │ │ Input:           │ │                  │
│  style tag     │ │  style tags      │ │ Input:           │
│                │ │  body region     │ │  style tags      │
│ Output:        │ │  skin tone       │ │  enriched prompt │
│  enrichedPrompt│ │                  │ │                  │
│  styleTags[]   │ │ Output:          │ │ Output:          │
│  negativePrompt│ │  stencilParams{} │ │  top3Artists[]   │
│  compositionHints│ │  anchorPoints│ │  confidence[]    │
└────────────────┘ └──────────────────┘ └──────────────────┘
             │
             ▼  All 3 results merged into:
    ┌─────────────────────────────────┐
    │  EnrichedGenerationContext {    │
    │    enrichedPrompt: string,      │
    │    negativePrompt: string,      │
    │    styleTags: string[],         │
    │    stencilParams: {             │
    │      orientation: "vertical",   │
    │      anchorPoints: [x,y][],     │
    │      recommendedSize: "80x120", │
    │    },                           │
    │    preMatchedArtists: Artist[], │
    │    councilMs: number,           │
    │    bypassed: boolean,           │
    │  }                              │
    └─────────────────────────────────┘
             │
             ▼
    ┌─────────────────────┐
    │  Image Model Call   │
    │  (Imagen 3 primary) │
    │  receives enriched  │
    │  prompt — not raw   │
    └─────────────────────┘
```

#### EnrichedGenerationContext Type Contract

```typescript
// src/types/generation.ts

export interface StencilParams {
  orientation: 'vertical' | 'horizontal' | 'radial';
  anchorPoints: [number, number][];   // normalised [0-1, 0-1]
  recommendedSizeMm: { w: number; h: number };
  flowDescription: string;            // from councilSkillPack.anatomicalFlow
}

export interface PreMatchedArtist {
  id: string;
  name: string;
  score: number;
  scoreBreakdown: { semantic: number; graph: number; proximity: number };
}

export interface EnrichedGenerationContext {
  // From Style Council (claude-3.5-sonnet)
  enrichedPrompt: string;
  negativePrompt: string;
  styleTags: string[];
  compositionHints: string;

  // From Placement Specialist (gpt-4-turbo)
  stencilParams: StencilParams;

  // From Artist Matchmaker (gemini-pro + vertex vectors)
  preMatchedArtists: PreMatchedArtist[];

  // Orchestration metadata
  councilMs: number;
  bypassed: boolean;      // true if council timeout was hit
  bypassReason?: string;
}
```

#### Council Role: Style Interpreter — Detailed Spec

**Input prompt to claude-3.5-sonnet:**
```
System: You are a Senior Tattoo Architect on the TatT AI Council.
        POSITIONAL ANCHORING: [from councilSkillPack]
        ANATOMICAL FLOW: [body-part specific]
        AESTHETIC ANCHORS: [from councilSkillPack]
        Return JSON only. No prose.

User:   Style: geometric
        Raw prompt: "minimalist black wolf howling at moon"
        Body region: forearm
        Skin tone: medium
```

**Expected output:**
```json
{
  "enrichedPrompt": "minimalist geometric black wolf silhouette, single howling pose facing moon crescent, clean vector line-work, vertical composition flowing along forearm length, high-contrast blackwork, crisp edges, no gradients, professional flash art quality",
  "negativePrompt": "(shading, gradients, shadows, blur, 3d, realistic, photorealistic, low contrast, grey, messy lines, sketch: 1.5)",
  "styleTags": ["geometric", "blackwork", "minimalist", "linework"],
  "compositionHints": "vertical stacking — wolf at center, moon crescent above, minimal negative space"
}
```

#### Council Role: Placement Specialist — Detailed Spec

Runs in parallel with Style Council. Ingests style tags + body region from raw input (doesn't wait for Style Council output — uses the raw data to reduce latency).

**Input prompt to gpt-4-turbo:**
```
System: You are a tattoo placement expert. Return stencil layout parameters as JSON.
User:   Style tags: geometric, blackwork
        Body region: forearm
        Skin tone: medium
        Estimated design: wolf + moon composition
```

**Expected output:**
```json
{
  "orientation": "vertical",
  "anchorPoints": [[0.5, 0.15], [0.5, 0.85]],
  "recommendedSizeMm": { "w": 60, "h": 140 },
  "flowDescription": "vertical flow, tapered composition, elongated, wraps around limb",
  "wrapGuidance": "slight curvature inward at top and bottom thirds to follow forearm taper"
}
```

This output is passed directly to `stencilService.ts` — no post-generation round-trip needed.

#### Council Role: Artist Matchmaker — Detailed Spec

Also runs in parallel. Uses `styleTags` from the raw input (not waiting for enriched prompt) and fires a Vertex AI embedding call + Neo4j graph traversal simultaneously.

```typescript
// src/services/councilMatchmaker.ts  (new)

async function matchArtists(
  styleHints: string[],
  location?: { lat: number; lng: number }
): Promise<PreMatchedArtist[]> {
  const styleEmbedding = await vertexEmbeddingService.embed(styleHints.join(', '));

  const [semanticResults, graphResults] = await Promise.all([
    supabase.rpc('match_artists', {
      query_embedding: styleEmbedding,
      match_threshold: 0.7,
      match_count: 20,
      filter_verified: true
    }),
    neo4j.run(
      `MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style)
       WHERE s.name IN $styles
       RETURN a, count(s) as overlap
       ORDER BY overlap DESC LIMIT 20`,
      { styles: styleHints }
    )
  ]);

  return rrfFusion(semanticResults, graphResults, location).slice(0, 3);
}
```

Result: **artist matches are computed in < 2s** in parallel with the 8-15s image generation. They arrive at the frontend the moment generation completes — or before.

#### Governance Rule: The Three-Second Promise

All three council members are bound by this rule:

```
If total council time > 3000ms:
  emit { bypassed: true, reason: "COUNCIL_TIMEOUT" }
  fire image model with:
    - raw prompt (not enriched)
    - default negativePrompt from councilSkillPack.negativeShield
    - default stencilParams for the given bodyPart from councilSkillPack.anatomicalFlow
  continue artist matching in background (non-blocking)
```

This means the council is a **progressive enhancement**, not a dependency. Fast council → better output. Slow/failed council → generation still fires, stencil defaults apply, artists load in background.

#### Migration Path (Minimal Disruption)

The current `DesignGeneratorWithCouncil.jsx` can stay as-is during Phase 1. The new `GenerationOrchestrator` is added as a backend service and the default `DesignGenerator.jsx` is updated to call it. The council-specific component becomes an A/B test toggle for Phase 1 validation.

---

### 2.3 Agent OS ↔ TatT Pattern Library (Structural Parallels)

> This section makes the connection explicit. The agent OS patterns described in §2.1 and §2.2 were not invented for TatT — they were distilled from running a production AI agent for months. TatT inherits them because the underlying problem is identical: **how to route work through AI without introducing delegation overhead that kills user trust.**

---

#### The DOE Framework, Mirrored

The agent OS runs on a three-layer architecture:

```
Layer 1: Directive      → What to do (SOPs in directives/)
Layer 2: Orchestration  → You — intelligent routing, error handling
Layer 3: Execution      → Deterministic scripts in execution/
```

TatT's generation pipeline has the same three layers — but they were built independently without naming them:

```
Layer 1: Intent Layer      → user prompt + style selection + body region
Layer 2: Orchestration     → generationRouter.ts + (new) GenerationOrchestrator
Layer 3: Execution         → Imagen 3 / Replicate / stencilService / matchUpdateService
```

**The difference:** In the agent OS, Layer 2 has a clear identity — it's *this agent*, making explicit decisions about what to route where and why. In TatT, Layer 2 is a scattered collection of implicit decisions in `generationRouter.ts`, `DesignGenerator.jsx`, and `DesignGeneratorWithCouncil.jsx` — none of which know about each other's decisions.

The `GenerationOrchestrator` described in §2.2 is the fix: it gives TatT's Layer 2 an identity.

---

#### Pattern 1: The "Do It Now" Bypass — Side-by-Side

| Concern | Agent OS | TatT |
|---|---|---|
| **Trigger** | `!now:` prefix / `pending-wake-NOW.txt` | `councilEnabled=false` OR `councilMs > 3000ms` |
| **What bypasses** | Subagent spawn + Codex queue | Council pipeline (3 LLM calls) |
| **Inline execution** | Task runs in current session | Generation fires with raw prompt + cached defaults |
| **Scope guard** | If task >10 min → confirm first | If design is Pro-tier multi-piece → warn user (not yet implemented — Phase 2) |
| **Fallback state** | `memory/pending-wake-NOW.txt` for gateway-down | `councilSkillPack.negativeShield` + `anatomicalFlow[bodyPart]` as cached defaults |
| **Latency target** | ~0s (inline) vs 3-10 min (subagent) | <3s council vs <15s blocked-on-council |
| **Observability** | Heartbeat detects `pending-wake-NOW.txt` | `bypass_analytics` table records bypass count + reason |

**Key insight:** Both systems solve the same problem — **never let a middleware layer block forward progress.** The user's intent (run a command, generate a tattoo) must fire even when the enrichment layer is slow or broken. The enrichment is a progressive enhancement, not a dependency.

---

#### Pattern 2: Role Specialisation — Side-by-Side

| Concern | Agent OS | TatT |
|---|---|---|
| **Orchestrator** | Main agent (Layer 2) | `GenerationOrchestrator` |
| **Specialised workers** | Codex (code), subagent sessions (research/writing/arch) | Style Council, Placement Specialist, Artist Matchmaker |
| **Parallelism** | Codex + heartbeat run simultaneously | All 3 council members via `Promise.all()` |
| **I/O contract** | Each worker has defined input/output; main agent collects results | `EnrichedGenerationContext` type — strict schema, workers return only their slice |
| **Failure isolation** | If Codex crashes, main agent catches + retries or pivots | If any council member times out, `EnrichedGenerationContext.bypassed = true`; image still fires |
| **No cross-chatter** | Workers don't talk to each other; orchestrator synthesises | Style Council doesn't wait for Placement Specialist; orchestrator merges results |
| **Role identity** | Codex = code; subagent = research; main = routing | claude-3.5 = style; gpt-4 = placement; gemini = matchmaking |

**Key insight:** The power is not in any individual worker — it's in the orchestrator's merge layer. In the agent OS, the main agent synthesises Codex output + subagent findings into a coherent action. In TatT, `GenerationOrchestrator` merges `enrichedPrompt` + `stencilParams` + `preMatchedArtists` into a single `EnrichedGenerationContext` before the image model call. **The quality of the final output is determined by the merge, not any single worker.**

---

#### Pattern 3: Self-Annealing — Applied to TatT

The agent OS has a mandatory self-annealing loop:

```
Error occurs → Fix the deterministic layer → Update the directive → System is stronger
```

TatT needs the same loop. Currently, when Imagen 3 returns a poor output (low contrast, gradients, realistic shading), the response is to retry with a different prompt — which is **fixing the AI prompt layer**. That's the wrong layer.

**The TatT self-annealing equivalent:**

```
Imagen returns low-contrast output (gradients, blur)
→ Analyse: negativePrompt did not include "gradients, blur" with high weight
→ Fix: update councilSkillPack.negativeShield to add weight: "(gradients: 1.6, blur: 1.4)"
→ Test: run 5 generations, verify crisp output
→ Update: councilSkillPack.js CHANGELOG entry
→ Result: all future generations benefit, not just the retry
```

The directive is `src/config/councilSkillPack.js`. The script is `openRouterCouncil.js`. Prompt iteration is Layer 2 orchestration. The skill pack is Layer 1. **Fix the skill pack, not the prompt.**

This is captured in the roadmap as Phase 1 task: "Council output → stencil params pre-computed." The broader implication is a **feedback loop** where generation quality issues are root-caused to the skill pack layer and fixed there.

---

#### Pattern 4: Memory Continuity — Across Sessions

The agent OS uses file-based memory (`MEMORY.md`, daily notes, vault docs) to persist context across session restarts. An agent waking up after 8 hours doesn't lose what was built yesterday.

TatT has the same problem: users return after weeks. A user who asked for "geometric wolf" in March should be greeted with artist matches that already know their style. Currently, Firestore stores canvas state — but there's no cross-session enrichment.

**The TatT memory layer (Phase 2):**

```
User generates design → embedding stored in Supabase designs.embedding
User returns next session → matchingService fetches user's past embeddings
                         → builds styleProfile: weighted average of past 5 designs
                         → new generation pre-seeds councilMembers with styleProfile
                         → Artist Matchmaker uses styleProfile for cold-start seeding (not style tags alone)
```

This is precisely how `MEMORY.md` works: it's a **weighted digest of past context**, not raw logs. The daily notes are raw; MEMORY.md is curated. Similarly, `designs.embedding` is raw; `userStyleProfile` is the curated digest.

The Neo4j graph already has the traversal for this (cold-start seeding query in §5). The missing piece is the `userStyleProfile` computation — a Phase 2 task.

---

#### Pattern 5: Capture-on-Contact → Embed-on-Creation

The agent OS has a "capture-on-contact" rule:

> When the user mentions ANY project, person, or decision → write it to a file BEFORE responding.

TatT has the same obligation for generated designs:

> When a user creates a design → embed it BEFORE returning the response.

Currently, embeddings are generated asynchronously in `matchUpdateService.js` — which means there's a window where the design exists but isn't searchable. If the user immediately asks for matches, they may get stale results.

**The fix:** Generate the embedding synchronously as part of the `POST /api/generate` response (or at minimum, guarantee it completes before the `matches_ready` SSE event fires). The `councilMatchmaker.ts` already uses an embedding call — that same call can double as the design embedding storage trigger.

```typescript
// In GenerationOrchestrator, after generation_done:
const [designEmbedding, _] = await Promise.all([
  vertexEmbeddingService.embed(enrichedContext.enrichedPrompt),
  imageStorageService.save(generatedImageBlob, designId)
]);

// Store embedding synchronously — do not leave this to the async queue
await supabase.from('designs').update({ embedding: designEmbedding }).eq('id', designId);

// Now fire matches_ready — embedding is guaranteed to exist
emitMatchesReady(preMatchedArtists);
```

---

#### Summary Table — All 5 Patterns

| Pattern | Agent OS Mechanism | TatT Mechanism | Status |
|---|---|---|---|
| Bypass | `!now:` inline execution | `councilEnabled=false` fast path | 🔴 Not yet built |
| Role specialisation | Codex + subagent sessions | `GenerationOrchestrator` + 3 council members | 🔴 Disconnected |
| Self-annealing | Directive updates after errors | `councilSkillPack.js` as the Layer 1 directive | 🟡 Manual only |
| Memory continuity | `MEMORY.md` curated digest | `userStyleProfile` weighted embedding | 🔴 Not built |
| Capture-on-contact | Write before respond | Embed before `matches_ready` fires | 🔴 Async gap |

All 5 are Phase 1–2 work. None require new infrastructure — they all wire into existing services.

---

## 3. System Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER (Next.js 16 + React 19, Vercel Edge)              │
│                                                                 │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │  /        │  │  /generate │  │  /artists  │  │  /match   │  │
│  │ Landing  │  │  Forge     │  │  Profiles  │  │  SwipeUI  │  │
│  └──────────┘  └─────┬──────┘  └─────┬──────┘  └─────┬─────┘  │
│                      │               │                │        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Shared State Layer                                      │  │
│  │  Zustand stores: useMatchStore | useAuthStore | useForge │  │
│  │  New: useGenerationStream (SSE cascade hook)             │  │
│  └───────────────────────────┬──────────────────────────────┘  │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTPS / SSE
┌──────────────────────────────▼──────────────────────────────────┐
│  API GATEWAY (Cloud Run: pangyo-production)                     │
│  server.js (Express) — rate limited, Firebase auth middleware   │
│                                                                 │
│  POST /api/generate       → GenerationOrchestrator             │
│  POST /api/match          → MatchingService                    │
│  GET  /api/artists/:id    → ArtistService                      │
│  POST /api/canvas/save    → CanvasService → GCS                │
│  POST /api/stencil/export → StencilService → GCS               │
│  GET  /api/design/:id     → DesignLibraryService → Firestore   │
│  POST /api/estimate       → CostEstimatorService               │
└────────┬──────────┬──────────┬──────────┬───────────┬──────────┘
         │          │          │          │           │
         ▼          ▼          ▼          ▼           ▼
┌──────────┐ ┌────────┐ ┌──────────┐ ┌───────┐ ┌──────────────┐
│ Vertex   │ │ Open-  │ │ Neo4j    │ │Supa-  │ │ Firebase     │
│ AI       │ │ Router │ │ (Graph   │ │ base  │ │ Auth +       │
│ Imagen 3 │ │ (coun- │ │  Match)  │ │pgvec  │ │ Firestore    │
│          │ │ cil +  │ │          │ │ (vec) │ │ + GCS        │
│          │ │ fallbk)│ │          │ │       │ │              │
└──────────┘ └────────┘ └──────────┘ └───────┘ └──────────────┘
         │                    │           │
         └────────────────────┴───────────┘
                              │
                    RRF Fusion (matching.js)
                    scoreAggregation.js
                              │
                    Artist Match Results

┌─────────────────────────────────────────────────────────────────┐
│  GenerationOrchestrator (new server-side service)               │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Style Council   │  │ Placement Spec.  │  │ Art.Matchmkr │ │
│  │  claude-3.5-son  │  │ gpt-4-turbo      │  │ gemini-pro   │ │
│  │  → enrichedPrompt│  │ → stencilParams  │  │ + Vertex vec │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│         │                      │                    │          │
│         └──────────────────────┴────────────────────┘          │
│                     Promise.all() → merge                       │
│                     EnrichedGenerationContext                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  OBSERVABILITY                                                  │
│  GCP Cloud Monitoring + Error Reporting + Cloud Tasks (queues) │
└─────────────────────────────────────────────────────────────────┘
```

**Deployment topology:**

```
                 ┌─────────────────┐
                 │  Vercel Edge    │  ← frontend + SSR
                 │  (CDN layer)    │
                 └────────┬────────┘
                          │
                ┌─────────▼─────────┐
                │  Cloud Run        │  ← PRIMARY API
                │  pangyo-production│
                │  (auto-scales 0→N)│
                └─────────┬─────────┘
                          │ (failover)
                ┌─────────▼─────────┐
                │  Railway          │  ← HOT STANDBY only
                │  tatt-production  │  (read-only; no writes)
                └───────────────────┘
```

---

## 4. API Contract Sketch

All endpoints require `Authorization: Bearer <firebase-id-token>` unless marked public.

---

### `POST /api/generate`

Triggers the GenerationOrchestrator pipeline. Returns SSE stream.

**Request:**
```json
{
  "prompt": "minimalist black wolf howling at moon, geometric style",
  "style": "geometric",
  "bodyRegion": "forearm",
  "skinTone": "medium",
  "modelPreference": "auto",        // auto | imagen | replicate
  "councilEnabled": true,           // default: true; bypass=false skips council
  "sessionId": "uuid"
}
```

**SSE Event Stream (response):**
```
event: council_start
data: {"step":"council","status":"running","ts":1709840000}

event: council_done
data: {"step":"council","enrichedPrompt":"...","styleTags":["geometric","blackwork"],"stencilParams":{...},"bypassed":false,"councilMs":1840,"ts":1709840002}

event: generation_start
data: {"step":"generation","model":"imagen-3","prompt":"...enriched...","ts":1709840002}

event: preview_ready
data: {"step":"preview","url":"https://storage.googleapis.com/...preview.jpg","resolution":"512x512","ts":1709840005}

event: generation_done
data: {"step":"generation","url":"https://storage.googleapis.com/...full.jpg","resolution":"1024x1024","designId":"uuid","ts":1709840014}

event: matches_ready
data: {"step":"matching","artists":[{"id":"...","name":"...","score":0.94},{"id":"...","name":"...","score":0.87}],"ts":1709840014}
```

**Error events:**
```
event: council_timeout
data: {"step":"council","bypassed":true,"reason":"COUNCIL_TIMEOUT","fallback":"raw_prompt_with_defaults","ts":1709840003}

event: generation_error
data: {"step":"generation","code":"IMAGEN_QUOTA_EXCEEDED","fallback":"replicate","retrying":true,"ts":1709840005}
```

---

### `POST /api/match`

Direct artist matching without generation. Used for users with existing designs.

**Request:**
```json
{
  "designId": "uuid",
  "imageUrl": "https://...",
  "styleHints": ["geometric"],
  "location": { "lat": 33.4, "lng": -112.1 },
  "limit": 10
}
```

**Response:**
```json
{
  "artists": [
    {
      "id": "artist-uuid",
      "name": "Alex Romero",
      "studio": "Iron & Ink Phoenix",
      "score": 0.94,
      "scoreBreakdown": { "semantic": 0.96, "graph": 0.91, "proximity": 0.94 },
      "styles": ["geometric", "blackwork"],
      "availabilitySlots": 3,
      "bookingUrl": "https://..."
    }
  ],
  "matchStrategy": "rrf_fusion",
  "processingMs": 280
}
```

---

### `POST /api/canvas/save`

Persists a multi-layer canvas state to Firestore + thumbnail to GCS.

**Request (multipart/form-data):**
```
konvaState: <JSON blob>
thumbnail:  <PNG blob, max 512x512>
designId:   <uuid | "new">
title:      <string>
```

**Response:**
```json
{
  "designId": "uuid",
  "firestorePath": "users/{uid}/designs/{designId}",
  "thumbnailUrl": "https://storage.googleapis.com/...",
  "version": 3
}
```

---

### `POST /api/stencil/export`

Generates print-ready stencil from canvas state. Stencil params come pre-computed from council (no extra round-trip).

**Request:**
```json
{
  "designId": "uuid",
  "format": "svg",
  "dpi": 300,
  "mirrorHorizontal": true,
  "includeGuideLines": true,
  "stencilParamsOverride": null    // null = use council-precomputed params
}
```

**Response:**
```json
{
  "exportUrl": "https://storage.googleapis.com/...",
  "expiresAt": "2026-03-09T06:00:00Z",
  "formatMeta": { "dpi": 300, "widthMm": 80, "heightMm": 120 }
}
```

---

### `GET /api/artists/:id`

Public — no auth required.

**Response:**
```json
{
  "id": "uuid",
  "name": "Alex Romero",
  "bio": "...",
  "styles": ["geometric", "blackwork", "fine-line"],
  "portfolio": [
    { "url": "https://...", "styleTag": "geometric", "embeddingId": "..." }
  ],
  "studio": { "name": "...", "address": "...", "lat": 33.4, "lng": -112.1 },
  "booking": { "url": "...", "depositAmount": 100, "avgSessionHours": 3 }
}
```

---

## 5. Database Schema Diff

> Delta from current schema → target next-gen schema

### Supabase (PostgreSQL + pgvector)

**Current `tattoo_artists` table (from `generated/create-table.sql`):**
```sql
CREATE TABLE IF NOT EXISTS tattoo_artists (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  location_city         TEXT NOT NULL,
  location_region       TEXT NOT NULL,
  location_country      TEXT NOT NULL,
  has_multiple_locations BOOLEAN DEFAULT FALSE,
  profile_url           TEXT,
  is_curated            BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  styles                TEXT[] DEFAULT '{}',
  color_palettes        TEXT[] DEFAULT '{}',
  specializations       TEXT[] DEFAULT '{}'
);
```

**Note:** This diverges from the `artists` table in `tatt-intel.md` which includes `embedding VECTOR(1408)`. Both schemas need to be reconciled into a single canonical migration file.

**Target — ADD to `tattoo_artists` (migration M001):**
```sql
ALTER TABLE tattoo_artists
  ADD COLUMN IF NOT EXISTS embedding          VECTOR(1408),
  ADD COLUMN IF NOT EXISTS lat               FLOAT,
  ADD COLUMN IF NOT EXISTS lng               FLOAT,
  ADD COLUMN IF NOT EXISTS booking_url       TEXT,
  ADD COLUMN IF NOT EXISTS deposit_amount    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS availability_slots INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_score     FLOAT DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS last_seen_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tier              TEXT DEFAULT 'free'  -- free | featured | studio
;

-- Geo index for proximity matching
CREATE INDEX IF NOT EXISTS idx_artists_location 
  ON tattoo_artists USING gist (ll_to_earth(lat, lng));

-- Partial IVFFlat index: verified artists only — faster match queries
CREATE INDEX IF NOT EXISTS idx_artists_embedding_verified 
  ON tattoo_artists USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists=100)
  WHERE verified = true;
```

**New table: `designs` (migration M002):**
```sql
CREATE TABLE designs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id),
  firestore_doc_id  TEXT,
  thumbnail_url     TEXT,
  full_image_url    TEXT,
  prompt_raw        TEXT,
  prompt_enriched   TEXT,       -- from Style Council
  style_tags        TEXT[],
  body_region       TEXT,
  stencil_params    JSONB,      -- from Placement Specialist, pre-computed
  embedding         VECTOR(1408),
  model_used        TEXT,
  council_ms        INTEGER,    -- how long council took (0 if bypassed)
  council_bypassed  BOOLEAN DEFAULT false,
  generation_ms     INTEGER,
  is_public         BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_designs_user ON designs (user_id, created_at DESC);
CREATE INDEX idx_designs_embedding ON designs 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists=100);
```

**New table: `bookings` (migration M003 — Phase 3):**
```sql
CREATE TABLE bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id),
  artist_id       UUID REFERENCES tattoo_artists(id),
  design_id       UUID REFERENCES designs(id),
  status          TEXT DEFAULT 'inquiry',
  deposit_paid    BOOLEAN DEFAULT false,
  stripe_session  TEXT,
  booked_at       TIMESTAMPTZ DEFAULT now(),
  session_date    DATE,
  notes           TEXT
);
```

---

### Neo4j (Graph)

**Current nodes:** `Artist`, `Style`, `BodyRegion`  
**Current relationships:** `(Artist)-[:SPECIALIZES_IN]->(Style)`, `(Artist)-[:WORKS_ON]->(BodyRegion)`

**Migration M001 — add Design + User nodes:**
```cypher
CREATE CONSTRAINT artist_id_unique IF NOT EXISTS
  FOR (a:Artist) REQUIRE a.id IS UNIQUE;

CREATE CONSTRAINT design_id_unique IF NOT EXISTS
  FOR (d:Design) REQUIRE d.id IS UNIQUE;

CREATE CONSTRAINT user_id_unique IF NOT EXISTS
  FOR (u:User) REQUIRE u.id IS UNIQUE;
```

**New relationships:**
```cypher
// User → Design
(User)-[:CREATED]->(Design)

// Design → Style (from Style Council output)
(Design)-[:GENERATED_IN]->(Style)

// Design → Artist (from Matchmaker, with score)
(Design)-[:MATCHED_WITH {score: float, matchedAt: datetime}]->(Artist)

// User → Artist (after booking)
(User)-[:BOOKED {bookedAt: datetime, sessionDate: date}]->(Artist)

// Artist geography
(Artist)-[:LOCATED_IN]->(City)
(City)-[:IN_REGION]->(Region)
```

**Recommendation traversal query (Artist Matchmaker uses this):**
```cypher
// "Artists like the one you booked"
MATCH (u:User)-[:BOOKED]->(a:Artist)-[:SPECIALIZES_IN]->(s:Style)
      <-[:SPECIALIZES_IN]-(a2:Artist)
WHERE NOT (u)-[:BOOKED]->(a2)
  AND a2.verified = true
RETURN a2, count(s) as styleOverlap, a2.profile_score as score
ORDER BY styleOverlap DESC, score DESC
LIMIT 5
```

**Cold-start seeding query (for new users with no booking history):**
```cypher
MATCH (a:Artist)-[:SPECIALIZES_IN]->(s:Style)
WHERE s.name IN $styleTags
  AND a.verified = true
WITH a, count(s) as overlap
ORDER BY overlap DESC, a.profile_score DESC
LIMIT 20
RETURN a
```

---

### Firestore

**Current:** `users/{uid}/designs/{designId}` (canvas state as JSON blob)

**Target structure:**
```
users/{uid}/
  profile: { displayName, avatarUrl, tier, generationsUsed, generationsLimit }
  designs/{designId}/
    metadata: {
      title, createdAt, thumbnailUrl, modelUsed,
      promptRaw, promptEnriched, styleTags, bodyRegion,
      councilBypassed, councilMs, generationMs
    }
    konvaState: { layers: [...] }           // current canvas state
    versions/
      {timestamp}: { konvaState, savedAt }  // versioned diffs (keep last 10)

artists/{artistId}/
  profile: { name, bio, studio, verified, tier, profileScore }
  portfolio/{imageId}: { url, styleTag, embeddingId, uploadedAt }
  availability/
    {weekId}: { slots: [{ date, time, duration, booked }] }

bookings/{bookingId}/
  {
    userId, artistId, designId, status,
    depositPaid, stripeSession,
    messages: [{ from, text, ts }],
    createdAt, sessionDate
  }
```

---

## 6. CI/CD Flow

### Current State (broken — per March 2026 audit)
- GitHub Actions exists (`cloudbuild.yaml`) but WIF secrets (`WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`, `GCP_PROJECT_ID`) are **not configured**
- Cloud Run is the deployment target but CORS hardcodes Railway URLs
- No staging environment; all deploys go straight to production
- `VITE_OPENROUTER_API_KEY` is still used in `openRouterCouncil.js` — must become `NEXT_PUBLIC_*` or server-side only

### Target CI/CD Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│  Developer / Agent pushes to GitHub                              │
│  Branch: feature/* | fix/* | manama/*                           │
└──────────────────────┬───────────────────────────────────────────┘
                       │
          ┌────────────▼────────────┐
          │  GitHub Actions         │
          │  trigger: push + PR     │
          └────────────┬────────────┘
                       │
         ┌─────────────▼──────────────┐
         │  Stage 1: Lint + Type Check │
         │  npm run lint               │
         │  tsc --noEmit               │
         │  ~60s                       │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │  Stage 2: Unit Tests        │
         │  jest --passWithNoTests     │
         │  ~90s                       │
         └─────────────┬──────────────┘
                       │ (on PR to main only)
         ┌─────────────▼──────────────┐
         │  Stage 3: Build             │
         │  npm run build              │
         │  (Next.js production build) │
         │  ~3-5min                    │
         └─────────────┬──────────────┘
                       │ (on merge to main only)
         ┌─────────────▼──────────────┐
         │  Stage 4: Deploy Staging    │
         │  Cloud Run: pangyo-staging  │
         │  (auto-scales to 0, cold)   │
         │  ~2min                      │
         └─────────────┬──────────────┘
                       │ (manual approval gate)
         ┌─────────────▼──────────────┐
         │  Stage 5: Deploy Production │
         │  Cloud Run: pangyo-prod     │
         │  + Vercel frontend deploy   │
         │  ~3min                      │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │  Stage 6: Smoke Tests       │
         │  curl /api/health           │
         │  curl /generate (demo mode) │
         │  Slack #tatt-dev notify     │
         └────────────────────────────┘
```

### Fixes Required to Unblock CI/CD

**1. Add WIF secrets to GitHub repo:**
```
Settings → Secrets → Actions:
WIF_PROVIDER          = projects/123/locations/global/workloadIdentityPools/...
WIF_SERVICE_ACCOUNT   = deployer@tatt-pro.iam.gserviceaccount.com
GCP_PROJECT_ID        = tatt-pro
GCS_BUCKET            = tatt-production-assets
ALLOWED_ORIGINS       = https://tatt-app.vercel.app,https://tatt.design
OPENROUTER_API_KEY    = (server-side, not VITE_ prefix)
```

**2. Fix CORS in `server.js`:**
```js
// BEFORE (broken — hardcoded Railway URL)
origin: ['https://tatt-production.up.railway.app', 'https://tatt-app.vercel.app']

// AFTER
origin: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
```

**3. Fix OpenRouter API key scope in `openRouterCouncil.js`:**
```js
// BEFORE (broken — VITE_ prefix exposes key in client bundle)
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

// AFTER — move council to server-side API route
// Client calls POST /api/generate (SSE), server calls OpenRouter
// Key lives in Cloud Run env, never shipped to browser
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
```

**4. Add smoke test job (`.github/workflows/smoke-test.yml`):**
```yaml
smoke-test:
  name: Smoke Test Production
  runs-on: ubuntu-latest
  needs: [deploy-prod]
  steps:
    - name: Health check
      run: |
        curl -sf "${{ env.CLOUD_RUN_URL }}/api/health" | jq .status

    - name: Generation smoke test (no-council fast path)
      run: |
        curl -sf -X POST "${{ env.CLOUD_RUN_URL }}/api/generate" \
          -H "Content-Type: application/json" \
          -d '{"prompt":"test wolf","councilEnabled":false,"sessionId":"ci-smoke"}' \
          -H "Authorization: Bearer ${{ secrets.CI_TEST_TOKEN }}" \
          --max-time 30 | jq .event

    - name: Notify Slack
      run: |
        curl -s -X POST ${{ secrets.SLACK_WEBHOOK }} \
          -d '{"text":"✅ TatT deployed + smoke test passed — ${{ github.sha }}"}'
```

### Secret Rotation Schedule

```
GCP Secret Manager rotation schedule:
  - OpenRouter API key:           90-day rotation
  - Vertex AI service account:   180-day rotation
  - Firebase service account:    180-day rotation (rotate NOW — key in public repo)
  - Supabase service key:         90-day rotation
  - Neo4j password:              180-day rotation
  - Stripe keys:                  on-demand (breach only)
```

Rotation triggers Cloud Run re-deploy via Eventarc → Cloud Functions → `cloudbuild.yaml trigger`.

---

## 7. Phased Build Roadmap

### Phase 0 — Demo Day Ready (Target: 2 weeks)
> Fix the P0 blockers from the March 2026 audit. App must be live, fully functional, and stable.

| Task | Owner | Effort | Status |
|---|---|---|---|
| Rotate leaked Firebase SA key | SLED Codex | 30m | 🔴 TODO |
| Fix `VITE_*` → `NEXT_PUBLIC_*` or server-side env vars | SLED Codex | 1h | 🔴 TODO |
| Set `NEXT_PUBLIC_DEMO_MODE=false` | SLED Codex | 15m | 🔴 TODO |
| Create GCS bucket + wire `GCS_BUCKET` env var | SLED Codex | 30m | 🔴 TODO |
| Configure WIF + GitHub Actions secrets | SLED Codex | 1h | 🔴 TODO |
| Lock Cloud Run as primary; remove Railway write paths | SLED Codex | 1h | 🔴 TODO |
| Fix CORS to env-var config | SLED Codex | 30m | 🔴 TODO |
| Commit local canvas/quota/rate-limit changes | Samson | 30m | 🔴 TODO |
| Move OpenRouter key server-side | SLED Codex | 1h | 🔴 TODO |

**Exit criteria:** `curl https://tatt-app.vercel.app/api/health` → 200. Generation fires Imagen. Council runs. Artists return.

---

### Phase 1 — UX Cascade + Council Integration (Weeks 3–4)
> Ship the "Do It Now" UX pattern and role-specialised council. Demo-quality experience.

| Task | Effort | Notes |
|---|---|---|
| `src/types/generation.ts` — `EnrichedGenerationContext` type | 1h | Unblocks everything else |
| `src/services/generationOrchestrator.ts` — new orchestrator | 4h | Replaces direct router calls |
| Wire 3 council members into orchestrator (Promise.all) | 3h | Use existing `openRouterCouncil.js` |
| 3-second timeout guard with fallback | 2h | |
| `src/hooks/useGenerationStream.ts` — SSE cascade hook | 4h | |
| `generationRouter.ts` — expose `onProgress` callback | 2h | |
| `canvasService.ts` — `previewMode: "fast"` (512px first pass) | 2h | |
| `DesignGenerator.jsx` — skeleton → prompt chip → preview → full | 4h | |
| `councilMatchmaker.ts` — parallel artist matching | 3h | Fires at `generation_start`, not `done` |
| Council output → stencil params pre-computed | 2h | Pass to stencilService without extra round-trip |
| A/B test toggle: `DesignGeneratorWithCouncil` vs new default | 1h | |

**Exit criteria:** User sees skeleton < 100ms. Enriched prompt chip < 1s. 512px preview < 5s. Artist matches arrive before or with final image.

---

### Phase 2 — Data Layer + Schema (Weeks 5–6)
> Apply DB schema diff. Add geo-proximity, versioned canvas, design library.

| Task | Effort |
|---|---|
| Supabase migration M001: artists +embedding, lat/lng, tier, geo index | 2h |
| Supabase migration M002: `designs` table + IVFFlat index | 3h |
| Reconcile `tattoo_artists` vs `artists` table naming | 1h |
| Neo4j M001: Design + User nodes + constraints | 2h |
| Firestore: versioned canvas diffs (keep last 10 per design) | 2h |
| Geo-proximity filter in matchmaking service | 3h |
| Design library page (`/designs`) — grid of saved work | 4h |
| Profile page (`/profile`) — stats, history, saved designs | 4h |

**Exit criteria:** Users save/version designs. Matching filters by proximity. Design library loads.

---

### Phase 3 — Monetisation Layer (Weeks 7–10)
> Freemium limits, subscriptions, booking deposits.

| Task | Effort |
|---|---|
| Stripe integration (subscriptions + booking deposits) | 8h |
| Quota tracker (free: 3 designs/mo, Pro: unlimited) | 2h |
| Premium gate UI (paywall modal, upgrade CTA) | 3h |
| Artist booking flow: inquiry → confirm → deposit → session | 8h |
| Supabase migration M003: `bookings` table | 2h |
| Booking calendar UI (artist availability slots) | 6h |
| Post-session review + rating system | 4h |
| Stripe Connect: artist payouts | 8h |

**Exit criteria:** User can discover, design, match, book, and pay within the app. Artist receives payout.

---

### Phase 4 — Artist Self-Service (Weeks 11–14)
> Artist onboarding, portfolio management, studio dashboard.

| Task | Effort |
|---|---|
| Artist onboarding portal (`/artist/onboard`) | 6h |
| Portfolio upload + auto-embedding pipeline (Vertex AI multimodal) | 4h |
| Artist dashboard (`/artist/dashboard`) — views, matches, earnings | 6h |
| Studio-tier tools — multi-artist roster management | 4h |
| ID verification (Stripe Identity or manual review queue) | 4h |
| Artist analytics — which styles get matched, conversion rate | 4h |

**Exit criteria:** Artist self-onboards without Samson touching it.

---

### Phase 5 — Mobile + Viral Layer (Weeks 15–20)
> Expo mobile app, social sharing, improved AR.

| Task | Effort |
|---|---|
| Expo app: Generate, Match, Profile screens | 16h |
| AR preview: MediaPipe body part detection (replaces simple overlay) | 8h |
| Social sharing: design card export for Instagram/TikTok | 4h |
| Artist following + notification system | 4h |
| Design collections (curated galleries by style) | 4h |
| Referral loop: share → earn free generation credits | 4h |

**Exit criteria:** TatT has a native mobile install and a viral sharing mechanism.

---

## 8. Open Blockers & Risk Register

| # | Blocker | Severity | Mitigation |
|---|---|---|---|
| 1 | Firebase SA JSON committed to **public** repo | **P0 Critical** | Rotate in GCP IAM immediately. Revoke old key. |
| 2 | `VITE_OPENROUTER_API_KEY` in client bundle | **P0 Critical** | Move council to server-side. Key must never ship to browser. |
| 3 | `NEXT_PUBLIC_DEMO_MODE` not set — app shows Unsplash mocks | **P0 Critical** | Set env vars, redeploy. |
| 4 | WIF secrets not configured — CI/CD deploys fail silently | **P0** | Configure per §6. |
| 5 | `GCS_BUCKET` missing — image uploads silently fail | **P0** | Create bucket, wire env var. |
| 6 | CORS hardcoded to Railway — auth fails on Cloud Run | **P1** | Env-var CORS config. |
| 7 | `tattoo_artists` vs `artists` table naming divergence | **P1** | Reconcile before running M001 migration. |
| 8 | Council not wired into generation router | **P2** | Phase 1 — `generationOrchestrator.ts`. |
| 9 | No staging environment | **P2** | Cloud Run `pangyo-staging`, add to CI/CD. |
| 10 | Neo4j graph schema not versioned | **P2** | Cypher migration files in `repos/TatT/migrations/neo4j/`. |
| 11 | `DesignGeneratorWithCouncil.jsx` bypasses default flow | **P2** | Phase 1 A/B toggle — make council-default the standard path. |
| 12 | No IVFFlat index on `artists.embedding` | **P2** | Add in M001 — cosine scan over 50k+ rows will be slow. |
| 13 | Expo mobile app stubbed but empty | **P3** | Phase 5 — blocked on Phase 0–3 completion. |

---

## Appendix A — File Map (Where to Touch What)

| Concern | File(s) |
|---|---|
| Generation orchestration (new) | `src/services/generationOrchestrator.ts` |
| Generation routing | `src/services/generationRouter.ts` |
| Council execution | `src/services/openRouterCouncil.js` |
| Council skill data | `src/config/councilSkillPack.js` |
| Council skill pack config | `src/config/councilSkillPack.js` |
| Model routing rules | `src/config/modelRoutingRules.js` |
| SSE cascade hook (new) | `src/hooks/useGenerationStream.ts` |
| Canvas service | `src/services/canvasService.ts` |
| Matching / RRF fusion | `src/utils/matching.js`, `src/utils/scoreAggregation.js` |
| Artist matchmaker council (new) | `src/services/councilMatchmaker.ts` |
| Stencil export | `src/services/stencilService.ts`, `src/services/stencilEdgeService.js` |
| Cost estimator | `src/services/costEstimatorService.ts` |
| Auth middleware | `server.js` |
| CI/CD | `cloudbuild.yaml`, `.github/workflows/` |
| DB migrations (Supabase) | `migrations/supabase/M001_artists.sql`, `M002_designs.sql`, `M003_bookings.sql` |
| DB migrations (Neo4j) | `migrations/neo4j/M001_user_design_nodes.cypher` |
| Shared types | `src/types/generation.ts` |

---

## Appendix B — Model Routing Reference

| Style Tag | Primary Model | Fallback | Avg Latency | Cost/gen |
|---|---|---|---|---|
| `realistic` | `imagen-3` | `replicate/sdxl-realistic` | 12s | $0.020 |
| `geometric` | `imagen-3` | `replicate/sdxl` | 10s | $0.020 |
| `watercolor` | `imagen-3` | `replicate/sdxl-watercolor` | 11s | $0.020 |
| `blackwork` | `imagen-3` | `replicate/sdxl` | 9s | $0.020 |
| `new-school` / `newSchool` | `replicate/dreamshaper-xl-turbo` | `imagen-3` | 7s | $0.001 |
| `traditional` | `imagen-3` | `replicate/sdxl-tattoo` | 10s | $0.020 |
| `fine-line` | `imagen-3` | `replicate/sdxl` | 12s | $0.020 |
| `tribal` | `replicate/sdxl` | `imagen-3` | 13s | $0.004 |
| `anime` / `manga` | `replicate/dreamshaper-xl-turbo` | `replicate/anime-xl` | 7s | $0.001 |
| `flash` / `traditional-flash` | `replicate/tattoo-flash-art` | `imagen-3` | 9s | $0.003 |

**Council bypass trigger:** If `councilEnabled=true` and council exceeds **3000ms**, fire generation with `modelPreference=auto` + raw prompt + `councilSkillPack.negativeShield` as default negative prompt.

**Fast-preview pass:** For all styles, Imagen 3 is called first with `sampleCount=1, guidanceScale=7, outputFormat=jpeg` at 512×512 for the preview tile. The full 1024×1024 follows immediately using the same enriched prompt.

---

## Appendix C — Council System Prompts (Canonical)

These are the exact system prompts to use for each council member. Keep them in sync with `councilSkillPack.js`.

**Style Interpreter (claude-3.5-sonnet):**
```
You are a Senior Tattoo Architect on the TatT AI Council.
Your role: enrich user prompts into professional, tattoo-ready generation prompts.
Return ONLY valid JSON. No prose. No markdown.

Rules:
- POSITIONAL ANCHORING: Use explicit positional anchoring (e.g., "[wolf] on left, [moon] on right") to ensure layered RGBA decomposition.
- SPATIAL KEYWORDS: Include directional anchors: left, right, background, foreground, behind.
- NEGATIVE SHIELD: Always include: "(shading, gradients, shadows, blur, 3d, realistic, photorealistic, low contrast, grey, messy lines, sketch: 1.5)"
- AESTHETIC ANCHORS: End enriched prompt with: "high-contrast blackwork, professional flash art, masterpiece line-work, crisp edges, clean skin canvas"
- MAX 120 words in enrichedPrompt.

Output schema:
{
  "enrichedPrompt": string,
  "negativePrompt": string,
  "styleTags": string[],
  "compositionHints": string
}
```

**Placement Specialist (gpt-4-turbo):**
```
You are a tattoo placement expert. Given style tags and body region, return optimal stencil layout parameters.
Return ONLY valid JSON. No prose.

Consider: skin curvature, muscle flow, joint proximity, typical tattoo sizing conventions.
Output schema:
{
  "orientation": "vertical" | "horizontal" | "radial",
  "anchorPoints": [[number, number], [number, number]],
  "recommendedSizeMm": { "w": number, "h": number },
  "flowDescription": string,
  "wrapGuidance": string
}
```

**Artist Matchmaker (gemini-pro-1.5) — used for reasoning only; actual matching is vector+graph:**
```
You are an artist-matching strategist. Given style tags, identify the 2-3 most important style characteristics that would distinguish a highly-matched artist. Return ONLY valid JSON.

Output schema:
{
  "primaryStyleSignal": string,
  "secondarySignals": string[],
  "mustAvoid": string[],
  "searchPriority": "semantic" | "graph" | "hybrid"
}
```

---

---

## Appendix D — Production Status (as of 2026-03-08 09:15 MST)

> This section is updated each time a subagent audits the live stack. Merge into the main risk register when items are resolved.

### Frontend

| URL | Status | Notes |
|---|---|---|
| `tatt-app.vercel.app` | ✅ 200 | **Canonical URL — use this** |
| `tat-t-3x8t.vercel.app` | ❌ 404 | Old deployment gone — remove from all docs |
| `/gallery` | ❌ 404 | Route doesn't exist yet |
| `NEXT_PUBLIC_DEMO_MODE` | 🔴 `true` | App shows Unsplash mocks, not real AI |

### Backend (Railway — NOT Cloud Run as arch doc assumes for primary)

| Service | Status | Notes |
|---|---|---|
| `/api/health` | ✅ 200 | Railway primary responding |
| `/api/health/startup` | ❌ 503 | GCS/Vertex/Neo4j init failures |
| Cloud Run (`pangyo-*`) | ⚠️ Unknown | CI/CD not wired — no confirmed deploy since Feb |

**Railway topology — TWO projects exist:**
- `generous-success` (6c984fbf) — Env: a905251f  
- `tender-youth` (a0fa4f56) — Env: 85f0adc7  

⚠️ Architecture target is Cloud Run as primary. Current reality is Railway. This split must be resolved in Phase 0.

### Data Layer

| Component | Status | Notes |
|---|---|---|
| Supabase (`yfcmysjmoehcyszvkxsr`) | 🔴 **DELETED** | DNS: `NXDOMAIN` — project doesn't exist. Free-tier deletion after inactivity. Must recreate + re-run migrations + update Railway env vars |
| Neo4j AuraDB | ✅ Config correct | `neo4j+s://36767c9d.databases.neo4j.io` — encryption correct |
| GCS bucket `tatt-pro-assets` | ✅ Exists | us-central1, CORS configured for Vercel origins |
| Firestore | ✅ via `GOOGLE_CREDENTIALS_BASE64` | Startup writes JSON to `/app/google-credentials.json` |

### GCP Credentials

Old service account (`tatt-481620`) was wrong project. **Fixed 2026-03-01:**
- New SA: `tatt-service@tatt-pro.iam.gserviceaccount.com`  
- Key ID: `ef1d35fead5177c8ea93702464e0089a18529d6a`  
- `GOOGLE_CREDENTIALS_BASE64` updated on both Railway envs  
- `VERTEX_PROJECT_ID=tatt-pro` and `GCS_BUCKET=tatt-pro-assets` added

⚠️ **Rotation due:** This key was added manually — not rotated via Secret Manager. Rotate within 90 days (deadline: 2026-06-01).

### Build Issues

| Issue | Severity | Status |
|---|---|---|
| Tailwind v3/v4 mismatch (`^3.4.17` resolved to `4.x`) | 🔴 Build blocker | Needs `npm install tailwindcss@3.4.17 --save-exact`, remove `postcss.config.mjs`, keep `.cjs` |
| Dual PostCSS configs (`postcss.config.mjs` + `postcss.config.cjs`) | 🔴 | Delete `.mjs` — v4 `nesting` plugin path doesn't exist |
| Legacy Vite pages in `src/pages/` (8 files) | 🟡 | Coexist with Next.js App Router — not accessible via routing, but cause import confusion |
| Dual routing: `src/app/api/` (Next.js) + `src/api/routes/` (Express) | 🟡 | Consolidate in Phase 1 |

### Updated Risk Register Additions

These items supplement the main risk register in §8:

| # | Blocker | Severity | Mitigation |
|---|---|---|---|
| 14 | Supabase project **deleted** (not paused) — no vector store | **P0 Critical** | Recreate project, re-run `supabase/migrations/`, re-seed artists, update Railway SUPABASE_URL + keys |
| 15 | Railway is actual primary (not Cloud Run) — arch doc discrepancy | **P1** | Decide: commit to Railway OR complete Cloud Run WIF setup. Cannot run both as write primaries |
| 16 | Tailwind v3/v4 mismatch blocks clean builds | **P0** | Pin `tailwindcss@3.4.17` exactly, delete `postcss.config.mjs` |
| 17 | GCP SA key added manually, not via Secret Manager rotation | **P2** | Import to Secret Manager, set 90-day rotation, wire Eventarc → Cloud Run redeploy |
| 18 | Railway has TWO active projects (`generous-success` + `tender-youth`) — unclear which is canonical | **P1** | Determine canonical project, decommission the other, update all docs and env pointers |

---

---

## Appendix E — Observability, SLOs & Budget Controls

### Service Level Objectives

These are the targets for a YC Demo Day-ready system. They are not aspirational — they are the bar below which the demo is embarrassing.

| Endpoint | SLO | Current Baseline | Gap |
|---|---|---|---|
| `/api/generate` (first SSE event) | < 300ms | ~800ms (council sync) | Needs SSE refactor |
| `/api/generate` (512px preview) | < 5s | Unknown (no telemetry) | Add timing |
| `/api/generate` (1024px full) | < 15s | ~12s Imagen, ~7s Replicate | ✅ Within target |
| `/api/match` | < 500ms | ~280ms (per §4 spec) | ✅ Within target |
| `/api/stencil/export` | < 3s | Unknown | Add timing |
| `/api/health` | < 100ms | ~50ms Railway | ✅ |
| Frontend LCP (`/generate`) | < 2.5s | Unknown (Vercel) | Add RUM |

### GCP Cloud Monitoring Setup

All Cloud Run-hosted services emit metrics automatically. The following custom metrics need to be instrumented:

```typescript
// src/services/telemetry.ts  (new)
import { Monitoring } from '@google-cloud/monitoring';

const monitoring = new Monitoring.MetricServiceClient();

export async function recordGenerationLatency(
  step: 'council' | 'preview' | 'full' | 'match',
  durationMs: number,
  bypassed: boolean
) {
  const projectName = `projects/${process.env.GCP_PROJECT_ID}`;
  await monitoring.createTimeSeries({
    name: projectName,
    timeSeries: [{
      metric: {
        type: `custom.googleapis.com/tatt/generation_latency_ms`,
        labels: { step, bypassed: String(bypassed) }
      },
      resource: { type: 'global', labels: { project_id: process.env.GCP_PROJECT_ID! } },
      points: [{
        interval: { endTime: { seconds: Date.now() / 1000 } },
        value: { doubleValue: durationMs }
      }]
    }]
  });
}
```

### Budget Controls (Vertex AI / OpenRouter)

TatT uses three AI budget sources. All three need hard caps before going live with real users.

**Vertex AI (Imagen 3):**
```
GCP Console → Billing → Budgets & Alerts
Budget name: tatt-vertex-daily
Amount: $20/day (hard cap)
Alert thresholds: 50% → Slack #alerts, 90% → Slack #alerts + page Samson
Action on 100%: Cloud Function disables Vertex billing account → 
               generationRouter.ts falls back to Replicate for all requests
```

**OpenRouter (Council — claude-3.5, gpt-4-turbo, gemini-pro):**
```
OpenRouter dashboard → Usage limits
Monthly cap: $50 (YC demo period)
Per-request model caps:
  claude-3.5-sonnet:  max 500 tokens/call (council response is JSON, concise)
  gpt-4-turbo:        max 300 tokens/call (stencil params JSON only)
  gemini-pro-1.5:     max 200 tokens/call (matchmaking signal only)
```

**Replicate (fallback generation):**
```
Replicate billing → Spending limits
Monthly cap: $30
Hard limit: enabled (jobs fail after cap, not continue billing)
```

**Per-user quota enforcement (server-side, Supabase):**
```sql
-- Check before every generation request
SELECT 
  COUNT(*) as generations_this_month,
  u.tier,
  CASE WHEN u.tier = 'free' THEN 3
       WHEN u.tier = 'pro' THEN 100
       ELSE 999999 END as monthly_limit
FROM designs d
JOIN users u ON u.id = d.user_id
WHERE d.user_id = $1
  AND d.created_at >= date_trunc('month', now())
GROUP BY u.tier;
-- If generations_this_month >= monthly_limit → 402 Payment Required
```

### Alerting Policy

All alerts fire to `#alerts` Slack channel. Critical alerts also DM Samson directly.

```yaml
# Cloud Monitoring alert policies (apply via gcloud):

- display_name: "TatT — Generation Error Rate High"
  conditions:
    - condition_threshold:
        filter: 'metric.type="custom.googleapis.com/tatt/generation_latency_ms"'
        comparison: COMPARISON_GT
        threshold_value: 30000   # 30s = something badly wrong
        duration: 60s
  notification_channels: [slack-alerts, samson-pagerduty]

- display_name: "TatT — Vertex AI Quota 90%"
  conditions:
    - condition_threshold:
        filter: 'metric.type="serviceruntime.googleapis.com/quota/rate/net_usage"'
  notification_channels: [slack-alerts]

- display_name: "TatT — Railway 5xx Rate"
  conditions:
    - condition_threshold:
        filter: 'metric.type="custom.googleapis.com/tatt/http_5xx_rate"'
        threshold_value: 0.05   # >5% error rate
  notification_channels: [slack-alerts, samson-pagerduty]
```

### Logging Standard

All server-side logs must follow this structured format (Cloud Logging ingestible):

```typescript
// Every API request:
console.log(JSON.stringify({
  severity: 'INFO',          // INFO | WARNING | ERROR | CRITICAL
  message: 'generation_complete',
  designId,
  userId: uid,
  councilMs,
  generationMs,
  modelUsed,
  bypassed,
  previewReady: previewMs,
  ts: new Date().toISOString()
}));
```

Cloud Logging auto-parses JSON stdout from Cloud Run. This gives us queryable latency histograms without any extra instrumentation overhead.

### Real User Monitoring (Vercel / Next.js)

Add to `src/app/layout.tsx`:
```typescript
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

// In the layout return:
<SpeedInsights />    // Core Web Vitals + LCP/FID/CLS
<Analytics />        // Page views, conversion funnel
```

Then track generation funnel in `useGenerationStream.ts`:
```typescript
// On each step, emit a Vercel Analytics event:
track('generation_step', { step, durationMs, bypassed });
track('generation_complete', { totalMs, modelUsed, councilBypassed });
track('artist_match_click', { artistId, score });
```

This gives us the YC demo data story: "X% of users see a preview in <5s. Y% click an artist match."

---

## Appendix F — Security Model & Auth Flow

### Auth Architecture

TatT uses Firebase Auth as the identity provider, with JWTs validated server-side on every API request.

```
User (browser)
  │
  ├─ 1. Firebase Auth SDK signs in (Google OAuth or email/pass)
  │      Returns: Firebase ID token (JWT, 1-hour expiry)
  │
  ├─ 2. Client includes token in every API call:
  │      Authorization: Bearer <firebase-id-token>
  │
  ├─ 3. server.js Express middleware:
  │      import { getAuth } from 'firebase-admin/auth';
  │      const decoded = await getAuth().verifyIdToken(token);
  │      req.user = { uid: decoded.uid, email: decoded.email, tier: decoded.tier };
  │
  ├─ 4. Token auto-refresh: Firebase SDK refreshes silently every 55 minutes
  │      Client never needs to handle expiry manually
  │
  └─ 5. Service-to-service (Cloud Run → GCS / Vertex / Firestore):
         Workload Identity Federation — no static keys
         Cloud Run service account: tatt-service@tatt-pro.iam.gserviceaccount.com
         Permissions: roles/storage.objectAdmin, roles/aiplatform.user, roles/datastore.user
```

### Custom Claims (Tier Enforcement)

Firebase Auth supports custom claims — we use them to embed the user's subscription tier in the JWT so the server doesn't need a database lookup per request.

```typescript
// When user upgrades to Pro (Stripe webhook → Firebase Admin):
import { getAuth } from 'firebase-admin/auth';

await getAuth().setCustomUserClaims(uid, {
  tier: 'pro',           // free | pro | studio
  generationsLimit: 100,
  councilEnabled: true,
  bypassEligible: true
});
// JWT updated on next refresh — takes effect within 1 hour
// For instant enforcement: force token refresh via client SDK
```

Server-side check (zero DB lookups):
```typescript
// In Express middleware, after verifyIdToken:
const tier = decoded.tier ?? 'free';
const councilEnabled = decoded.councilEnabled ?? false;
const bypassEligible = decoded.bypassEligible ?? false;

// Quota enforcement uses the Supabase query from Appendix E
// Tier from JWT; count from DB. No N+1 queries.
```

### API Key Security Matrix

| Key | Where it lives | Client-visible? | Rotation period |
|---|---|---|---|
| Firebase Client Config | `NEXT_PUBLIC_FIREBASE_*` env vars | ✅ Yes (by design — public API key) | Never (domain-restricted) |
| Firebase Admin SDK | `GOOGLE_CREDENTIALS_BASE64` (Cloud Run env) | ❌ Server-only | 180 days |
| OpenRouter API Key | `OPENROUTER_API_KEY` (Cloud Run env) | ❌ Server-only | 90 days |
| Vertex AI / GCP | Workload Identity (no static key) | ❌ N/A | N/A |
| Supabase Anon Key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes (row-level security enforces access) | Never |
| Supabase Service Key | `SUPABASE_SERVICE_KEY` (Cloud Run env) | ❌ Server-only | 90 days |
| Replicate API Token | `REPLICATE_API_TOKEN` (Cloud Run env) | ❌ Server-only | 90 days |
| Neo4j Password | `NEO4J_PASSWORD` (Cloud Run env) | ❌ Server-only | 180 days |
| Stripe Secret Key | `STRIPE_SECRET_KEY` (Cloud Run env) | ❌ Server-only | On breach only |
| Stripe Publishable Key | `NEXT_PUBLIC_STRIPE_PK` | ✅ Yes (by design) | Never |

**P0 alert:** `VITE_OPENROUTER_API_KEY` with `VITE_` prefix ships the key to the client bundle. This is the single most critical security fix in Phase 0. It must be renamed to `OPENROUTER_API_KEY` and moved to a server-side API route.

### Supabase Row-Level Security (RLS)

All Supabase tables must have RLS enabled. These policies are the minimum required before going live:

```sql
-- designs table: users can only read/write their own designs
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_designs" ON designs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "public_designs_readable" ON designs
  FOR SELECT USING (is_public = true);

-- tattoo_artists: public read, admin write only
ALTER TABLE tattoo_artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artists_public_read" ON tattoo_artists
  FOR SELECT USING (true);

CREATE POLICY "artists_admin_write" ON tattoo_artists
  FOR ALL USING (auth.jwt() ->> 'tier' = 'admin');

-- bookings: parties to the booking only
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_parties_only" ON bookings
  FOR ALL USING (
    auth.uid() = user_id OR
    auth.uid() = (SELECT user_id FROM tattoo_artists WHERE id = artist_id)
  );
```

### CORS Policy (Corrected)

```typescript
// server.js — corrected CORS setup
import cors from 'cors';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

// Development fallback (never in production)
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:3000', 'http://localhost:3001');
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: ${origin} not in allowed list`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Session-Id'],
  credentials: true
}));
```

**Cloud Run env var:**
```
ALLOWED_ORIGINS=https://tatt-app.vercel.app,https://tatt.design,https://www.tatt.design
```

### Rate Limiting

```typescript
// server.js — per-IP + per-user rate limiting
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// Global IP rate limit (unauthenticated)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', retryAfterMs: 900000 }
});

// Per-user generation rate limit (authenticated)
const generationLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 min
  max: 3,                      // 3 generations/min per user
  keyGenerator: (req) => req.user?.uid ?? req.ip,
  message: { error: 'Generation rate limit exceeded', retryAfterMs: 60000 }
});

app.use(globalLimiter);
app.post('/api/generate', generationLimiter, generationController);
app.post('/api/v1/generate', generationLimiter, generationController);
```

---

---

## 9. Testing Strategy

> TatT's test surface is three-layered, matching the DOE architecture. Tests belong in the same layer as the code they verify. AI-generated outputs are never directly asserted — they are asserted on *structure*, *latency*, and *bypass behaviour*.

### 9.1 Layer Breakdown

```
Layer 1 — Unit Tests (deterministic code, no mocks needed)
  src/config/councilSkillPack.test.js      ← already exists ✅
  src/utils/matching.test.js               ← TODO
  src/utils/scoreAggregation.test.js       ← TODO
  src/services/generationOrchestrator.test.ts ← TODO (Phase 1)

Layer 2 — Integration Tests (real services, controlled inputs)
  tests/integration/council.test.ts        ← Council pipeline end-to-end
  tests/integration/matching.test.ts       ← RRF fusion with real Supabase
  tests/integration/sse-cascade.test.ts    ← SSE event ordering verification

Layer 3 — E2E / Smoke Tests (real HTTP, Playwright)
  tests/e2e/generate-flow.spec.ts          ← Full generation user flow
  tests/e2e/artist-match.spec.ts           ← Swipe/match interaction
  tests/e2e/stencil-export.spec.ts         ← Export + download
```

### 9.2 Unit Tests — Priority Targets

**`src/services/generationOrchestrator.test.ts` (new — Phase 1 must-have):**

```typescript
import { GenerationOrchestrator } from './generationOrchestrator';

// Mock all three council members
jest.mock('./openRouterCouncil');
jest.mock('./vertex-ai-edge');

describe('GenerationOrchestrator', () => {
  it('merges all three council results into EnrichedGenerationContext', async () => {
    const result = await GenerationOrchestrator.run({
      prompt: 'minimalist wolf',
      style: 'geometric',
      bodyRegion: 'forearm',
      councilEnabled: true
    });
    expect(result).toMatchObject({
      enrichedPrompt: expect.any(String),
      negativePrompt: expect.any(String),
      styleTags: expect.arrayContaining(['geometric']),
      stencilParams: expect.objectContaining({ orientation: expect.any(String) }),
      preMatchedArtists: expect.any(Array),
      bypassed: false
    });
  });

  it('sets bypassed=true and uses defaults when council exceeds 3000ms', async () => {
    // Mock council to take 4 seconds
    jest.mocked(runCouncil).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 4000))
    );
    const result = await GenerationOrchestrator.run({
      prompt: 'wolf',
      style: 'geometric',
      bodyRegion: 'forearm',
      councilEnabled: true
    });
    expect(result.bypassed).toBe(true);
    expect(result.bypassReason).toBe('COUNCIL_TIMEOUT');
    // Defaults from councilSkillPack should be present
    expect(result.negativePrompt).toContain('shading');
  });

  it('short-circuits immediately when councilEnabled=false', async () => {
    const start = Date.now();
    const result = await GenerationOrchestrator.run({
      prompt: 'wolf',
      councilEnabled: false
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(50);   // no network calls
    expect(result.bypassed).toBe(true);
    expect(result.bypassReason).toBe('COUNCIL_DISABLED');
  });

  it('isolates individual council member failures', async () => {
    // Style council fails — placement and matchmaker still succeed
    jest.mocked(runStyleCouncil).mockRejectedValue(new Error('OpenRouter 503'));
    const result = await GenerationOrchestrator.run({
      prompt: 'rose',
      style: 'fine-line',
      bodyRegion: 'wrist',
      councilEnabled: true
    });
    // Stencil params and artist matches still present
    expect(result.stencilParams).toBeDefined();
    expect(result.preMatchedArtists.length).toBeGreaterThan(0);
    // Prompt falls back to raw
    expect(result.bypassReason).toContain('STYLE_COUNCIL_ERROR');
  });
});
```

**`src/utils/scoreAggregation.test.js` (targets existing file):**

```javascript
import { rrfFusion } from './scoreAggregation';

describe('RRF Fusion', () => {
  const semanticResults = [
    { id: 'a1', score: 0.95 },
    { id: 'a2', score: 0.82 },
    { id: 'a3', score: 0.71 }
  ];
  const graphResults = [
    { id: 'a2', overlap: 3 },
    { id: 'a1', overlap: 2 },
    { id: 'a4', overlap: 2 }
  ];

  it('boosts artists appearing in both semantic and graph results', () => {
    const fused = rrfFusion(semanticResults, graphResults, null);
    // a2 appears in both — should rank above a3 (semantic only)
    const a2rank = fused.findIndex(a => a.id === 'a2');
    const a3rank = fused.findIndex(a => a.id === 'a3');
    expect(a2rank).toBeLessThan(a3rank);
  });

  it('includes artists from graph-only results', () => {
    const fused = rrfFusion(semanticResults, graphResults, null);
    expect(fused.map(a => a.id)).toContain('a4');
  });

  it('applies proximity boost when location is provided', () => {
    const location = { lat: 33.4, lng: -112.1 };
    // a1 is near Phoenix, a2 is in New York (mocked in artist fixtures)
    const fused = rrfFusion(semanticResults, graphResults, location);
    // Proximity-boosted artist should rank higher
    expect(fused[0].scoreBreakdown.proximity).toBeGreaterThan(0);
  });
});
```

### 9.3 Integration Tests

**`tests/integration/sse-cascade.test.ts` — SSE event ordering:**

```typescript
import { createServer } from 'http';
import request from 'supertest';
import app from '../../server';

describe('POST /api/generate SSE cascade', () => {
  it('emits events in correct order', async () => {
    const events: string[] = [];
    const response = await request(app)
      .post('/api/generate')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .set('Accept', 'text/event-stream')
      .send({ prompt: 'rose', style: 'fine-line', bodyRegion: 'wrist', councilEnabled: false });

    // Parse SSE events
    const lines = response.text.split('\n').filter(l => l.startsWith('event:'));
    const eventNames = lines.map(l => l.replace('event: ', '').trim());

    // Council is bypassed — should skip council events
    expect(eventNames).not.toContain('council_start');

    // Generation events must appear in order
    const genStart = eventNames.indexOf('generation_start');
    const preview = eventNames.indexOf('preview_ready');
    const genDone = eventNames.indexOf('generation_done');
    const matches = eventNames.indexOf('matches_ready');

    expect(genStart).toBeLessThan(preview);
    expect(preview).toBeLessThan(genDone);
    // Matches can arrive before or with gen_done
    expect(matches).toBeGreaterThanOrEqual(0);
  }, 30_000);

  it('emits council_done before generation_start when council is enabled', async () => {
    const response = await request(app)
      .post('/api/generate')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ prompt: 'wolf', style: 'geometric', bodyRegion: 'forearm', councilEnabled: true });

    const lines = response.text.split('\n').filter(l => l.startsWith('event:'));
    const names = lines.map(l => l.replace('event: ', '').trim());

    const councilDone = names.indexOf('council_done');
    const genStart = names.indexOf('generation_start');
    expect(councilDone).toBeLessThan(genStart);
  }, 30_000);
});
```

### 9.4 E2E Tests (Playwright)

**`tests/e2e/generate-flow.spec.ts`:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Generation Flow — Do It Now UX Cascade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Sign in with test account
    await page.click('[data-testid="signin-google"]');
    // ... auth flow
  });

  test('skeleton appears within 200ms of submit', async ({ page }) => {
    await page.goto('/generate');
    await page.fill('[data-testid="prompt-input"]', 'minimalist wolf geometric forearm');
    
    const submitTime = Date.now();
    await page.click('[data-testid="generate-button"]');
    
    await expect(page.locator('[data-testid="canvas-skeleton"]')).toBeVisible();
    const skeletonTime = Date.now() - submitTime;
    expect(skeletonTime).toBeLessThan(200);
  });

  test('prompt chip appears before 2 seconds', async ({ page }) => {
    await page.goto('/generate');
    await page.fill('[data-testid="prompt-input"]', 'rose fine-line wrist');
    
    const start = Date.now();
    await page.click('[data-testid="generate-button"]');
    await expect(page.locator('[data-testid="prompt-chip"]')).toBeVisible({ timeout: 2000 });
    
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  test('512px preview appears before 6 seconds', async ({ page }) => {
    await page.goto('/generate');
    await page.fill('[data-testid="prompt-input"]', 'wolf geometric');
    
    const start = Date.now();
    await page.click('[data-testid="generate-button"]');
    await expect(page.locator('[data-testid="canvas-preview"]')).toBeVisible({ timeout: 6000 });
    
    expect(Date.now() - start).toBeLessThan(6000);
  });

  test('artist match cards appear in bottom sheet after generation', async ({ page }) => {
    await page.goto('/generate');
    await page.fill('[data-testid="prompt-input"]', 'geometric blackwork sleeve');
    await page.click('[data-testid="generate-button"]');
    
    // Wait for generation complete
    await page.waitForSelector('[data-testid="canvas-full"]', { timeout: 20_000 });
    
    // Artist matches should be present
    const artistCards = page.locator('[data-testid="artist-match-card"]');
    await expect(artistCards).toHaveCount({ min: 1 }, { timeout: 5000 });
  });
});
```

### 9.5 Test Runner Config

**`jest.config.ts`:**
```typescript
export default {
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }] },
  testMatch: ['**/src/**/*.test.{ts,js}', '**/tests/unit/**/*.test.{ts,js}'],
  globalSetup: './tests/setup/globalSetup.ts',   // seed test DB
  globalTeardown: './tests/setup/globalTeardown.ts',
  coverageThreshold: {
    global: { lines: 70, functions: 70, branches: 60 }
  }
};
```

**`playwright.config.ts`:**
```typescript
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }
  ]
});
```

---

## 10. Load Benchmarks & Demo Day Readiness

> YC Demo Day is a **15-minute window** with investors watching a live product. The system must not stall, queue, or error in front of a room. This section defines the load profile, benchmarks, and the go/no-go checklist.

### 10.1 Expected Demo Day Load Profile

```
Scenario: Samson demos live on stage. Simultaneously, 10–20 investors on their phones
          open tatt-app.vercel.app (QR code on slide). All hit /generate at once.

Peak load (burst):
  - 20 concurrent /generate requests
  - 5–10 /api/match requests
  - 50–100 static asset requests (Vercel CDN absorbs these)

Sustained load (post-demo, VC exploration):
  - 5–10 concurrent users over 30–60 minutes
  - Mostly /generate and /artists browsing

External API dependencies at peak:
  - Imagen 3: 20 concurrent calls × $0.020 = $0.40 burst cost
  - OpenRouter council: 60 calls (3 members × 20 users) × ~$0.003 avg = $0.18 burst
  - Total burst cost: < $1.00 — acceptable
```

### 10.2 Cloud Run Scaling Config

```yaml
# cloudbuild.yaml — Cloud Run deploy with concurrency tuning
--concurrency=10            # requests per instance before scaling
--min-instances=1           # always-warm; no cold starts during demo
--max-instances=5           # cap at 5 instances (budget guard)
--cpu=2                     # 2 vCPU per instance (council Promise.all is CPU-hungry)
--memory=2Gi                # 2GB RAM per instance
--timeout=60s               # generous; Imagen can take up to 15s
```

**Why `min-instances=1`:** Cold-start on Cloud Run with Node.js + Firebase init + Neo4j connection pool is 4–8 seconds. One warm instance eliminates cold starts for the first demo request.

**Why `--concurrency=10`:** The council makes 3 external API calls in parallel per request. At 10 concurrent requests, that's 30 outbound connections per instance — within safe limits.

### 10.3 Benchmark Targets vs Current Baselines

| Metric | Demo-Day Target | Current Baseline | Status | Action Needed |
|---|---|---|---|---|
| First SSE event latency | < 300ms | ~800ms | 🔴 Miss | SSE refactor (Phase 1) |
| 512px preview | < 5s | Unknown | 🟡 Unmeasured | Add telemetry |
| 1024px full image (Imagen) | < 15s | ~12s | ✅ Within | None |
| 1024px full image (Replicate) | < 10s | ~7s | ✅ Within | None |
| Artist match `/api/match` | < 500ms | ~280ms | ✅ Within | None |
| Council pipeline (happy path) | < 3000ms | Unknown | 🟡 Unmeasured | Add timing |
| `min-instances=1` cold start | < 500ms | ~6000ms | 🔴 Miss | Set min-instances |
| Concurrent 20-user burst | No errors | Untested | 🔴 Unknown | Load test below |
| Vercel LCP `/generate` | < 2.5s | Unknown | 🟡 Unmeasured | Add SpeedInsights |

### 10.4 Load Test Script

Run this the day before demo day. Fix anything red.

```bash
#!/bin/bash
# tools/load-test-demo.sh
# Requires: hey (https://github.com/rakyll/hey)
# Usage: TATT_TOKEN=... bash tools/load-test-demo.sh

BASE_URL="${TATT_URL:-https://tatt-app.vercel.app}"
TOKEN="${TATT_TOKEN:?Set TATT_TOKEN env var}"
API_URL="${TATT_API_URL:-https://tatt-production.up.railway.app}"

echo "=== 1. Health Check ==="
curl -sf "$API_URL/api/health" | jq .status

echo ""
echo "=== 2. Single generation baseline (council bypassed) ==="
time curl -sf -X POST "$API_URL/api/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"rose","style":"fine-line","bodyRegion":"wrist","councilEnabled":false}' \
  -N --no-buffer | head -c 500

echo ""
echo "=== 3. Concurrent burst: 20 users, 1 request each ==="
hey -n 20 -c 20 -m POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"prompt":"wolf geometric forearm","councilEnabled":false}' \
    "$API_URL/api/generate"

echo ""
echo "=== 4. Match endpoint: 10 concurrent ==="
hey -n 50 -c 10 -m POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"styleHints":["geometric"],"limit":3}' \
    "$API_URL/api/match"

echo ""
echo "=== 5. Frontend LCP check (Lighthouse CLI) ==="
if command -v lighthouse &>/dev/null; then
  lighthouse "$BASE_URL/generate" --only-categories=performance --output=json \
    | jq '.categories.performance.score, .audits["largest-contentful-paint"].displayValue'
else
  echo "Lighthouse not installed — skip"
fi

echo ""
echo "=== Load test complete. Check #tatt-dev for results. ==="
```

### 10.5 Go / No-Go Checklist (Day Before Demo)

Run through every item. If any is ❌, fix it before sleeping.

```
INFRASTRUCTURE
[ ] curl tatt-app.vercel.app/api/health → 200 OK
[ ] curl tatt-production.up.railway.app/api/health/startup → no critical failures
[ ] Cloud Run min-instances=1 set (check: gcloud run services describe pangyo-production)
[ ] Supabase project active (not paused — login to dashboard)
[ ] Neo4j AuraDB reachable (nc -zv 36767c9d.databases.neo4j.io 7687)
[ ] GCS bucket tatt-pro-assets responds (gsutil ls gs://tatt-pro-assets)

GENERATION
[ ] POST /api/generate with councilEnabled=false returns preview_ready < 6s
[ ] POST /api/generate with councilEnabled=true returns council_done < 3s
[ ] Imagen 3 quota not within 80% of daily limit
[ ] Replicate fallback works (set modelPreference=replicate, verify)

DEMO MODE
[ ] NEXT_PUBLIC_DEMO_MODE=false on Vercel (real AI, not Unsplash mocks)
[ ] /generate page loads without JS console errors
[ ] Generate → submit → image appears (full flow end-to-end)
[ ] Artist cards appear after generation

SECURITY
[ ] No VITE_OPENROUTER_API_KEY visible in browser Network tab
[ ] Firebase Auth Google sign-in works on mobile Safari (QR code path)

RECOVERY PLAN (if Imagen fails mid-demo)
[ ] Replicate fallback confirmed working (tested above)
[ ] councilEnabled=false bypass confirmed < 2s first response
[ ] Demo-mode screenshots ready as last resort (in /public/demo/)
```

### 10.6 Demo Day Runbook (15-Minute Window)

```
T-30 min: Run load-test-demo.sh. Fix anything red.
T-15 min: Open tatt-app.vercel.app on demo laptop. Generate 1 test design.
           Verify artist cards appear. Keep tab open — warm connection.
T-5 min:  Show QR code slide early. Let investors scan and arrive at landing.
T-0:      Demo starts. First generation fires from warm instance.
           Expected flow:
             0s   — Submit prompt
             0.1s — Skeleton canvas visible
             0.8s — Enriched prompt chip appears (or "Generating..." if council bypassed)
             4-5s — 512px preview tile renders
             12s  — 1024px full image appears
             12s  — Artist match cards visible in bottom sheet
T+3:      Click artist card → profile page → "Book Consultation" CTA
T+5:      Stencil export → PDF download
T+10:     Mention pricing. Freemium / Pro tier.
T+12:     Investor phones: they should be on /generate by now.
           Their requests hit Cloud Run → same real AI (not demo mode).
T+14:     Close with artist marketplace slide.
T+15:     QA time.

If generation stalls at T+60s:
  → Quietly navigate to /artists — show matching UX instead
  → Keep talking, give Imagen another 30s, switch back
If Imagen returns poor quality:
  → Regenerate once with different seed (retry button)
  → If still bad, use stencil export to show the design pipeline instead
```

---

## Appendix G — User Journey State Machine

> Maps every user-facing state to the system events that drive it. Use this when building `useGenerationStream.ts` — every state transition corresponds to an SSE event.

### G.1 Generation Page State Machine

```
States:
  IDLE          — No active generation. Prompt input visible.
  SUBMITTING    — User clicked Generate. Request in flight.
  SKELETON      — Canvas skeleton rendered. Awaiting first signal.
  COUNCIL_RUN   — Council members processing (spinner with agent names).
  PROMPT_READY  — Enriched prompt chip visible. Generation queued.
  PREVIEW_READY — 512px tile visible. Full image in flight.
  FULL_READY    — 1024px image rendered. Transition complete.
  MATCH_READY   — Artist cards in bottom sheet.
  ERROR         — Any error state. Shows retry + fallback options.
  SAVED         — User saved design to library.

Transitions:
  IDLE          → SUBMITTING    on: user clicks Generate
  SUBMITTING    → SKELETON      on: HTTP 200 + SSE stream opens (< 100ms)
  SKELETON      → COUNCIL_RUN   on: SSE event "council_start"
  SKELETON      → PROMPT_READY  on: SSE event "council_done" (bypassed=true)
  COUNCIL_RUN   → PROMPT_READY  on: SSE event "council_done"
  PROMPT_READY  → PREVIEW_READY on: SSE event "preview_ready"
  PREVIEW_READY → FULL_READY    on: SSE event "generation_done"
  FULL_READY    → MATCH_READY   on: SSE event "matches_ready" (can arrive simultaneously)
  any           → ERROR         on: SSE event "generation_error" with no retrying=true
  any           → SUBMITTING    on: SSE event "generation_error" with retrying=true (auto-retry)
  FULL_READY    → SAVED         on: user clicks Save
  MATCH_READY   → [artist page] on: user clicks artist card

  
Council bypass path (councilEnabled=false):
  IDLE → SUBMITTING → SKELETON → PROMPT_READY (immediate) → PREVIEW_READY → FULL_READY → MATCH_READY
  (COUNCIL_RUN is skipped entirely)
```

```
┌─────────────────────────────────────────────────────────────────────┐
│  GENERATION PAGE STATE MACHINE                                      │
│                                                                     │
│   ┌──────┐  click     ┌───────────┐  stream    ┌──────────┐        │
│   │ IDLE │──────────→ │SUBMITTING │───opens──→ │ SKELETON │        │
│   └──────┘            └───────────┘            └────┬─────┘        │
│                            ↑ retrying=true          │               │
│                            │                  council_start│        │
│                       ┌────┴─────┐                  ↓               │
│                       │  ERROR   │          ┌──────────────┐        │
│                       └────┬─────┘          │ COUNCIL_RUN  │        │
│                            │                └──────┬───────┘        │
│                  error, no │                council_done│            │
│                  retry     │                       ↓                │
│                            │               ┌──────────────┐         │
│                            └───────────────│ PROMPT_READY │         │
│                                            └──────┬───────┘         │
│                                           preview_ready│             │
│                                                   ↓                 │
│                                          ┌───────────────┐          │
│                                          │ PREVIEW_READY │          │
│                                          └──────┬────────┘          │
│                                        generation_done│              │
│                                                  ↓                  │
│                                          ┌─────────────┐            │
│                              ┌──────────→│  FULL_READY │←────────┐  │
│                              │           └──────┬──────┘         │  │
│                              │          matches_ready│            │  │
│                              │                  ↓                │  │
│                              │          ┌─────────────┐          │  │
│                              │          │ MATCH_READY │          │  │
│                              │          └──────┬──────┘          │  │
│                              │                 │                  │  │
│                           save click    artist click           retry │
│                              ↓                 ↓                │  │
│                          ┌───────┐      [artist page]           │  │
│                          │ SAVED │                              │  │
│                          └───────┘                              │  │
└─────────────────────────────────────────────────────────────────────┘
```

### G.2 React State Implementation

```typescript
// src/hooks/useGenerationStream.ts  (new — Phase 1)

type GenerationState =
  | 'IDLE'
  | 'SUBMITTING'
  | 'SKELETON'
  | 'COUNCIL_RUN'
  | 'PROMPT_READY'
  | 'PREVIEW_READY'
  | 'FULL_READY'
  | 'MATCH_READY'
  | 'ERROR'
  | 'SAVED';

interface GenerationPayload {
  state: GenerationState;
  enrichedPrompt?: string;
  styleTags?: string[];
  previewUrl?: string;
  fullUrl?: string;
  designId?: string;
  artists?: PreMatchedArtist[];
  error?: { code: string; message: string; retrying: boolean };
  councilMs?: number;
  bypassed?: boolean;
}

export function useGenerationStream() {
  const [payload, setPayload] = useState<GenerationPayload>({ state: 'IDLE' });

  const generate = useCallback(async (input: GenerationInput) => {
    setPayload({ state: 'SUBMITTING' });

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getToken()}` },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      setPayload({ state: 'ERROR', error: { code: 'HTTP_ERROR', message: response.statusText, retrying: false } });
      return;
    }

    // SSE stream
    setPayload(p => ({ ...p, state: 'SKELETON' }));

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() ?? '';

      for (const chunk of lines) {
        const eventLine = chunk.split('\n').find(l => l.startsWith('event:'));
        const dataLine = chunk.split('\n').find(l => l.startsWith('data:'));
        if (!eventLine || !dataLine) continue;

        const event = eventLine.replace('event: ', '').trim();
        const data = JSON.parse(dataLine.replace('data: ', ''));

        switch (event) {
          case 'council_start':
            setPayload(p => ({ ...p, state: 'COUNCIL_RUN' }));
            break;
          case 'council_done':
            setPayload(p => ({
              ...p,
              state: 'PROMPT_READY',
              enrichedPrompt: data.enrichedPrompt,
              styleTags: data.styleTags,
              councilMs: data.councilMs,
              bypassed: data.bypassed
            }));
            break;
          case 'preview_ready':
            setPayload(p => ({ ...p, state: 'PREVIEW_READY', previewUrl: data.url }));
            break;
          case 'generation_done':
            setPayload(p => ({ ...p, state: 'FULL_READY', fullUrl: data.url, designId: data.designId }));
            break;
          case 'matches_ready':
            setPayload(p => ({ ...p, state: 'MATCH_READY', artists: data.artists }));
            break;
          case 'generation_error':
            if (data.retrying) {
              setPayload(p => ({ ...p, state: 'SUBMITTING' }));
            } else {
              setPayload(p => ({ ...p, state: 'ERROR', error: data }));
            }
            break;
        }
      }
    }
  }, []);

  return { payload, generate };
}
```

### G.3 Artist Discovery Journey

```
Entry points:
  A. Via generation → artist match cards (bottom sheet)
  B. Direct /artists browse (grid of verified artists)
  C. Deep link from Instagram/TikTok (artist sharing their TatT profile)

Journey A (most common post-MVP):
  Generate design
    → Swipe artist match cards (pre-filtered by style + proximity)
      → Tap card → Artist Profile page
        → View portfolio gallery (filtered by style match)
          → "Book Consultation" CTA
            → Inquiry form (design attached automatically)
              → Artist accepts → Deposit request (Stripe)
                → Session confirmed → Calendar invite
                  → Post-session → Review + rating

Journey B (browse first):
  /artists → filter by style + city
    → Artist grid → click artist
      → Profile page (full portfolio)
        → Upload existing design OR → /generate to create new
          → "Match this artist" → booking flow

Journey C (viral / referral):
  Instagram story → "Designed on TatT by @alexromero"
    → Tap link → Artist profile (pre-filled with referral artist)
      → "Try a design" CTA → /generate with artist's styles pre-seeded
        → User generates → sees artist as top match (of course)
          → Books the artist who shared the link

Key UX principle for Journey C:
  When a user arrives via referral link (?ref=artist:{id}), the GenerationOrchestrator
  should pre-seed the council matchmaker with that artist's style profile:
    → User's generation will produce a design that matches the referring artist's style
    → Referring artist is guaranteed to appear in top match results
    → This is NOT manipulation — it's context-aware generation
```

### G.4 Booking State Machine

```
INQUIRY_SENT      → on: user submits booking form
INQUIRY_SEEN      → on: artist opens notification
INQUIRY_ACCEPTED  → on: artist clicks Accept
DEPOSIT_PENDING   → on: system sends Stripe payment link
DEPOSIT_PAID      → on: Stripe webhook confirms payment
SESSION_CONFIRMED → on: both parties confirm date/time
SESSION_COMPLETE  → on: session date passes + artist marks complete
REVIEW_PENDING    → on: system prompts user for review (24h post-session)
REVIEW_DONE       → on: user submits rating + review
ARCHIVED          → on: booking is >180 days old

Cancellation paths:
  Any state before DEPOSIT_PAID → CANCELLED (no charge)
  DEPOSIT_PAID or later → CANCELLATION_REQUESTED → artist decides:
    → REFUNDED (artist cancels) or DISPUTED → manual review
```

---

---

## 11. Feature Flag System

> All Phase 1–2 changes described in this document are risky enough to warrant controlled rollout. This section defines the feature flag architecture that lets us ship incrementally, A/B test, and roll back without a redeploy.

### 11.1 Why Feature Flags Beat Feature Branches

The agent OS has a relevant parallel: the `do-it-now` bypass was **always on** from day one. There was no gradual rollout. The consequence: if the bypass logic was wrong, every session would be broken — not just new sessions.

TatT's council integration and UX cascade are both high-risk changes to the core generation path. A single bug in `GenerationOrchestrator` would break generation for every user simultaneously. Feature flags give us:

| Without flags | With flags |
|---|---|
| Bug in orchestrator breaks all users | Bug only hits flagged users (5% canary) |
| Rollback = redeploy (3–5 min outage) | Rollback = flag flip (< 30s, no redeploy) |
| No perf comparison (before/after) | Live A/B: old path vs new path, real metrics |
| Demo Day risk: untested in prod at scale | Demo Day: flag to 100% only after load test passes |

### 11.2 Flag Definitions

```typescript
// src/config/featureFlags.ts

export interface TatTFlags {
  // Phase 1: council + UX cascade
  council_enabled:           boolean;   // master kill-switch for all council calls
  ux_cascade_enabled:        boolean;   // skeleton → chip → preview → full
  preview_fast_pass:         boolean;   // 512px fast-pass before full image
  artist_parallel_match:     boolean;   // match fires at generation_start, not generation_done
  embed_on_creation:         boolean;   // sync embedding before matches_ready fires

  // Phase 2: data layer
  geo_proximity_matching:    boolean;   // filter artists by lat/lng
  design_library_enabled:    boolean;   // /designs page
  user_style_profile:        boolean;   // weighted embedding across past designs

  // Phase 3: monetisation
  freemium_quota_enabled:    boolean;   // enforce free/pro limits
  booking_flow_enabled:      boolean;   // inquiry → deposit → session

  // Infra
  cloud_run_primary:         boolean;   // use Cloud Run (not Railway) as API primary
  telemetry_enabled:         boolean;   // emit custom GCP metrics
}

export const FLAG_DEFAULTS: TatTFlags = {
  council_enabled:           false,    // off until Phase 1 ships
  ux_cascade_enabled:        false,    // off until Phase 1 ships
  preview_fast_pass:         false,
  artist_parallel_match:     false,
  embed_on_creation:         false,
  geo_proximity_matching:    false,
  design_library_enabled:    false,
  user_style_profile:        false,
  freemium_quota_enabled:    false,
  booking_flow_enabled:      false,
  cloud_run_primary:         false,    // Railway is current primary
  telemetry_enabled:         true,     // safe to enable immediately
};
```

### 11.3 Flag Evaluation — Server-Side

Flags are evaluated server-side per request. The evaluation chain:

```
1. Hard-coded defaults (FLAG_DEFAULTS above) — the floor
2. Environment variable overrides (TATT_FLAGS_JSON in Cloud Run env)
3. User-level overrides (Firestore: users/{uid}/flags — for beta testers)
4. A/B bucket assignment (deterministic hash of uid — no DB lookup)
```

```typescript
// src/services/featureFlagService.ts

import { getFirestore } from 'firebase-admin/firestore';

const ENV_FLAGS = process.env.TATT_FLAGS_JSON
  ? JSON.parse(process.env.TATT_FLAGS_JSON) as Partial<TatTFlags>
  : {};

export async function getFlagsForUser(uid: string): Promise<TatTFlags> {
  // Layer 1: defaults + env overrides
  const base: TatTFlags = { ...FLAG_DEFAULTS, ...ENV_FLAGS };

  // Layer 2: user-specific overrides (beta opt-ins)
  const userFlagsDoc = await getFirestore()
    .doc(`users/${uid}/flags/overrides`)
    .get();
  const userFlags = userFlagsDoc.exists ? userFlagsDoc.data() as Partial<TatTFlags> : {};

  // Layer 3: A/B bucket (council_enabled: 20% of users)
  const abBucket = stableHash(uid) % 100;
  const abFlags: Partial<TatTFlags> = {};

  if (base.council_enabled === false && abBucket < 20) {
    // 20% canary: gets council even when globally off
    abFlags.council_enabled = true;
    abFlags.ux_cascade_enabled = true;
  }

  return { ...base, ...abFlags, ...userFlags };
}

// Deterministic hash — same uid always gets same bucket
function stableHash(uid: string): number {
  let hash = 0;
  for (const char of uid) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}
```

### 11.4 Using Flags in the Generation Pipeline

```typescript
// In GenerationOrchestrator.run():

const flags = await getFlagsForUser(uid);

// Do It Now bypass: council disabled or global kill-switch
if (!flags.council_enabled || input.councilEnabled === false) {
  return {
    enrichedPrompt: input.prompt,
    negativePrompt: COUNCIL_SKILL_PACK.negativeShield,
    styleTags: [input.style ?? 'geometric'],
    stencilParams: getDefaultStencilParams(input.bodyRegion),
    preMatchedArtists: [],
    councilMs: 0,
    bypassed: true,
    bypassReason: flags.council_enabled ? 'USER_DISABLED' : 'FLAG_DISABLED',
  };
}

// Artist parallel match: fire at generation_start if flag is on
if (flags.artist_parallel_match) {
  matchPromise = councilMatchmaker.matchArtists(input.styleTags ?? [], input.location);
  // matchPromise runs in background; we don't await here
}

// Preview fast pass: add fast 512px call if flag is on
if (flags.preview_fast_pass) {
  previewPromise = vertexAiEdge.generate512px(enrichedContext.enrichedPrompt);
}
```

### 11.5 Rollout Playbook

Each Phase 1 feature follows this rollout sequence:

```
1. Ship behind flag (flag_name=false in defaults)
2. Enable for internal users only (Firestore override for Samson's uid)
3. Test: run E2E suite against prod with flag=true
4. Canary: set TATT_FLAGS_JSON to enable for 5% of users via A/B bucket
5. Monitor: watch latency metrics + error rate for 24h
6. If clean: bump to 20% → 50% → 100%
7. Once at 100% for 7 days: make it the default in FLAG_DEFAULTS, remove flag
```

**Demo Day exception:** For the demo, set `TATT_FLAGS_JSON` to enable all Phase 1 flags for 100% of users 24h before demo. This gives us a full day of production-validated performance before investors are in the room.

```bash
# Enable all Phase 1 flags for Demo Day (24h before)
gcloud run services update pangyo-production \
  --update-env-vars TATT_FLAGS_JSON='{"council_enabled":true,"ux_cascade_enabled":true,"preview_fast_pass":true,"artist_parallel_match":true,"embed_on_creation":true}' \
  --region us-central1
```

### 11.6 Flag Observability

Every flag decision should be logged (telemetry must be `enabled`):

```typescript
// Log flag evaluation for every /api/generate request
console.log(JSON.stringify({
  severity: 'INFO',
  message: 'flags_evaluated',
  uid,
  flags: {
    council_enabled: flags.council_enabled,
    ux_cascade_enabled: flags.ux_cascade_enabled,
    bypassed: result.bypassed,
    bypassReason: result.bypassReason,
    abBucket: stableHash(uid) % 100,
  },
  ts: new Date().toISOString()
}));
```

This gives us a Cloud Logging query to see the live A/B split:

```
# Cloud Logging query — council A/B split
resource.type="cloud_run_revision"
jsonPayload.message="flags_evaluated"
timestamp >= "2026-03-08T00:00:00Z"

# Aggregate: count council_enabled=true vs false
```

---

## 12. Multi-Agent Coordination Protocol

> §2.2 defined the three council members and their roles. This section defines how they communicate, fail independently, and merge results — the coordination protocol that makes the council a real system rather than three isolated LLM calls.

### 12.1 The Coordination Problem

The three council members — Style Interpreter, Placement Specialist, Artist Matchmaker — run in `Promise.all()`. This is parallel, not coordinated. Parallel is fast. But it means:

1. **No shared context:** Style Interpreter produces an `enrichedPrompt`. Placement Specialist doesn't know about it — it works from the raw prompt. This is fine for Phase 1, but it means the stencil parameters are based on raw style tags, not the enriched artistic vision.

2. **No inter-member signalling:** If Style Interpreter detects the design is extremely complex (multi-sleeve, full back piece), Placement Specialist should adapt its stencil params accordingly. Currently it can't — there's no coordination bus.

3. **Merge is dumb:** `GenerationOrchestrator` merges by simple object spread. If Style Council returns `enrichedPrompt: "X"` and Placement Specialist returns stencil params optimised for a different style, there's no reconciliation.

Phase 1 ships with dumb-merge (fast, simple, good enough). Phase 2 introduces the coordination protocol below.

### 12.2 Two-Phase Execution Model (Phase 2)

```
Phase A: Parallel fast pass (same as Phase 1)
  ├─ Style Interpreter runs with raw prompt + style tag
  ├─ Placement Specialist runs with raw body region + style tag
  └─ Artist Matchmaker runs with raw style tags + location
  Timeout: 2000ms (tighter than Phase 1's 3000ms)

Phase B: Synthesis pass (new in Phase 2)
  Input: Phase A outputs merged into PartialContext
  ├─ Style Interpreter (second pass): given stencilParams from Placement Specialist,
  │    refine enrichedPrompt to match orientation + size constraints
  │    e.g., "vertical composition, max width 60mm" → adjusts composition hints
  └─ Reconcile: merge Phase A + Phase B → FinalEnrichedContext
  Timeout: 1000ms (total council budget now 3000ms: 2s phase A + 1s phase B)
```

```typescript
// src/services/generationOrchestrator.ts  — Phase 2 update

async function runTwoPhaseCouncil(input: GenerationInput): Promise<EnrichedGenerationContext> {
  const PHASE_A_TIMEOUT = 2000;
  const PHASE_B_TIMEOUT = 1000;

  // ── PHASE A ──────────────────────────────────────────────────────
  const [styleResult, placementResult, matchResult] = await Promise.race([
    Promise.all([
      styleCouncil.run(input),
      placementSpecialist.run(input),
      artistMatchmaker.run(input)
    ]),
    timeout(PHASE_A_TIMEOUT, 'PHASE_A_TIMEOUT')
  ]);

  // ── PHASE B ──────────────────────────────────────────────────────
  // Refinement: style council sees placement params, tightens composition
  const refinedStyleResult = await Promise.race([
    styleCouncil.refine({
      ...input,
      stencilParams: placementResult.stencilParams,
      prevEnrichedPrompt: styleResult.enrichedPrompt
    }),
    timeout(PHASE_B_TIMEOUT, 'PHASE_B_TIMEOUT')
  ]).catch(() => styleResult); // If phase B times out, use phase A style result

  return merge(refinedStyleResult, placementResult, matchResult);
}
```

**Why this is worth the extra latency:** A forearm design that the Style Interpreter thinks should be "massive, sprawling" but the Placement Specialist correctly identifies as constrained to 60×140mm — those two outputs, without synthesis, produce a prompt that asks Imagen for something it can't fit. With Phase B, the Style Interpreter sees "60×140mm vertical forearm" and writes a composition-aware enriched prompt.

### 12.3 Council Member Failure Isolation Matrix

Every failure mode has a defined fallback. The orchestrator never lets one member's failure propagate:

| Member | Failure Mode | Fallback | Impact |
|---|---|---|---|
| Style Interpreter | OpenRouter 429/503 | Raw prompt + `councilSkillPack.negativeShield` | Slightly weaker prompt, correct negative prompt |
| Style Interpreter | JSON parse error | Same fallback | Same impact |
| Style Interpreter | Timeout (>2000ms) | Same fallback | `bypassed=true` on style only |
| Placement Specialist | Any failure | `getDefaultStencilParams(bodyRegion)` from skill pack | Default stencil params |
| Artist Matchmaker | Vertex AI error | Skip pre-matching; match fires after generation_done | Artist cards arrive 8-15s late |
| Artist Matchmaker | Supabase unavailable | Empty `preMatchedArtists: []` | No artist cards — show "explore artists" CTA |
| **All three** | Total council failure | Full bypass — raw prompt, defaults, no pre-match | Worst case: still generates, still works |

The key invariant: **image generation always fires**. The council enriches. The council does not block.

```typescript
// Explicit per-member error isolation in GenerationOrchestrator

const [styleResult, placementResult, matchResult] = await Promise.all([
  styleCouncil.run(input).catch(err => ({
    ...STYLE_FALLBACK,
    error: err.message,
    bypassed: true,
    bypassReason: 'STYLE_COUNCIL_ERROR'
  })),
  placementSpecialist.run(input).catch(() => ({
    ...getDefaultStencilParams(input.bodyRegion),
    bypassed: true
  })),
  artistMatchmaker.run(input).catch(() => ({
    preMatchedArtists: [],
    bypassed: true
  }))
]);
```

### 12.4 Council Output Contracts — Formal Schema

These are the exact TypeScript interfaces each council member must return. Deviation from these causes a merge error. Use Zod validation at the boundary:

```typescript
// src/types/council.ts

import { z } from 'zod';

export const StyleCouncilOutputSchema = z.object({
  enrichedPrompt:   z.string().max(500),
  negativePrompt:   z.string().max(300),
  styleTags:        z.array(z.string()).min(1).max(8),
  compositionHints: z.string().max(200),
  bypassed:         z.boolean().optional().default(false),
  bypassReason:     z.string().optional(),
});

export const PlacementOutputSchema = z.object({
  orientation:         z.enum(['vertical', 'horizontal', 'radial']),
  anchorPoints:        z.array(z.tuple([z.number(), z.number()])).length(2),
  recommendedSizeMm:   z.object({ w: z.number(), h: z.number() }),
  flowDescription:     z.string(),
  wrapGuidance:        z.string().optional(),
  bypassed:            z.boolean().optional().default(false),
});

export const MatchmakerOutputSchema = z.object({
  preMatchedArtists:   z.array(z.object({
    id:    z.string().uuid(),
    name:  z.string(),
    score: z.number().min(0).max(1),
    scoreBreakdown: z.object({
      semantic:  z.number(),
      graph:     z.number(),
      proximity: z.number(),
    }),
  })).max(5),
  searchPriority:      z.enum(['semantic', 'graph', 'hybrid']).optional(),
  bypassed:            z.boolean().optional().default(false),
});

// Validate at council member boundary:
export function validateStyleOutput(raw: unknown) {
  const result = StyleCouncilOutputSchema.safeParse(raw);
  if (!result.success) {
    console.error('StyleCouncil output validation failed', result.error);
    return { ...STYLE_FALLBACK, bypassed: true, bypassReason: 'VALIDATION_ERROR' };
  }
  return result.data;
}
```

**Why Zod validation matters:** LLMs return malformed JSON under load. Without validation, a single malformed `anchorPoints` value crashes the stencil service and the user sees a blank canvas. With Zod, the fallback kicks in before the bad data propagates downstream.

### 12.5 Observability — Council Coordination Metrics

Beyond the individual member latencies, we need to track merge quality:

```typescript
// After council completes, emit coordination metrics
console.log(JSON.stringify({
  severity: 'INFO',
  message: 'council_coordination',
  designId,
  phase_a_ms:         phaseAMs,
  phase_b_ms:         phaseBMs || 0,
  style_bypassed:     styleResult.bypassed,
  placement_bypassed: placementResult.bypassed,
  match_bypassed:     matchResult.bypassed,
  full_bypass:        allBypassed,
  artist_count:       matchResult.preMatchedArtists.length,
  // Merge quality signal: did style + placement agree on orientation?
  orientation_match:  styleResult.compositionHints?.includes(placementResult.orientation),
  ts: new Date().toISOString()
}));
```

Cloud Logging dashboard query for merge quality:
```
jsonPayload.message="council_coordination"
jsonPayload.orientation_match=false
```

If this query returns hits > 10% of generations, the Phase B synthesis pass should be tuned — the style and placement members are disagreeing too often.

### 12.6 The "Council Memory" Extension (Phase 3)

Once we have 1,000+ completed designs with council outputs stored in Supabase, we can replace the LLM-based Placement Specialist with a **learned placement model**:

```
Input:  style_tags[] + body_region + skin_tone + design_complexity_score
Output: stencilParams (orientation, anchorPoints, recommendedSizeMm)
Trained on: 1,000 successful designs where user booked an artist
            (booking = implicit quality signal: the design was good enough to execute)
```

This is the "self-annealing" pattern from §2.3 Pattern 3, applied at model layer: the council learns from past successes and hardcodes them into a deterministic lookup, eliminating the LLM call and the JSON-parse fragility entirely.

The learned model replaces the gpt-4-turbo Placement Specialist call — saving ~$0.003/generation and reducing council latency by 600ms. This is Phase 3 work, but the data collection starts now: `designs.stencil_params` (Supabase M002) stores every council output. By Phase 3, we have the training set.

---

## Appendix H — Incident Response Playbook

> Production incidents during Demo Day or beta testing need a fast, documented response path. This playbook covers the 5 most likely failure modes and their immediate fixes.

---

### H.1 Incident Classification

```
SEV-1: Complete generation failure — users cannot generate designs
       Response: < 5 min first response, < 15 min resolution or fallback
       Notify: Samson DM immediately

SEV-2: Degraded generation — generates but council/preview/matches broken
       Response: < 15 min first response, < 1h resolution
       Notify: #tatt-dev

SEV-3: Non-critical degradation — stencil export broken, booking flow down
       Response: < 4h
       Notify: #tatt-dev

SEV-4: Data/cosmetic issues — wrong artist cards, stale matching
       Response: next working session
       Notify: JIRA/GitHub issue
```

---

### H.2 Playbook: Imagen 3 Quota Exceeded (SEV-1)

**Symptoms:** `POST /api/generate` returns 429 or `IMAGEN_QUOTA_EXCEEDED` SSE event. All generations fail.

**Immediate (< 2 min):**
```bash
# 1. Verify it's a quota issue
gcloud logging read 'resource.type="cloud_run_revision" jsonPayload.message="generation_error" jsonPayload.code="IMAGEN_QUOTA_EXCEEDED"' \
  --limit=10 --format=json | jq '.[].jsonPayload'

# 2. Force Replicate fallback via feature flag (no redeploy needed)
gcloud run services update pangyo-production \
  --update-env-vars TATT_FLAGS_JSON='{"imagen_disabled":true}' \
  --region us-central1
```

**In generationRouter.ts (must be pre-built):**
```typescript
if (flags.imagen_disabled || model === 'imagen-3') {
  if (flags.imagen_disabled) {
    console.warn('Imagen 3 disabled via flag — routing to Replicate');
    return replicateService.generate(prompt, style);
  }
}
```

**Resolution:** Check GCP Quota dashboard. If daily limit hit, wait for reset (midnight UTC) or request quota increase at `console.cloud.google.com/iam-admin/quotas`.

**Post-incident:** Add `imagen_disabled` flag to `FLAG_DEFAULTS` as `false`. Document the daily quota limit in §10.3 benchmarks.

---

### H.3 Playbook: Supabase Goes Down / Vector Search Fails (SEV-2)

**Symptoms:** Artist matches return empty. `POST /api/match` returns 500. Logs show `SUPABASE_CONNECTION_ERROR`.

**Immediate (< 5 min):**
```bash
# 1. Check Supabase status
curl -sf "https://yfcmysjmoehcyszvkxsr.supabase.co/rest/v1/" \
  -H "apikey: $SUPABASE_ANON_KEY" | jq .

# 2. If Supabase is down, fall back to Neo4j-only matching
gcloud run services update pangyo-production \
  --update-env-vars TATT_FLAGS_JSON='{"supabase_disabled":true}' \
  --region us-central1
```

**In councilMatchmaker.ts (must be pre-built):**
```typescript
if (flags.supabase_disabled) {
  // Neo4j-only cold-start query — no vector similarity, graph traversal only
  return await neo4j.run(COLD_START_QUERY, { styles: styleHints });
}
```

**The degraded experience:** Artist matches work but are less accurate (graph-only, no semantic similarity). Users still see artists. Generation still works. Not ideal but not SEV-1.

**Resolution:** Monitor `https://status.supabase.com`. When restored, disable flag.

---

### H.4 Playbook: Council Members All Timeout (SEV-2 → auto-degrades to nominal)

**Symptoms:** Generations succeed but all prompts are raw (no enrichment). `council_bypassed` metric is 100%. Logs show `COUNCIL_TIMEOUT` on every request.

**This is actually handled automatically** by the 3-second timeout guard (§2.1). Generation still fires. Users still get images. The only degradation is prompt quality.

**Diagnostic:**
```bash
# Check OpenRouter status
curl -sf "https://openrouter.ai/api/v1/models" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" | jq length

# Check if it's a specific model
gcloud logging read 'jsonPayload.message="council_coordination" jsonPayload.full_bypass=true' \
  --limit=20 --format=json | jq '.[].jsonPayload.bypassReason'
```

**If OpenRouter is down:** Generation continues (bypassed). No action needed until OpenRouter recovers.  
**If it's a timeout pattern:** Check if council token limits are too high causing slow responses. Reduce `max_tokens` in council system prompts (§Appendix C).

---

### H.5 Playbook: Firebase Auth Broken — All API Calls Return 401 (SEV-1)

**Symptoms:** Every authenticated endpoint returns 401. Firebase sign-in may still work (client-side) but server-side `verifyIdToken()` fails.

**Immediate (< 5 min):**
```bash
# 1. Check Firebase Admin SDK initialization
gcloud logging read 'resource.type="cloud_run_revision" severity="ERROR"' \
  --limit=20 | grep -i firebase

# 2. Verify GOOGLE_CREDENTIALS_BASE64 is valid
echo "$GOOGLE_CREDENTIALS_BASE64" | base64 -d | python3 -c "import sys,json; j=json.load(sys.stdin); print(j.get('client_email'))"

# 3. If credentials corrupt, re-encode and update
cat google-credentials.json | base64 -w 0 > /tmp/creds.b64
gcloud run services update pangyo-production \
  --update-env-vars "GOOGLE_CREDENTIALS_BASE64=$(cat /tmp/creds.b64)" \
  --region us-central1
```

**Most likely cause post-March 2026:** The Firebase SA key was previously found in a public repo (§8, Blocker #1). If the old key was revoked and the Railway/Cloud Run env wasn't updated, this is the failure.

**Resolution:** Generate new key in GCP IAM → re-encode → update Cloud Run env var → verify `verifyIdToken` works again.

---

### H.6 Playbook: Full Generation UX Frozen — No SSE Events (SEV-1)

**Symptoms:** User submits prompt. Skeleton appears. Nothing else happens. Network tab shows SSE connection open but no data.

**Diagnostic:**
```bash
# Test SSE from command line (bypasses browser quirks)
curl -N -X POST "https://tatt-production.up.railway.app/api/generate" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"rose","councilEnabled":false}' 2>&1 | head -20
```

**If no events even on curl:**
- The SSE stream isn't being written server-side
- Check `generationController.ts` — `res.write()` must be called before any `await`
- Common bug: `await authenticateRequest(req)` before `res.setHeader('Content-Type', 'text/event-stream')` — if auth takes > 2s, some clients time out before stream starts

**Fix:**
```typescript
// generationController.ts — set SSE headers FIRST, auth second
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.flushHeaders();  // flush NOW — client receives headers immediately

// THEN authenticate (client is already waiting with open stream)
const uid = await verifyToken(req.headers.authorization);
if (!uid) {
  res.write(`event: auth_error\ndata: {"code":"UNAUTHORIZED"}\n\n`);
  res.end();
  return;
}
```

**If events arrive on curl but not in browser:** CORS issue. Browser blocks SSE from cross-origin without proper headers.

```typescript
// Add to SSE response headers:
res.setHeader('Access-Control-Allow-Origin', origin);
res.setHeader('Access-Control-Allow-Credentials', 'true');
```

---

### H.7 Demo Day Emergency Script

```bash
#!/bin/bash
# tools/demo-day-emergency.sh
# Run if anything breaks during demo. Fast triage + stabilise.

API="${TATT_API_URL:-https://tatt-production.up.railway.app}"
TOKEN="${TATT_TOKEN}"

echo "⚡ TatT Emergency Triage — $(date)"
echo ""

echo "1. Health..."
curl -sf "$API/api/health" && echo "✅ Healthy" || echo "❌ HEALTH FAIL"

echo ""
echo "2. Force council bypass + Replicate fallback..."
gcloud run services update pangyo-production \
  --update-env-vars 'TATT_FLAGS_JSON={"council_enabled":false,"imagen_disabled":false}' \
  --region us-central1 --quiet && echo "✅ Flags updated"

echo ""
echo "3. Smoke test fast path (should complete in < 8s)..."
time curl -sf -N -X POST "$API/api/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"simple rose","style":"fine-line","bodyRegion":"wrist","councilEnabled":false}' \
  | grep "event:" | head -5

echo ""
echo "4. Match endpoint..."
curl -sf -X POST "$API/api/match" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"styleHints":["fine-line"],"limit":3}' | jq '.artists | length'

echo ""
echo "Done. If generation smoke test returned 'preview_ready' → system is stable."
echo "If not → switch to offline demo mode: set NEXT_PUBLIC_DEMO_MODE=true on Vercel."
```

---

*Document maintained by paul (AI agent). Update whenever architecture decisions change.*  
*Last updated: 2026-03-08 12:15 MST — §11 Feature Flag System, §12 Multi-Agent Coordination Protocol, Appendix H Incident Response Playbook*
