# 06 — Enforce the module boundary with a lint rule

**What to build:** Importing from `generation/internal/` (or `council`'s
internals, once ticket 04 lands) anywhere outside the owning module fails
lint. The boundary the spec promises becomes a wall the tooling enforces,
not a comment asking nicely.

**Blocked by:** None — can start immediately (rule can land now for
`generation/internal/` and grow when council ships).

**Status:** ready-for-agent

- [ ] ESLint `no-restricted-imports` (or equivalent) rejects `*/generation/internal/*` imports from outside the module
- [ ] A deliberate bad import fails `npm run lint`, then is removed
- [ ] `npm test` and `npm run build` pass
