# Codebase Concerns

**Analysis Date:** 2026-01-31

## Tech Debt

**Next.js/Vite Hybrid Architecture:**
- Issue: Project has mixed Next.js App Router (src/app/) and legacy Vite/React Router code (src/pages/, src/features/, src/main.jsx)
- Files: `src/pages/Generate.jsx`, `src/features/Generate.jsx`, `src/main.jsx`, `src/App.jsx` (legacy), alongside `src/app/page.tsx`, `src/app/generate/page.tsx` (Next.js)
- Impact: Confusing architecture, duplicate routing logic, unclear which system is canonical. Build configuration conflicts between Vite and Next.js.
- Fix approach: Complete migration to Next.js App Router. Remove all Vite-specific files (vite.config.js, src/main.jsx, src/App.jsx). Consolidate all pages under `src/app/`. Update all route components to use Next.js patterns.

**Mixed JavaScript/TypeScript Codebase:**
- Issue: 37,662 lines of code split between .js/.jsx (legacy) and .ts/.tsx (modern). Inconsistent type safety across codebase.
- Files: 53+ .js/.jsx files in src/ including `src/components/DesignGenerator.jsx`, `src/services/councilService.js`, `src/config/characterDatabase.js`, `src/utils/matching.js`
- Impact: Type errors caught only in TS files. No IntelliSense for JS files. Harder to refactor safely. Recent conversion effort (Phase 2) converted only 3 critical services.
- Fix approach: Systematic conversion priority: (1) Services layer (councilService.js, multiLayerService.js, etc.), (2) Hooks, (3) Components. Use `allowJs: true` during transition. Add JSDoc type annotations as intermediate step.

**Vite Environment Variables Still Present:**
- Issue: 28 files still reference VITE_ environment variables despite Next.js migration
- Files: `src/services/generationService.ts`, `src/services/embeddingService.ts`, `src/services/councilService.ts`, `src/features/generate/services/replicateService.js`, `src/config/vectorDbConfig.js`, and 23 others
- Impact: Environment variables won't work in Next.js production build (requires NEXT_PUBLIC_ prefix for client-side). Silent failures in production.
- Fix approach: Global find/replace VITE_ → NEXT_PUBLIC_ for client-side vars. Move server-side vars to use process.env directly in API routes. Update .env.example and documentation.

**Duplicate Page Components:**
- Issue: Two nearly identical Generate page implementations exist side-by-side
- Files: `src/pages/Generate.jsx` (1706 lines) and `src/features/Generate.jsx` (1733 lines)
- Impact: Maintenance nightmare - bug fixes must be applied twice. Unclear which is canonical. Wasted ~1700 lines of duplicated code.
- Fix approach: Consolidate into single Next.js page at `src/app/generate/page.tsx`. Port best features from both versions. Delete legacy files. Update all links/references.

**Incomplete Embedding Migration:**
- Issue: Text embeddings migration (mock → Vertex AI) fully implemented in code but never deployed to database
- Files: `src/services/embeddingService.ts`, `scripts/migrate-to-text-embeddings.js`, `src/db/migrations/002_migrate_to_text_embeddings.sql`
- Impact: Semantic artist matching returns random results. Mock embeddings in `src/features/match-pulse/services/hybridMatchService.ts` generate random 768-dim vectors instead of real semantic data. User queries meaningless.
- Fix approach: Execute 3-step deployment documented in MIGRATION_STEPS.md: (1) Run SQL migration in Supabase dashboard, (2) Execute data migration script for 100 artists (~5 min), (3) Verify with test suite. Estimated 65 minutes total once network access restored.

**TODO Comments Without Context:**
- Issue: Multiple TODO comments lacking implementation details or priority
- Files: `src/components/DesignGeneratorRefactored.jsx:153` ("Replace with toast notification"), `src/components/DesignGeneratorRefactored.jsx:183` (same), `src/features/match-pulse/components/Match/ArtistCard.jsx:30` ("Open artist profile modal"), `tests/setup.js:8` ("Fix jest-dom module resolution issue"), `src/lib/rate-limit.ts:9` ("Implement proper distributed rate limiting")
- Impact: Forgotten technical debt, unclear what "proper" implementation means, blockers for production readiness
- Fix approach: Convert to GitHub Issues with acceptance criteria. For toast notifications: integrate existing `src/hooks/useToast.js`. For rate limiting: implement Redis-backed rate limiter (Upstash recommended for Edge). For jest-dom: update vitest.config to properly resolve @testing-library/jest-dom.

**Legacy API Endpoints Marked Deprecated:**
- Issue: Legacy `/api/match/semantic` endpoint marked deprecated but still in use
- Files: `server.js:341` (comment: "deprecated, use /api/v1/match/semantic"), `server.js:267` (endpoint map comment), `docs/CLAUDE.md:468` mentions migration needed
- Impact: Two parallel implementations to maintain. Unclear migration path for existing clients. API versioning confusion.
- Fix approach: Implement deprecation headers (X-API-Deprecated: true, Sunset: <date>). Add logging to track usage. Migrate all internal calls to /api/v1/match/semantic. Remove legacy endpoint after grace period. Document breaking changes.

**Alert() Calls Instead of Toast System:**
- Issue: Native alert() used for user notifications instead of proper toast component
- Files: `src/components/DesignGeneratorRefactored.jsx:154` ("Design saved to your library!"), `src/components/DesignGeneratorRefactored.jsx:184` ("Design edited successfully!")
- Impact: Poor UX (blocking modal), no error styling, interrupts user flow, not accessible
- Fix approach: Replace all alert() with useToast hook (already exists at `src/hooks/useToast.js`). Import ToastContainer component. Pass severity levels (success, error, warning).

## Known Bugs

**Jest-DOM Module Resolution:**
- Symptoms: Testing library setup incomplete, jest-dom assertions unavailable in tests
- Files: `tests/setup.js:8`
- Trigger: Running npm test shows missing matchers like .toBeInTheDocument()
- Workaround: Currently commented out, using basic Vitest assertions only
- Fix: Update vitest.config.js to add @testing-library/jest-dom to setupFiles array. Verify import path matches installed version.

**Segmentation Endpoint Warning:**
- Symptoms: Console warning "VERTEX_SEGMENTATION_ENDPOINT_ID not set" on every segmentation attempt
- Files: `src/lib/segmentation-vertex.ts:21`
- Trigger: Any layer decomposition or background removal operation
- Workaround: Returns null, causing fallback to client-side segmentation or mock data
- Fix: Either (1) Deploy Vertex AI Vision endpoint and set env var, or (2) Remove warning and gracefully degrade to alternative segmentation method without console noise.

**Production Auth Placeholder:**
- Symptoms: Development token "dev-token-change-in-production" may be in production env
- Files: `.env.example:20`, `server.js` (FRONTEND_AUTH_TOKEN validation)
- Trigger: If .env wasn't updated for production deployment, insecure token active
- Workaround: None - security issue
- Fix: Generate cryptographically secure token for production. Add startup validation to reject dev token in production mode. Document token rotation process.

## Security Considerations

**Client-Side API Keys Exposure:**
- Risk: VITE_ prefixed env vars are bundled into client JavaScript, exposing secrets
- Files: 28 files using VITE_ vars including `src/services/councilService.ts`, `src/services/embeddingService.ts`
- Current mitigation: Backend proxy (server.js) for Replicate API calls hides REPLICATE_API_TOKEN
- Recommendations: (1) Audit all VITE_ vars for secrets, (2) Move Vertex AI calls to API routes (currently client-side), (3) Migrate OpenRouter council calls to server-side, (4) Use NEXT_PUBLIC_ only for non-sensitive config (URLs, feature flags)

**Weak Development Auth Token:**
- Risk: Shared secret "dev-token-change-in-production" used for frontend ↔ backend auth
- Files: `.env.example:20`, `server.js` (bearer token validation)
- Current mitigation: CORS restricts allowed origins, production domain hopefully uses different token
- Recommendations: (1) Implement JWT-based auth with short-lived tokens, (2) Add request signing/HMAC for API calls, (3) Rotate secrets on schedule, (4) Add startup check to reject dev token in production

**No Rate Limiting on Edge Routes:**
- Risk: Edge API routes have stub rate limiting that allows all requests
- Files: `src/lib/rate-limit.ts:9` (returns true unconditionally)
- Current mitigation: Express server.js has per-endpoint rate limits (100 req/hr semantic, 20 req/hr council)
- Recommendations: Implement Upstash Redis rate limiter for Edge Runtime. Use sliding window algorithm. Add per-IP and per-user limits. Return 429 status with Retry-After header.

**Credentials in Git History:**
- Risk: Service account keys committed to repository
- Files: `firebase-admin-key.json`, `gcp-service-account-key.json` (present in .gitignore but may be in history)
- Current mitigation: Files in .gitignore for future commits
- Recommendations: (1) Immediately rotate all credentials in those files, (2) Use git-filter-repo to purge from history, (3) Migrate to environment variable injection, (4) Enable secret scanning in GitHub, (5) Use Google Workload Identity instead of service account keys

**CORS Configuration Risk:**
- Risk: ALLOWED_ORIGINS configured via environment variable, misconfiguration allows unauthorized domains
- Files: `server.js` (CORS middleware), `.env.example:26`
- Current mitigation: Explicit allowlist, defaults to localhost only
- Recommendations: (1) Add validation for production origins (must be HTTPS), (2) Reject wildcard origins in production, (3) Log CORS failures for monitoring, (4) Add Origin header validation beyond CORS

## Performance Bottlenecks

**Large Character Database File:**
- Problem: 2,169 line characterDatabase.js loaded synchronously on app startup
- Files: `src/config/characterDatabase.js`
- Cause: Massive anime character reference database imported everywhere, not code-split
- Improvement path: (1) Move to JSON file in public/, fetch on-demand, (2) Implement lazy loading, (3) Split by anime series, load only needed characters, (4) Consider moving to database table instead of static file

**Dual 1700+ Line Generate Components:**
- Problem: Two massive page components loaded on generate route
- Files: `src/pages/Generate.jsx` (1706 lines), `src/features/Generate.jsx` (1733 lines)
- Cause: Monolithic components with 40+ import statements, inline logic, no code splitting
- Improvement path: (1) Consolidate to single component, (2) Extract sub-features to lazy-loaded chunks, (3) Use React.lazy() for modals/panels, (4) Split canvas operations to web worker, (5) Target <500 lines per component

**Synchronous Canvas Export:**
- Problem: exportAsPNG() blocks main thread during large canvas compositing
- Files: `src/features/generate/services/canvasService.ts:348`
- Cause: HTML Canvas toBlob() synchronous operation, no offscreen canvas usage
- Improvement path: Move to OffscreenCanvas in Web Worker. Use createImageBitmap() for layer compositing. Stream results back via MessageChannel. Add progress indicator for exports >2 seconds.

**Neo4j Connection Pool:**
- Problem: No connection pooling configuration visible for Neo4j driver
- Files: `src/lib/neo4j.ts:16`
- Cause: Default driver config may create excessive connections or fail to reuse
- Improvement path: Configure maxConnectionPoolSize (default 100), connectionAcquisitionTimeout (60s recommended), add connection health checks, implement circuit breaker pattern for failures

**Version History localStorage Growth:**
- Problem: Version history stored in localStorage grows unbounded until 90-day purge
- Files: `src/features/generate/services/versionService.js:81` (purge old histories)
- Cause: Each version stores full layer data + image URLs as base64/data URIs. 50 versions × ~500KB = 25MB potential
- Improvement path: (1) Store image refs only, not full base64, (2) Compress version data with LZ-string, (3) Implement LRU eviction before quota hit, (4) Warn user at 80% quota, (5) Consider IndexedDB for large datasets

## Fragile Areas

**Hybrid Match Service RRF Logic:**
- Files: `src/features/match-pulse/services/hybridMatchService.ts`
- Why fragile: Complex Reciprocal Rank Fusion algorithm combining Neo4j graph + Supabase vector results. Currently uses mock embeddings that return random vectors. Failure mode not clearly defined.
- Safe modification: Never modify RRF scoring without A/B testing. Keep k=60 constant (RRF parameter). Add extensive logging before changing weight distribution. Ensure fallback to single-source (graph OR vector) if one fails.
- Test coverage: No unit tests found for RRF implementation

**Canvas Layer Transform Operations:**
- Files: `src/features/generate/services/canvasService.ts`, `src/hooks/useTransformOperations.ts`
- Why fragile: Immutable state updates with deep object spreads. Easy to accidentally mutate. Transform matrix calculations prone to floating point errors.
- Safe modification: Always use provided helper functions (updateTransform, etc.). Never directly mutate layer objects. Test edge cases: rotation at 360°, scale at 0, nested transforms. Verify immutability with Object.freeze in dev.
- Test coverage: 0% - no tests for transform operations found

**Version History Branching/Merging:**
- Files: `src/features/generate/services/versionService.js:203` (compareVersions), `versionService.js:251` (mergeVersions)
- Why fragile: Git-like version control implemented in localStorage with complex branching logic. Returns null on errors silently without throwing. Merge conflicts not handled.
- Safe modification: Always validate version IDs exist before operations. Handle sessionStorage/localStorage quota exceeded errors. Add conflict resolution UI before merging. Never assume localStorage is available.
- Test coverage: Basic tests exist at `src/features/generate/services/versionService.test.js` but don't cover merge conflicts

**Server.js Express Proxy:**
- Files: `server.js` (15,938 lines total)
- Why fragile: Single-file Express server handling auth, rate limiting, CORS, proxy logic for multiple services. No error boundaries between routes. Legacy + modern endpoints mixed.
- Safe modification: Test CORS changes with actual frontend origin. Verify rate limits don't affect health checks. Keep legacy endpoints until migration confirmed complete. Add integration tests before modifying auth middleware.
- Test coverage: No tests found for server.js

## Scaling Limits

**localStorage Version History:**
- Current capacity: ~50 versions per session before purge, ~5-10MB browser limit
- Limit: High-resolution images stored as data URIs hit quota fast. Safari quota is ~5MB.
- Scaling path: Migrate to IndexedDB (no practical limit). Implement cloud sync for cross-device access. Use object URLs instead of data URIs. Add compression. Progressive Web App cache API for offline.

**Client-Side Rate Limiting:**
- Current capacity: 10 requests/minute in replicateService.js (client-side only)
- Limit: Trivially bypassed by opening new tab, clearing localStorage, or disabling JS rate limit
- Scaling path: Move to server-side rate limiting with Redis. Implement per-user quotas tied to auth. Add distributed rate limiting across edge nodes. Use token bucket algorithm.

**Neo4j Connection Scaling:**
- Current capacity: Single connection to Neo4j Aura, no pooling configuration visible
- Limit: ~100 concurrent queries before connection pool exhaustion (default limit)
- Scaling path: Configure connection pool size based on load testing. Implement read replicas for query distribution. Add caching layer (Redis) for frequent queries. Consider query result pagination.

**Supabase Vector Search:**
- Current capacity: IVFFlat index on 768-dimensional vectors, 100 artists (post-migration)
- Limit: IVFFlat performance degrades >100k vectors without reindexing. Current list/probe values unknown.
- Scaling path: Monitor query latency at 1k, 10k, 100k artists. Re-tune IVFFlat lists parameter (sqrt of rows). Consider HNSW index for >100k vectors. Implement vector quantization for compression. Add caching for popular queries.

## Dependencies at Risk

**Deprecated domexception Package:**
- Risk: Package marked deprecated in package-lock.json line 8098
- Impact: Transitive dependency, likely from @google-cloud/* packages
- Migration plan: Wait for upstream fix in Google Cloud SDK. Monitor npm audit warnings. No immediate action needed as it's indirect dependency. Platform-native DOMException available in modern Node.js.

**React 19.2.3 (Cutting Edge):**
- Risk: React 19 is very recent (late 2024), ecosystem compatibility unknown
- Impact: Third-party libraries may not support React 19 features/changes yet. Konva, react-konva, framer-motion compatibility uncertain.
- Migration plan: Monitor breaking changes in patch releases. Test thoroughly before upgrading. Consider pinning to 19.2.x in package.json. Have rollback plan to React 18 LTS.

**Next.js 16.1.2 (Latest):**
- Risk: Next.js 16 recently released, potential instability in App Router
- Impact: Edge Runtime bugs, middleware changes, breaking changes in incremental releases
- Migration plan: Pin to 16.1.x minor version. Test deploys to Vercel preview before production. Subscribe to Next.js changelog. Budget for fixes after major releases.

**Mixed Legacy Vite Dependencies:**
- Risk: vite.config.js and vitest.config.js still present despite Next.js migration
- Impact: Conflicting build tools, confusion about which runs in production, unnecessary dependencies
- Migration plan: Remove Vite entirely once Next.js migration complete. Migrate tests to Next.js compatible test runner or update Vitest for Next.js. Remove vite, @vitejs/plugin-react from package.json.

## Missing Critical Features

**No User Authentication:**
- Problem: Production TODO explicitly noted in docs/CLAUDE.md:468 and REQUIREMENTS_AUDIT
- Blocks: Multi-user support, saved designs per user, API quota management, artist dashboard
- Priority: High - required for production launch
- Fix: Implement Firebase Auth (already imported). Add protected routes. Store user designs in Supabase with user_id foreign key. Add login/signup UI.

**No Error Tracking/Monitoring:**
- Problem: VITE_SENTRY_DSN commented out in .env.example, no error tracking configured
- Blocks: Production debugging, crash reporting, performance monitoring
- Priority: High - flying blind in production
- Fix: Configure Sentry or similar (PostHog, LogRocket). Add error boundaries that report to service. Track performance metrics. Set up alerts for error rate spikes.

**No Distributed Rate Limiting:**
- Problem: Stub implementation in src/lib/rate-limit.ts always returns true
- Blocks: Production API abuse prevention, cost control, quota enforcement
- Priority: High - budget protection critical ($500 bootstrap budget)
- Fix: Implement Upstash Redis rate limiter for Edge. Add per-IP, per-user, per-endpoint limits. Return proper 429 responses. Add rate limit headers (X-RateLimit-*).

**No E2E Test Coverage:**
- Problem: Only unit tests exist, no integration/E2E tests for critical user flows
- Blocks: Confident deployments, regression prevention, refactoring safety
- Priority: Medium - manual testing currently required
- Fix: Install Playwright (documented in REQUIREMENTS_AUDIT). Write E2E tests for: generate design, layer editing, version history, artist matching, stencil export. Run in CI/CD.

**No Analytics/Telemetry:**
- Problem: VITE_ANALYTICS_ID commented out, no usage tracking
- Blocks: Understanding user behavior, feature usage metrics, conversion tracking
- Priority: Medium - operating blind on product-market fit
- Fix: Implement PostHog or Mixpanel (privacy-friendly). Track key events: design generated, layer added, stencil exported, artist clicked. Add feature flags for experimentation.

## Test Coverage Gaps

**No Tests for Services Layer:**
- What's not tested: councilService.ts, embeddingService.ts, gcs-service.ts, generationService.ts, imageProcessingService.js, multiLayerService.js (only test exists but may be outdated)
- Files: Services in `src/services/` directory
- Risk: Core business logic can break silently. API integration errors not caught. Regression when refactoring.
- Priority: High - services are critical paths

**No Tests for Canvas Operations:**
- What's not tested: canvasService.ts transform functions, layer compositing, blend modes, export functions
- Files: `src/features/generate/services/canvasService.ts` (470 lines, 0 tests)
- Risk: Layer manipulation bugs in production. Export failures not caught. Transform matrix errors cause visual glitches.
- Priority: High - core feature, high complexity

**No Tests for Hooks:**
- What's not tested: useLayerManagement, useVersionHistory, useImageGeneration, useTransformOperations, useTransformShortcuts, useRealtimeMatchPulse
- Files: `src/features/generate/hooks/`, `src/hooks/`
- Risk: State management bugs. Race conditions in async operations. Memory leaks in subscriptions.
- Priority: Medium - hooks are reusable, bugs affect multiple components

**No Tests for Next.js API Routes:**
- What's not tested: All routes in src/app/api/v1/*, src/app/api/predictions/*, src/app/uploads/
- Files: 10+ API route handlers
- Risk: Auth bypass, validation failures, proxy errors, rate limit bypass
- Priority: High - API security critical

**No Integration Tests for Hybrid Matching:**
- What's not tested: End-to-end flow of Neo4j + Supabase → RRF → results
- Files: `src/features/match-pulse/services/hybridMatchService.ts`
- Risk: Integration between graph and vector DB can fail silently. RRF algorithm not validated against real data.
- Priority: High - core value proposition

---

*Concerns audit: 2026-01-31*
