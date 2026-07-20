# 02 — Routing + Replicate provider + fallback chain

**What to build:** `generate(request)` privately picks the right provider from
style/mode/stencil (ported `routeGeneration` logic), runs Replicate SDXL when
routed there, and falls back Vertex→Replicate on failure when allowed. Callers
still never see providers.

**Blocked by:** 01 — Generation module skeleton with Vertex provider.

**Status:** ready-for-agent

- [ ] Routing logic ported into the module as internal code (pure, unit-tested)
- [ ] Replicate provider implementation behind the same provider interface
- [ ] Vertex→Replicate fallback preserved with current gating (`allowFallback`, token presence)
- [ ] Seam tests: provider selection by style/mode, fallback on Vertex failure
- [ ] Cleanups from ticket 01 code review while touching vertexImagen.ts: extract the duplicated result/telemetry block shared by success and fallback paths; rename `retry.attempts` → `retry.maxRetries` (it means retries-after-first-try, not total); tighten stringly-typed options (safety level, aspect ratio) to literal unions
- [ ] Replicate model catalog ported verbatim — model versions, schedulers, LoRA scale, prompt prefixes — with a test asserting the exact Classic Flash request body (`lora_scale: 0.6`, "A TOK tattoo drawing style of" prefix)
- [ ] Declared behavior fix: safety fallback no longer fires after non-retryable errors (e.g. 400) — it only runs after retryable failures; update the ticket-01 seam test that enshrined the old behavior, add a test proving a 400 makes exactly one paid call
- [ ] `npm test` and `npm run build` pass
