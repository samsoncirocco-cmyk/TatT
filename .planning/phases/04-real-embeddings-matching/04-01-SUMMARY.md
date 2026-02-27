# Phase 4 Plan 01 Summary (Vertex Embeddings + Neo4j Hardening)

## Changes
- Added `src/lib/embedding-normalization.ts`:
  - `normalizeVector(vec)` for L2 unit normalization with zero-magnitude handling.
  - `assertUnitVector(vec, tolerance)` for validation/debug checks.
- Added `src/services/vertex-embedding-service.ts`:
  - `generateTextEmbedding(text)` using Vertex AI `text-embedding-004:predict` via `google-auth-library` authenticated fetch.
  - `batchGenerateEmbeddings(texts)` with max batch size 5.
  - `getQueryEmbedding(queryText)` with Firestore cache in `query_embedding_cache`, 7-day TTL.
  - All returned embeddings are normalized and validated to 768 dimensions.
- Hardened `src/lib/neo4j.ts`:
  - Added pooling/timeouts (`maxConnectionPoolSize: 10`, `connectionAcquisitionTimeout: 60000`, `maxConnectionLifetime: 3600000`, `connectionTimeout: 30000`).
  - Added `NEO4J_QUERY_TIMEOUT = 5000` and `NEO4J_DEFAULT_LIMIT = 50`.
  - Added `verifyNeo4jConnectivity()`.
- Updated `src/app/api/neo4j/query/route.ts`:
  - Switched read queries to `session.executeRead(...)`.
  - Added tx timeout config with `neo4j.int(NEO4J_QUERY_TIMEOUT)`.
  - Added timeout-aware handling returning HTTP `504` with `Query timeout`.

## Verification
- `npm run build` succeeds.
- `grep` checks confirm:
  - `NEO4J_QUERY_TIMEOUT = 5000` and `NEO4J_DEFAULT_LIMIT = 50` in `src/lib/neo4j.ts`.
  - `maxConnectionPoolSize: 10` in `src/lib/neo4j.ts`.
  - `executeRead` + tx timeout usage in `src/app/api/neo4j/query/route.ts`.
- Type validation (targeted):
  - `npx tsc --noEmit --skipLibCheck --target ES2020 --moduleResolution bundler --module esnext ...` on all modified Phase 4 TS files passed.
