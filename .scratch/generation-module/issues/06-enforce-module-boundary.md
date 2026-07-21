# 06 — Enforce the module boundary with a lint rule

**What to build:** Importing from `generation/internal/` (or `council`'s
internals, once ticket 04 lands) anywhere outside the owning module fails
lint. The boundary the spec promises becomes a wall the tooling enforces,
not a comment asking nicely.

**Blocked by:** None — can start immediately (rule can land now for
`generation/internal/` and grow when council ships).

**Status:** done (2026-07-20)

- [x] ESLint `no-restricted-imports` rejects `*/generation/internal/*` imports from outside the module (eslint.config.mjs, cites ADR-0001 in the error message)
- [x] A deliberate bad import failed lint with the boundary message, then was removed
- [x] `npm test` (297 passed) and `npm run build` pass

**Outcome notes:** Enforcing the rule surfaced 9 `no-explicit-any` errors in
the module's own ported code — fixed properly with a typed `GenerationError`
shape instead of suppressions, so the module now lints fully clean.
