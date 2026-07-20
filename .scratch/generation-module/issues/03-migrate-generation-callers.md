# 03 — Migrate generation API routes and UI callers

**What to build:** All generation traffic flows through `generate()`. The three
generation API routes (`/api/generate`, `/api/v1/generate`,
`/api/v1/tasks/generate`) become thin adapters; the Edge route keeps working via
injected Edge auth; UI/feature code imports the module entry point instead of
old service files. API response shapes unchanged.

**Blocked by:** 02 — Routing + Replicate provider + fallback chain.

**Status:** ready-for-agent

- [ ] All three routes call `generate()`; response shapes verified unchanged
- [ ] `/api/generate` keeps its GCS upload behavior in the route adapter (module returns images; upload is composed by the route, not absorbed into the module)
- [ ] Edge runtime route works with injected auth strategy
- [ ] Feature/UI imports (`useImageGeneration`, `useSmartPreview`, stencil page, DesignForm) point at the module
- [ ] Seam tests for at least the primary `/api/v1/generate` adapter
- [ ] `npm test` and `npm run build` pass
