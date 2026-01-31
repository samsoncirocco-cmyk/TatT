# Codebase Concerns

**Analysis Date:** 2026-01-31

## Tech Debt

**Embedding Generation Stub:**
- Issue: `generateQueryEmbedding()` in `src/services/hybridMatchService.ts` (line 120) returns deterministic mock embeddings based on hash function instead of actual ML model output
- Files: `src/services/hybridMatchService.ts:120-137`
- Impact: Vector search similarity scores are meaningless for actual artist matching. Mock embeddings don't reflect real visual/semantic similarity. Production matching relies on incorrect vector results
- Fix approach: Integrate actual text embedding service (Vertex AI Text Embeddings or CLIP text encoder). Requires selecting a model, adding API calls with proper error handling, and updating the mock data generation for testing

**Rate Limiting Not Implemented:**
- Issue: `checkRateLimit()` in `src/lib/rate-limit.ts` (line 8) allows all requests - just a stub with TODO comment
- Files: `src/lib/rate-limit.ts`
- Impact: No protection against API abuse, batch requests, or DDoS. All endpoints that call this function are unprotected in production
- Fix approach: Implement proper distributed rate limiting using Upstash Redis or similar edge-compatible service. Define rate limit tiers per endpoint

**Default Auth Token in Production:**
- Issue: `FRONTEND_AUTH_TOKEN` defaults to `'dev-token-change-in-production'` in both `src/lib/api-auth.ts:3` and `src/services/neo4jService.ts:99`
- Files: `src/lib/api-auth.ts`, `src/services/neo4jService.ts`
- Impact: If env var is not set, ALL API endpoints are protected by a hardcoded string token visible in source code. Provides zero security
- Fix approach: Make auth token mandatory (throw error if missing), document this as breaking change for deployment setup

## Security Considerations

**Hardcoded Demo Token:**
- Risk: Development auth token `'dev-token-change-in-production'` is visible in source code and .env.example
- Files: `src/lib/api-auth.ts:3`, `.env.example:20-21`, `src/services/neo4jService.ts:99`
- Current mitigation: Token is "obvious" demo token, relies on env var override in production
- Recommendations: (1) Use a config validation on startup that rejects default token, (2) Document clearly in deployment guide that this MUST be changed, (3) Consider using short-lived JWT instead of static token

**No Query Validation in Neo4j:**
- Risk: `src/app/api/neo4j/query/route.ts:25` accepts arbitrary Cypher queries and executes them directly against the database
- Files: `src/app/api/neo4j/query/route.ts:20-35`
- Current mitigation: Only token-authenticated requests can call it (provides some protection), but query validation is missing
- Recommendations: (1) Implement Cypher query whitelist or parameterized query templates, (2) Add query validation regex to reject dangerous patterns, (3) Log all Neo4j queries for audit

**Environment Credentials in Logs:**
- Risk: Error messages may leak GCP project IDs, bucket names, or other config details
- Files: `src/app/api/v1/layers/decompose/route.ts:92`, multiple error handlers across codebase
- Current mitigation: None - errors are logged verbatim
- Recommendations: Sanitize error messages before logging; redact bucket names, URLs, and project IDs

**GCS Signed URL Expiry Not Validated:**
- Risk: `src/services/gcs-service.ts:75` parses expiry from env var without validation
- Files: `src/services/gcs-service.ts:75`
- Current mitigation: Falls back to 3600 seconds, but parseInt returns NaN silently if parsing fails
- Recommendations: Add bounds checking (minimum 300s, maximum 604800s), explicit error if env var unparseable

## Performance Bottlenecks

**In-Memory Cache Unbounded Growth:**
- Problem: `queryCache` in `src/services/hybridMatchService.ts:93` uses in-memory Map with manual cleanup. Cleanup only runs when new queries execute
- Files: `src/services/hybridMatchService.ts:93-395`
- Cause: If servers receive sparse traffic or scheduled cleanup doesn't run, old entries accumulate. No max size limit
- Improvement path: (1) Use LRU cache library, (2) Implement periodic cleanup via background task, (3) Add cache size monitoring/metrics, (4) Consider Redis for distributed caching

**500ms Query Timeout Too Aggressive:**
- Problem: `findMatchingArtists()` has hardcoded 500ms timeout (line 247) that races between vector search and graph query
- Files: `src/services/hybridMatchService.ts:247`
- Cause: Vector search (Supabase) + graph query (Neo4j) may legitimately take 400-600ms over network. Timeout triggers error handling instead of returning results
- Improvement path: (1) Increase to 2000ms or make configurable, (2) Return partial results (whichever completes) instead of timing out, (3) Profile actual latencies in production

**Nested Promises in Asset Decomposition:**
- Problem: `src/app/api/v1/layers/decompose/route.ts` (264 lines) has deeply nested async operations without parallelization opportunities
- Files: `src/app/api/v1/layers/decompose/route.ts`
- Cause: Fetches image, runs Vision API, processes output, uploads results sequentially. Could batch operations
- Improvement path: (1) Parallelize Vision API calls for multiple objects, (2) Parallelize thumbnail generation while uploading main image, (3) Add stream processing for large payloads

**O(n²) Layer Reordering in Store:**
- Problem: `src/stores/useForgeStore.ts` updates all z-index values when reordering (inefficient for large layer stacks)
- Files: `src/stores/useForgeStore.ts:85-95`
- Cause: Array splice + map to update indices on every drag-drop operation
- Improvement path: Use sparse z-index values or implement virtual scrolling for 50+ layer canvases

## Fragile Areas

**Type Casting Bypasses Throughout API Routes:**
- Files: `src/app/api/v1/layers/decompose/route.ts:45`, `src/app/api/v1/match/update/route.ts:3-5`, `src/app/api/v1/embeddings/generate/route.ts:3-5`, `src/app/api/v1/stencil/export/route.ts:2-4`
- Why fragile: Multiple `// @ts-ignore` comments bypass TypeScript checks. If Google Cloud SDK types change, compiler won't catch mismatches
- Safe modification: (1) Review what's being ignored and add proper type definitions, (2) Use `unknown` type and add runtime checks instead of ignoring, (3) Create type stubs for problematic imports
- Test coverage: None - type casts aren't tested

**Mock Data in Critical Path:**
- Files: `src/services/hybridMatchService.ts:120-137` (mock embedding generation)
- Why fragile: `generateQueryEmbedding()` is called in hot path but doesn't reflect reality. Code will "work" in dev but fail in production
- Safe modification: Feature-flag the mock implementation, add logging that clearly identifies when mocks are used, write integration tests with real embedding service
- Test coverage: No tests validate embedding quality

**Manual Error Handling with Type Any:**
- Files: `src/app/api/neo4j/query/route.ts:31`, `src/app/api/v1/storage/upload/route.ts:44`, `src/services/gcs-service.ts` (multiple)
- Why fragile: Uses `catch (error: any)` without narrowing. If error is not Error instance, `.message` will be undefined, leading to confusing "undefined" messages
- Safe modification: Always narrow error type: `catch (error) { const msg = error instanceof Error ? error.message : String(error); }`
- Test coverage: No error path testing

**Loose String Comparisons in Score Calculation:**
- Files: `src/services/hybridMatchService.ts:184-236` (location/budget/style scoring)
- Why fragile: Uses `.includes()` on city names for location matching - "New York" would match "York" or "New Yorker"
- Safe modification: Use exact matching with normalization (trim, lowercase) or Levenshtein distance for typo tolerance
- Test coverage: No tests for edge cases like partial matches

## Test Coverage Gaps

**No Test Files in Src:**
- What's not tested: Services layer (hybridMatchService, neo4jService, gcs-service, canvasService) have zero test coverage
- Files: `src/services/` - all files lack corresponding .test.ts files
- Risk: (1) Refactoring core services is risky without regression tests, (2) Edge cases in scoring functions go undetected, (3) GCS upload failures caught only in production
- Priority: High - recommend starting with `hybridMatchService.test.ts` and `neo4jService.test.ts`

**No API Route Testing:**
- What's not tested: All `/src/app/api/**/route.ts` files lack integration tests
- Files: 14+ API routes without test coverage
- Risk: (1) Auth middleware changes could silently break endpoints, (2) Error responses not validated, (3) Request validation untested
- Priority: High - add basic test for each route: valid request, missing auth, invalid input

**UI Component Testing Missing:**
- What's not tested: Large complex components like `src/components/generate/ForgeCanvas.tsx` (372 lines), `src/components/Match/MatchPulse.tsx` (255 lines)
- Risk: Canvas state changes, layer operations, and rendering edge cases cause runtime errors for users
- Priority: Medium - focus on state mutation and event handling tests

**No Integration Tests:**
- What's not tested: End-to-end flows (upload image -> decompose -> generate -> export)
- Risk: Components work individually but fail when integrated - caught only in manual testing
- Priority: Medium - would catch architectural issues early

## Scaling Limits

**In-Memory Cache per Server Instance:**
- Current capacity: Unbounded Map, limited only by heap size
- Limit: Cache doesn't persist across server restarts or horizontal scaling. If you deploy multiple instances, cache is silently duplicated/unused
- Scaling path: Migrate to Redis (works across instances), add cache invalidation on Supabase data changes, implement LRU eviction policy

**Single Neo4j Connection Pool:**
- Current capacity: `src/lib/neo4j.ts` initializes one global driver
- Limit: If single driver instance exhausted, new queries fail. No connection pool configured
- Scaling path: Add connection pool configuration to neo4j-driver initialization, monitor active sessions

**GCS Upload Fallback to Local Temp Storage:**
- Current capacity: OS temp directory `/tmp` (usually 5-10GB on Vercel)
- Limit: If GCS upload fails, files are written to `/tmp` but never cleaned up. Runs out of space within days on high-traffic instance
- Scaling path: (1) Add scheduled cleanup job for old temp files, (2) Make fallback configurable/optional, (3) Implement exponential backoff+retry for GCS uploads

**Vector Search Dimension Hardcoded:**
- Current capacity: `src/services/hybridMatchService.ts:131` assumes 1408-dimensional embeddings
- Limit: If you want to use different embedding model (e.g., 768-dim CLIP), code must be updated in multiple places
- Scaling path: Store embedding dimensions in environment/config, validate at startup

## Missing Critical Features

**No Data Validation for Artist Matching:**
- Problem: `findMatchingArtists()` accepts arbitrary preferences object without schema validation
- Blocks: Can't safely accept artist preferences from untrusted sources (frontend, webhooks)
- Recommendation: Add Zod or similar for runtime schema validation on all API inputs

**No Metrics/Observability:**
- Problem: Performance data logged to console, not captured anywhere. Timeout warnings don't trigger alerts
- Blocks: Can't detect when hybrid matching degrades, geo-distributed latency issues invisible
- Recommendation: Integrate error tracking (Sentry) and metrics (Prometheus/DataDog)

**No Input Size Limits on File Uploads:**
- Problem: `src/app/api/v1/storage/upload/route.ts` accepts base64 fileData without size validation
- Blocks: User could upload 1GB file, crashing server or consuming quota
- Recommendation: Add max file size validation (e.g., 50MB), return 413 Payload Too Large

**No Audit Logging for API Calls:**
- Problem: Who called what endpoint is not logged. Data access is invisible
- Blocks: Can't investigate unauthorized access or data leaks
- Recommendation: Log all API calls with timestamp, user ID, endpoint, and outcome

## Dependencies at Risk

**Zustand Store Not Typed:**
- Risk: `src/stores/useForgeStore.ts:79` uses `any` for Zustand setter/getter
- Impact: Type safety is lost in state management - mutations could be misspelled, return types wrong
- Migration plan: Update TypeScript config to be stricter, or use `@types/zustand` if available

**Sharp Library Direct Instantiation:**
- Risk: `src/app/api/v1/layers/decompose/route.ts:120` instantiates Sharp without error handling for unsupported formats
- Impact: If user uploads non-image file disguised as image, Sharp throws cryptic error
- Migration plan: Validate file header before passing to Sharp (check magic bytes)

**Google Cloud Libraries Version Pins:**
- Risk: package.json uses specific versions but no upper bounds (e.g., "@google-cloud/vision": "^5.3.4")
- Impact: Minor version bumps could introduce breaking changes (API changes, type updates)
- Migration plan: Review Google Cloud library changelogs quarterly, add pre-release testing

**Express Unused in Next.js Context:**
- Risk: package.json includes `express: ^5.2.1` but Next.js 16 already provides HTTP server
- Impact: Dependency bloat, unused code in bundle if ever built for edge
- Migration plan: Remove Express dependency, verify server.js doesn't rely on it, update deployment docs

## Known Bugs

**Cache Key Collision Possible:**
- Symptoms: Same results returned for different queries
- Files: `src/services/hybridMatchService.ts:250`
- Trigger: Two different queries with same JSON.stringify representation (unlikely but theoretically possible with object key ordering)
- Workaround: Clear cache manually with `clearCache()` function if wrong results observed
