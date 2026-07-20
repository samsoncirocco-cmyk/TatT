# 01 — Generation module skeleton with Vertex provider (expand)

**What to build:** A caller can run `generate(request)` from the new `generation`
module's single entry point and get images back from Vertex Imagen, with the
retry/backoff, relaxed-safety fallback, and telemetry behavior that
`generateWithRetry` has today. Old files untouched (expand step).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `generate()` is the module's only public export surface (plus its request/result types)
- [ ] Provider interface defined internally; Vertex Imagen is the first implementation
- [ ] Retry/backoff, safety-fallback, and telemetry behavior ported faithfully
- [ ] Seam tests: mocked Vertex HTTP; assert result shape, retry-on-429, safety fallback
- [ ] `npm test` and `npm run build` pass
