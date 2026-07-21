# 05 — Contract: delete the old generation files

**What to build:** The old shallow files are gone and nothing references them:
`generationService.ts`, `generationRouter.ts`, the `replicateService` shim (and
its two straggler importers migrated), the generation path of
`vertex-ai-edge.ts`, `lib/vertex-imagen-client.js`, and the
`features/generate/services` copies absorbed by the module. Embedding/vision
code in `vertex-ai-service.js` stays (out of scope).

**Blocked by:** 03 — Migrate generation API routes and UI callers; 04 — Council module.

**Status:** done

- [x] Grep proves zero imports of deleted files
- [ ] `generateWithImagen` deleted from `vertex-ai-service.js` (its embeddings/vision code stays); `scripts/generate-artist-images-vertex.js` points at the module instead — **deliberately NOT done**, see outcome notes (script can't import the TS module; function kept)
- [x] `vertex-embedding-service.ts` left in place but noted in todolist as likely dead
- [x] `npm test` and `npm run build` pass
- [x] todolist.md updated: generation stack marked done

## Outcome notes (2026-07-20)

### Deleted

| File | Lines | Last importers |
|---|---|---|
| `src/services/generationService.ts` | 231 | none (route migrated in ticket 03) |
| `src/services/__tests__/generationService.retry.test.js` | 188 | legacy suite split out by ticket 04 precisely so it could die here |
| `src/services/generationRouter.ts` | 135 | two feature files, repointed (below) |
| `src/services/replicateService.ts` (shim) | 4 | none (stragglers repointed in ticket 03) |
| `src/lib/vertex-imagen-client.js` | 304 | legacy Express route only (below) |
| `src/lib/vertex-imagen-client.d.ts` | 55 | — |
| `src/services/vertex-ai-edge.ts` | 103 | none — grepped BOTH exports (`generateWithImagen`, `generateEmbedding`); every remaining `generateEmbedding` caller imports from `vertex-ai-service.js`, so the whole file went |
| `src/api/routes/generate.js` | 147 | mounted only by `server.js` (below) |

### routeGeneration public-export decision

`generationRouter.ts` still had client-side callers:
`src/features/generate/services/generationRouter.js` (re-export) and
`src/features/generate/services/replicateService.js` (`routeGeneration` for
preview/high-res model choice). The module's `internal/routing.ts` is the same
logic, pure and client-safe (imports only `@/config/modelRoutingRules.js`), so
`routeGeneration` + `GenerationRoute` are now a **deliberate second public
export** from `src/services/generation/index.ts`, commented as a pure routing
helper. Both feature files repointed to `@/services/generation`. Call-site
signature adapted: old `routeGeneration(userInput, { mode })` became
`routeGeneration({ ...userInput, mode })` — semantics identical (options mode
won over userInput mode before; the override in the spread does the same).
`src/test/services/replicateService.test.js` passes (2/2); no vibeChips/hybrid
tests exist in the repo (grepped).

### Wrinkle found: legacy Express server imported vertex-imagen-client

Grep did NOT come back clean for `lib/vertex-imagen-client.js`: the legacy
Express proxy route `src/api/routes/generate.js` (mounted at `/api/v1/generate`
in `server.js`, `npm run server`) imported `generateAndUploadImages` +
`getUsageSnapshot`. That server is documented legacy — README: "not used in
production, where Next.js API routes under `src/app/api/` handle everything";
`docs/ARCHITECTURE_MAP_2026.md` marks it "LEGACY (Railway deployment)" — and
the route duplicates the Next `/api/v1/generate` adapter migrated in ticket 03
(the frontend calls the relative `/api/v1/generate`, i.e. the Next route).
Resolution: deleted the Express route file and removed its import, its
`imagenGenerateLimiter`, and its mount line from `server.js`. If the Railway
proxy deployment still matters, its imagen endpoint is gone — flagging for
human review; everything else on the Express server is untouched.

### Artist-images script decision: generateWithImagen KEPT in vertex-ai-service.js

`scripts/generate-artist-images-vertex.js` runs via plain `node` (no `tsx` in
package.json; the module's internals use `@/` tsconfig aliases in several files,
which node's native TS type-stripping cannot resolve). Clean repoint options
evaluated and rejected: tsx (would add a new dependency — barred by repo
rules), converting the script to call the deployed `/api/v1/generate` route
(changes the script's auth model from GCP service-account credentials to
TATT_API_KEY + a running server, and a replicate fallback would return hosted
URLs that break the script's base64 file-save path). Per the ticket's
"truth over forcing it": `generateWithImagen` stays in `vertex-ai-service.js`
with the script importing it, and todolist item 5 already covers converting
that file to TS when its area is deepened. Everything else in
`vertex-ai-service.js` (decomposeImageLayers / generateEmbedding /
checkVertexAIHealth) was out of scope and untouched.

### Grep proof (all run from repo root, node_modules excluded)

```
grep -rn "services/generationService" src scripts server.js tests   # no hits
grep -rn "services/generationRouter"  src scripts server.js tests   # only porting comments in src/services/generation/{index.ts,internal/routing.ts}
grep -rn "services/replicateService'" src scripts server.js tests   # only features/generate/services/replicateService (the live feature file, not the deleted shim)
grep -rn "vertex-imagen-client"       src scripts server.js tests   # only the porting comment in src/app/api/generate/imagen-upload.ts
grep -rn "vertex-ai-edge"             src scripts server.js tests   # no hits
grep -rn "api/routes/generate"        src scripts server.js tests   # no hits
```

### Gates

- `npm test`: 294 passed, 7 skipped (301 total), 26 files passed / 1 skipped — green
- `npm run build`: green (only pre-existing Firebase-credentials prerender warnings)
- `npx eslint src/services/generation/ eslint.config.mjs`: clean
