# 02 — Routing + Replicate provider + fallback chain

**What to build:** `generate(request)` privately picks the right provider from
style/mode/stencil (ported `routeGeneration` logic), runs Replicate SDXL when
routed there, and falls back Vertex→Replicate on failure when allowed. Callers
still never see providers.

**Blocked by:** 01 — Generation module skeleton with Vertex provider.

**Status:** done (2026-07-20)

- [x] Routing logic ported into the module as internal code (pure, unit-tested — 8 routing tests)
- [x] Replicate provider implementation behind the same provider interface
- [x] Vertex→Replicate fallback preserved with current gating (`allowProviderFallback`, token presence)
- [x] Seam tests: provider selection by style/mode, fallback on Vertex failure, replicate fallback chain
- [x] Cleanups from ticket 01 code review: `buildResult` helper extracted; `retry.attempts` → `retry.maxRetries`; `SafetyFilterLevel`/`AspectRatio`/`GenerationMode` literal unions
- [x] Replicate model catalog ported verbatim with Classic Flash request-body test (`lora_scale: 0.6`, TOK prefix, version hash)
- [x] Declared behavior fix: safety fallback only after retryable failures; test proves a 400 makes exactly one paid call
- [x] `npm test` (297 passed) and `npm run build` pass

**Outcome notes:** The client-side `replicateService.js` was found to be browser
code (localStorage, route calls) — the module's Replicate provider ports the
server-side path instead; UI keeps calling routes until ticket 03. Server
catalog uses the client file's params as source of truth (sdxl at 50 steps,
not the route's 30).
