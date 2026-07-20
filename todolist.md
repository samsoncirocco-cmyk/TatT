# Architecture Deepening Todolist

Working list of module areas to deepen (clear interface, strong tests, hidden
internals). Ordered by priority. Source: architecture grill session 2026-07-20.

## 1. Generation stack — IN PROGRESS (first target, locked in grill)
`generationService`, `generationRouter`, `replicateService`, `vertex-ai-service.js`,
`vertex-ai-edge.ts`, `vertex-imagen-client`, `councilService`.
Core money path; three overlapping Vertex modules; per-call metered costs.

## 2. Data/schema layer
Four competing Supabase schema SQL files (`supabase-complete-schema.sql`,
`supabase-schema-1024.sql`, `supabase-schema-fix.sql`, `scripts/sql/`), plus
~50 loose scripts in `scripts/`. Pick one canonical schema + migration story;
delete or archive the rest. Scariest source of prod drift in the repo.

## 3. Matching stack
`hybridMatchService`, `vectorDbService`, `firestore-vector-service`,
`neo4jService`, `firebase-match-service`, `match-config-service`,
`match-tracking`. Three storage backends behind no single interface — one
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
