# 01 — Generation module skeleton with Vertex provider (expand)

**What to build:** A caller can run `generate(request)` from the new `generation`
module's single entry point and get images back from Vertex Imagen, with the
retry/backoff, relaxed-safety fallback, and telemetry behavior that
`generateWithRetry` has today. Old files untouched (expand step).

**Blocked by:** None — can start immediately.

**Status:** done (2026-07-20)

- [x] `generate()` is the module's only public export surface (plus its request/result types)
- [x] Provider interface defined internally; Vertex Imagen is the first implementation
- [x] Retry/backoff, safety-fallback, and telemetry behavior ported faithfully (verified by line-diff in code review)
- [x] Seam tests: mocked Vertex HTTP; assert result shape, retry-on-429, safety fallback
- [x] `npm test` (282 passed) and `npm run build` pass

**Outcome notes:** Auth is still hard-wired to the edge token helper (as in the
original) — the injected-auth seam the spec calls for lands with ticket 03's
Edge migration. Code review flagged internal cleanups for ticket 02.
