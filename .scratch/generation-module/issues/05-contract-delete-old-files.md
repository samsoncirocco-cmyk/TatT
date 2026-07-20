# 05 — Contract: delete the old generation files

**What to build:** The old shallow files are gone and nothing references them:
`generationService.ts`, `generationRouter.ts`, the `replicateService` shim (and
its two straggler importers migrated), the generation path of
`vertex-ai-edge.ts`, `lib/vertex-imagen-client.js`, and the
`features/generate/services` copies absorbed by the module. Embedding/vision
code in `vertex-ai-service.js` stays (out of scope).

**Blocked by:** 03 — Migrate generation API routes and UI callers; 04 — Council module.

**Status:** ready-for-agent

- [ ] Grep proves zero imports of deleted files
- [ ] `vertex-embedding-service.ts` left in place but noted in todolist as likely dead
- [ ] `npm test` and `npm run build` pass
- [ ] todolist.md updated: generation stack marked done
