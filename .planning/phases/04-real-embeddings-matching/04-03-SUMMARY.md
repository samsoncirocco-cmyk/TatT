# Phase 4 Plan 03 Summary (Hybrid Pipeline Rewire + Seed Script)

## Changes
- Rewired `src/services/hybridMatchService.ts`:
  - Removed mock embedding generation (`Math.sin`) and `vectorDbService` usage.
  - Added real query embedding with `getQueryEmbedding()` from `vertex-embedding-service`.
  - Added Firestore vector search via `searchSimilarArtists()`.
  - Added runtime match config + weighted RRF (`getMatchConfig`, `weightedRRF`).
  - Raised timeout from `500ms` to `3000ms`.
  - Uses `matchConfig.confidenceThreshold` instead of hardcoded threshold.
- Rewired `src/services/matchService.ts`:
  - Replaced Supabase vector path with Firestore vector search (`searchSimilarArtists`).
  - Replaced hardcoded RRF with config-driven `weightedRRF`.
  - Updated logs/flow to vector terminology.
- Cleaned `src/app/api/v1/match/semantic/route.ts`:
  - Removed `@ts-ignore` and kept typed import from `@/services/hybridMatchService`.
- Added seed script `scripts/seed-artist-embeddings.ts`:
  - Loads artists from Neo4j.
  - Builds embedding text from artist attributes.
  - Batches embedding generation (size 5) via `batchGenerateEmbeddings`.
  - Stores vectors with `storeArtistEmbedding`.
  - Supports `--dry-run`, batch-level error isolation, progress/summary logs.
- Added npm script:
  - `seed:embeddings`: `tsx scripts/seed-artist-embeddings.ts`
- Added dev dependency:
  - `tsx` in `package.json` (and lockfile updated).

## Verification
- `npm run build` succeeds.
- `grep` checks confirm:
  - No `Math.sin` in `src/services/hybridMatchService.ts`.
  - No `vectorDbService` imports in rewired match services.
  - No `supabase` references in `src/services/matchService.ts`.
  - Imports now point to `vertex-embedding-service`, `firestore-vector-service`, `match-config-service`.
- `npm run seed:embeddings -- --dry-run` executes script entrypoint; currently fails fast on missing env (`GCP_PROJECT_ID`) as expected in this workspace without deployment credentials.

## Pending
- Run full seed against real infra after setting:
  - `GCP_PROJECT_ID`
  - `GOOGLE_APPLICATION_CREDENTIALS`
  - `NEO4J_URI`
  - `NEO4J_USERNAME`/`NEO4J_USER`
  - `NEO4J_PASSWORD`
