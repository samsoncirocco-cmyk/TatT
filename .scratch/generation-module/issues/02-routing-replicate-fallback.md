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
- [ ] `npm test` and `npm run build` pass
