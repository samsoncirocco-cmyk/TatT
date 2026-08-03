> **This is a live working task list (module-deepening/cleanup backlog), not
> a source of current architecture truth despite the title.** It is not on
> the entry-point list in `docs/status/document-classification.md`, and items
> marked done here reflect the state when an agent last edited the entry, not
> a verified current state. For the actual current module map, use
> `docs/architecture/current-architecture.md`.

# Architecture Deepening Todolist

Working list of module areas to deepen (clear interface, strong tests, hidden
internals). Ordered by priority. Source: architecture grill session 2026-07-20.

## 1. Generation stack — DONE (2026-07-20)
All generation traffic now flows through `src/services/generation/` (plus the
`council` module); legacy files (`generationService`, `generationRouter`,
`replicateService` shim, `vertex-ai-edge`, `vertex-imagen-client`, the Express
imagen route) deleted in the contract step (ticket 05).
Leftovers: `vertex-ai-service.js` keeps `generateWithImagen` only for
`scripts/generate-artist-images-vertex.js` (plain-node script can't import the
TS module — see ticket 05 notes); `vertex-embedding-service.ts` is likely dead
(only importer is `scripts/seed-artist-embeddings.ts`) — delete when the
matching stack is deepened.
Final-review leftovers (2026-07-20): client `AI_MODELS` in
`features/generate/services/replicateService.js` duplicates the module's
catalog (retire when the UI layer is deepened — client should fetch model
info from a route); Imagen price constants disagree across three files
(`vertexImagen.ts` $0.02, `imagen-upload.ts` $0.03, `budget-tracker.ts` 4¢)
— unify into one cost config; two `uploadGeneratedImage` implementations
(`api/generate/imagen-upload.ts` vs `services/storage/imageStorageService.ts`)
— merge in the storage-layer deepening (item 4).

## 2. Data/schema layer
Four competing Supabase schema SQL files (`supabase-complete-schema.sql`,
`supabase-schema-1024.sql`, `supabase-schema-fix.sql`, `scripts/sql/`), plus
~50 loose scripts in `scripts/`. Pick one canonical schema + migration story;
delete or archive the rest. Scariest source of prod drift in the repo.

## 3. Matching stack
`hybridMatchService`, `vectorDbService`, `firestore-vector-service`,
`neo4jService`, `firebase-match-service`. Three storage backends behind no
single interface — one
`matching` module with one entry point.

## 4. Storage/upload layer
`gcs-service`, `storageService`, `src/services/storage/`, `multiLayerService`.
Two storage abstractions plus a directory; unify behind one interface before
more layer features land.

## 5. Mixed .js/.ts stragglers in src/services
`emailQueueService.js`, `imageProcessingService.js`, `layerDecompositionService.js`,
`pngDpiService.js`, `vertex-ai-service.js`. Convert to TS so interfaces are
enforceable at the boundary (do each one when its area is deepened, not as a
big-bang sweep).

## 6. Test layout + coverage
Tests split between `tests/` and `src/services/__tests__/`; 197 tests for ~281
source files. Consolidate location convention; add characterization tests to
each area before deepening it.

## One-off follow-ups (2026-07-20 session — not architecture items)

- ~~**Railway sanity check (needs Samson)**~~ — **RESOLVED 2026-07-20,
  Samson's call: the legacy Railway proxy is not needed.** Ticket 05's
  deletion of the Express imagen route stands; if a proxy is ever needed
  again, rebuild it as an adapter over `@/services/generation`.
- **Trademark knockout search** for "TattTester" (USPTO TESS, free) before
  printing/announcing the name. ADR-0004 notes screening is still open.
- **Build the two landing pages** from `docs/brand/`: trust angle on
  tatttester.com, discovery angle on image2ink.com, one shared early-access
  signup. Domains are live and pointed at the tatt-app Vercel project;
  tatt-t.com already 308-redirects to tatttester.com.
- **Cloudflare token hygiene:** `.env.local` holds two tokens — a zone-scoped
  DNS token (fine to keep) and a broad account token with "Account API Tokens
  Write" (used once to mint the zone token). Revoke or narrow the broad one
  in the Cloudflare dashboard.
- **Consolidate `/api/v1/council/generate`:** its inline OpenAI/Flux pipeline
  duplicates the council module (header comment marks it deprecated); fold it
  into `@/services/council` or delete the route.
- **Per-character LoRA revisit triggers** (deliberately deferred, see
  docs/council-plan.md): revisit only when Flow A is live AND weeks of real
  requests show named-character demand concentrated in specific franchises;
  include counsel review of training data inside that revisit.
