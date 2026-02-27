# Codebase Concerns

**Analysis Date:** 2026-02-15

## Tech Debt

### Missing Text Embedding Implementation

**Issue:** Hybrid vector-graph matching uses mock embeddings instead of real text encoders
- **Files:** `src/services/hybridMatchService.ts:144-160`
- **Impact:** Semantic search quality degraded - artist recommendations based on deterministic hash instead of semantic meaning. Query "Japanese traditional" and "Japanese old-school" would have completely different embeddings despite similar meaning.
- **Current State:** Uses sinusoidal hash-based mock embeddings (Math.sin(hash * (i + 1) * 0.001))
- **Fix approach:**
  - Implement Vertex AI text-embedding-004 integration (aligned with existing Vertex stack)
  - Or use lightweight CLIP text encoder for client-side embedding
  - Cache embeddings to avoid regenerating for repeated queries
  - Test vector quality against ground truth artist similarities

### Rate Limiting Not Implemented

**Issue:** Server-side rate limiting is stubbed out and always returns true (allow)
- **Files:** `src/lib/rate-limit.ts:9-11`
- **Impact:** Budget exhaustion risk - no protection against automated requests burning $500 Replicate budget. Client-side rate limiting (10 req/min) alone is insufficient for production.
- **Current State:** Function returns `true` (allowed) for all requests, comment indicates distributed rate limiting needed
- **Fix approach:**
  - Use Upstash Redis for distributed rate limiting (per IP, per user session, per endpoint)
  - Implement sliding window: 20 requests/hr for council endpoint, 100 requests/hr for semantic match
  - Add graceful degradation when rate limit hit (queue or error response)
  - Monitor spending per user session with localStorage tracking

### Hardcoded Development Auth Token

**Issue:** Fallback to 'dev-token-change-in-production' hardcoded across multiple services
- **Files:**
  - `src/lib/api-auth.ts:3`
  - `src/services/layerDecompositionService.js:8`
  - `src/services/multiLayerService.ts:10-12`
  - `server.js:36`
  - Multiple service files with same fallback
- **Impact:** In production, if FRONTEND_AUTH_TOKEN env var missing, API becomes completely open. Any request without token or with wrong token still succeeds in services using fallback.
- **Current State:** Each service independently implements fallback to hardcoded dev token
- **Fix approach:**
  - Remove all fallbacks - throw error if token not configured
  - Use strict environment validation on server startup
  - Add pre-flight check in both Next.js and Express servers
  - Rotate token quarterly, log all token usage

## Known Bugs

### localStorage Quota Exceeded Handling

**Issue:** Version history and design library store large amounts in localStorage without proper overflow handling
- **Files:** `src/services/versionService.ts:56-84`, `src/services/designLibraryService.ts:122-179`
- **Symptoms:** Design library shows "Library is full" error (50 design limit), but older versions aren't actually purged. Tab freeze when localStorage quota reached (~5-10MB browser limit).
- **Trigger:** Save 30+ complex designs with layers, or load application in low-storage environment
- **Current Handling:**
  - versionService has 90-day auto-purge with 1-in-10 random trigger (non-deterministic cleanup)
  - designLibraryService warns but doesn't aggressively clean
  - No fallback to IndexedDB when localStorage full
- **Workaround:** User must manually delete favorites or clear browser data
- **Fix approach:**
  - Add localStorage quota check before every write
  - Migrate large blobs (images) to IndexedDB by default
  - Store only metadata + references in localStorage
  - Implement deterministic cleanup on startup (not random)
  - Add UI warning when approaching 80% quota

### Image Loading Race Condition in Canvas

**Issue:** Thumbnail generation can timeout or fail silently
- **Files:** `src/services/canvasService.ts:189-240`
- **Symptoms:** Layer thumbnails appear blank, canvas exports missing layer images
- **Trigger:** Large images (>5MB), slow network, or image URL becomes invalid during canvas render
- **Current State:**
  - Timeout set to 5s (hardcoded)
  - onerror/onload handlers not guaranteed to fire
  - Multiple timeouts not properly cleared in all paths
- **Impact:** Affects export quality, makes version history visuals unreliable
- **Fix approach:**
  - Use Promise.race() with explicit timeout
  - Implement image preloading queue with retry logic
  - Add fallback thumbnail generation from canvas drawing directly
  - Log failed image URLs for debugging

### Version Comparison Silently Returns Empty

**Issue:** compareVersions function returns empty diff if versions can't be serialized
- **Files:** `src/services/versionService.ts` (line ~250)
- **Symptoms:** "Compare Versions" button shows no difference even when designs changed
- **Trigger:** Complex layer objects with circular references, or large image data structures
- **Current Handling:** Catches error and returns null without logging
- **Fix approach:**
  - Implement deep equality check with better error messages
  - Add logging for serialization failures
  - Return partial diff even if some fields fail
  - UI should show "Comparison unavailable - designs too complex"

## Security Considerations

### Client-Side Secret Exposure Risk (MVPAcceptable, Production Critical)

**Issue:** API tokens visible in client-side code for development
- **Files:** All service files in `src/services/`
- **Risk:** Replicate API token, OpenRouter key, GCS credentials used directly from client in demo mode
- **Current Mitigation:**
  - Backend proxy routes API calls (correct pattern for Replicate in production)
  - FRONTEND_AUTH_TOKEN used as light auth between frontend/backend
  - Demo mode explicitly disables real API calls
- **CLAUDE.md Notes:** "Development MVP: API tokens visible in client (acceptable for prototyping)" and "Production TODO: Move all API calls to server-side"
- **Recommendations:**
  - Audit `NEXT_PUBLIC_*` env vars - only non-sensitive config should be exposed
  - Remove any hardcoded `sk-` keys from source code
  - Add pre-deploy check: grep for `VITE_*API_KEY` patterns
  - Implement API key rotation mechanism for production

### Neo4j and Supabase Credentials Access

**Issue:** Service credentials passed through multiple layers without encryption
- **Files:**
  - `src/services/neo4jService.ts:128` - Bearer token in fetch
  - `src/services/vectorDbService.ts:82` - Service key usage
  - `server.js:33-35` - Neo4j creds from env
- **Risk:** If frontend can directly query Neo4j or Supabase, credentials become client-exposed. Actual risk currently mitigated by backend-routing approach.
- **Current Pattern:** Correct - services route through `/api/*` endpoints
- **Recommendations:**
  - Keep all database clients server-only
  - Never expose service keys to client
  - Audit `firebase-match-service.ts` - mixing NEXT_PUBLIC and private creds

### CORS Overly Permissive for Vercel Subdomain

**Issue:** CORS allows any `*.vercel.app` domain
- **Files:** `server.js:60-62`
- **Risk:** Any Vercel-hosted project can access your API (supply-chain attack vector)
- **Current:**
  ```javascript
  if (origin.endsWith('.vercel.app')) {
    console.log(`[CORS] Origin ${origin} allowed (Vercel domain)`);
    return callback(null, true);
  }
  ```
- **Fix approach:**
  - Whitelist only specific Vercel URL: `https://tat-t-3x8t.vercel.app`
  - Require explicit origin matching (no wildcard subdomains)
  - Add per-endpoint CORS rules (stricter for sensitive endpoints like `/match/update`)

## Performance Bottlenecks

### Large Config Files Loaded at Runtime

**Issue:** Two large JSON-like config files loaded into memory on every page
- **Files:**
  - `src/config/characterDatabase.js` - 2,169 lines (character/style data)
  - `src/config/promptTemplates.js` - 486 lines (prompt templates)
- **Impact:** Slow initial bundle load, especially on slow networks. characterDatabase.js likely contains full content inline.
- **Metrics:** 2K+ lines × 30-40 bytes/line ≈ 60-80KB uncompressed per file
- **Fix approach:**
  - Split characterDatabase into smaller modules by category
  - Lazy load on demand (only load when Generate page opens)
  - Consider server-side storage (Vercel KV, Supabase) for dynamic data
  - Add code splitting boundaries in vite.config.js

### Hybrid Matching Timeout Risk

**Issue:** Semantic match has 5-second timeout with no fallback
- **Files:** `src/services/hybridMatchService.ts:392-397`
- **Impact:** If vector DB slow, entire match request fails instead of gracefully degrading to graph-only results
- **Current:** Warns if approaching timeout, but doesn't implement graceful degradation
- **Metrics:** TIMEOUT_MS set to 5000ms (hardcoded)
- **Fix approach:**
  - Return partial results: "Graph results only (vector DB timeout)"
  - Implement parallel timeout for vector + graph independently
  - Cache vector results aggressively (5-min TTL)
  - Add monitoring: log slow queries to identify vector DB issues

### Version History Random Cleanup

**Issue:** Version history auto-purge triggered 1-in-10 calls with Math.random()
- **Files:** `src/services/versionService.ts:39-42`
- **Impact:** Non-deterministic performance - user sometimes gets 100ms lag on first action due to cleanup
- **Current:** `if (Math.random() < 0.1) { purgeOldHistories(); }`
- **Better Approach:**
  - Move cleanup to service worker or background job
  - Trigger on app boot, not on every getVersions call
  - Add cleanup to version save logic only (batch cleanup)

## Fragile Areas

### Multi-Layer Decomposition Service

**Files:** `src/services/layerDecompositionService.js`, `src/services/multiLayerService.ts`
- **Why Fragile:**
  - Calls Vertex AI to decompose generated image into multiple layers
  - No test coverage visible (12 test files total, none for decomposition)
  - Depends on image quality and Vertex understanding of tattoo aesthetics
  - Falls back to single-layer if decomposition fails (silent failure)
- **Safe Modification:**
  - Add unit tests for edge cases: blank images, low-contrast designs, solid colors
  - Test with known good/bad images and capture expected outputs
  - Add explicit logging when decomposition fails
  - Version the decomposition model (could change output format)
- **Test Coverage Gaps:** No tests for:
  - Failure scenarios (bad image, API timeout)
  - Layer ordering (should order by visual importance?)
  - Edge cases (tiny image, pure white/black)

### Hybrid Matching Score Merging

**Files:** `src/utils/scoreAggregation.js`, `src/services/hybridMatchService.ts:320-360`
- **Why Fragile:**
  - Combines graph + vector scores with hardcoded weights (50/50)
  - RRF algorithm (Reciprocal Rank Fusion) sensitive to tie-breaking
  - If vector DB returns different ranking than graph DB, results inconsistent
  - No unit tests for score calculation
- **Safe Modification:**
  - Add extensive unit tests for RRF with known inputs/outputs
  - Make weights configurable (allow A/B testing)
  - Test score distribution: do top matches cluster together or spread evenly?
  - Document RRF assumptions (assumes independent ranking systems)
- **Test Coverage Gaps:**
  - No tests for RRF score calculation
  - No test for tie-breaking behavior
  - No test for weight sensitivity

### Canvas Layer Rendering

**Files:** `src/services/canvasService.ts`, `src/components/generate/ForgeCanvas.jsx`
- **Why Fragile:**
  - Konva canvas library version pinned at ^10.2.0
  - Layer transforms (rotate, scale) calculated in JavaScript, not GPU
  - No validation of transform values (could cause NaN cascades)
  - Blend mode support depends on browser (some browsers don't support all modes)
- **Safe Modification:**
  - Validate all transform inputs before applying
  - Test on Safari/Firefox for blend mode support
  - Add performance monitoring: warn if >10 layers or complex transforms slow rendering
  - Cache rendered layers to prevent recomputation
- **Test Coverage Gaps:**
  - No tests for transform accuracy
  - No tests for blend mode fallbacks
  - No performance regression tests for large layer counts

## Scaling Limits

### localStorage Capacity

**Current Capacity:** ~5-10MB per browser (varies by browser, domain)
**What's Stored:**
- Design library: 50 designs × ~200KB (large base64 images) = ~10MB
- Version history: 50 versions × ~100KB = ~5MB
- Total: ~15MB needed for full features

**Limit Hit:** When user saves 30+ designs with multiple versions
**Scaling Path:**
- Migrate images to IndexedDB (unlimited by browser, slower)
- Move design library to Supabase (unlimited, requires auth)
- Implement cloud sync: localStorage as cache, server as source of truth
- Add periodic cloud backup of localStorage data

### Replicate API Budget ($500)

**Current Consumption:**
- SDXL: $0.0055 per generation × 4 variations = $0.022 per request
- Budget breakdown: ~22,700 variations or ~5,675 requests
- Client-side tracking in localStorage (vulnerable to manipulation)

**Scaling Risk:** No real rate limiting, budget can be exceeded in one session
**Scaling Path:**
- Implement server-side budget tracking (Redis counter per user session)
- Hard limit requests at API gateway level
- Use cheaper models: image variants instead of full regeneration
- Implement batch generation (generate once, show 4 variations)
- Add user-level daily quota

### Concurrent Generation Requests

**Current Limit:** Replicate queue + Express rate limiting (30 req/min global)
**Bottleneck:** If 100 users hit "Generate" simultaneously, queue backs up 3+ seconds
**Scaling Path:**
- Add job queue (Bull, RabbitMQ) for generation requests
- Implement priority queue (premium users get priority)
- Add request batching (combine similar requests)
- Monitor API latency and reject early if queue too deep

### Neo4j Database Connections

**Current:** Driver created per `neo4jService.ts` call (connection pooling in driver)
**Risk:** Graph traversal queries without pagination - could return 1000+ artists
**Scaling Path:**
- Enforce pagination (limit 50 results with offset)
- Add query timeout (currently no timeout in Neo4j queries)
- Cache query results (5-min TTL) to reduce DB load
- Monitor slow queries: log queries >500ms

## Dependencies at Risk

### Next.js 16.1.2 (Latest)

**Risk:** Major version recently released, potential instability
**Impact:**
  - Build issues with webpack --webpack flag
  - Edge runtime compatibility (using for some routes)
  - React 19 integration might have edge cases
**Migration Plan:**
  - Monitor Next.js GitHub releases for patch updates
  - Test in staging before deploying new versions
  - Keep separate dev/prod version pins to catch issues early

### Zustand ^5.0.10 (Latest)

**Risk:** Added to dependencies but NOT used (checked src/ - no zustand imports)
**Impact:** Dead dependency, adds unnecessary bundle size
**Recommendation:** Remove from package.json if unused. Current state uses custom hooks + React Context instead.

### neo4j-driver ^6.0.1

**Risk:** Major version, API may have breaking changes
**Impact:** Graph queries might fail silently if driver API changed
**Monitoring:** Check Neo4j release notes for 6.x features. Currently no version lock on 6.0.1 specifically.

### @google-cloud/vertexai ^1.10.0 (Semi-Recent)

**Risk:** Rapid iteration, may be missing edge cases in new releases
**Impact:** Image generation and embeddings depend on this SDK
**Mitigation:** Pin to specific patch version (e.g., 1.10.2) once stable
**Recommendation:** Test all Vertex AI features in staging before production deploy

### firebase-admin ^13.6.0

**Risk:** Different versions on client (firebase ^12.8.0) and admin (^13.6.0)
**Impact:** Potential data format incompatibilities between Client SDK and Admin SDK
**Current Handling:**
  - Files: `src/services/firebase-match-service.ts` mixes both SDKs
  - Uses environment variable mixing for dual-platform support
**Fix:** Consider moving all Firebase to backend-only, or upgrade client to v13

## Missing Critical Features

### User Authentication

**Problem:** No user accounts, all data stored in browser localStorage
**Blocks:**
- Cross-device design sync
- Cloud backup of designs
- User-specific rate limiting
- Personalized artist matching based on history
**Why Missing:** MVP scope - "first-time tattoo seekers" don't require accounts
**If Needed:** Add Firebase Auth or Supabase Auth integration (~5 hours work)

### Real-Time Collaboration

**Problem:** Designs are single-user, stored in localStorage
**Blocks:**
- Multiple designers working on same design
- Sharing designs with friends for feedback
- Artist collaboration features
**Why Missing:** MVP scope
**If Needed:** Implement CRDTs (Yjs) + WebSocket sync (~10 hours work)

### Export Format Support

**Problem:** Only exports PNG and stencil format
**Blocks:**
- Vector export (SVG) for professional stencil use
- PDF printing with multiple stencil pages
- Direct printing to tattoo stencil paper
**Current:** `src/services/stencilService.ts` - PNG only, converts to B&W
**Impact:** Professional tattoo artists need SVG for resizing without quality loss
**Fix:** Add svg.js library + vector trace implementation (~4 hours work)

## Test Coverage Gaps

### Canvas Service

**What's Not Tested:** `src/services/canvasService.ts`
- Layer rendering with different blend modes
- Transform accuracy (rotate/scale/flip)
- Export quality (PNG compression settings)
- Thumbnail generation timeout handling
- Image loading failures

**Files:** `src/services/canvasService.ts` (458 lines) - 0 test coverage
**Risk:** Export feature could produce corrupted/blank images undetected
**Priority:** High - core feature

### Version Service

**What's Not Tested:** `src/services/versionService.ts`
- Version comparison algorithm
- 90-day purge logic
- Edge case: 50-version limit enforcement
- localStorage quota exceeded scenario
- Corrupt version data recovery

**Files:** `src/services/versionService.ts` (250+ lines)
**Test File:** `src/services/versionService.test.js` - exists but likely incomplete
**Priority:** Medium - affects user experience but not critical

### Hybrid Matching Algorithm

**What's Not Tested:** `src/services/hybridMatchService.ts`
- RRF score calculation
- Weight sensitivity (50/50 graph/vector split)
- Timeout fallback behavior
- Empty result handling (no matches found)
- Score normalization across different artist databases

**Files:** `src/services/hybridMatchService.ts` (467 lines) - NO test coverage
**Risk:** Artist recommendations could be completely random without tests
**Priority:** Critical - core feature

### Council Enhancement Service

**What's Not Tested:** `src/services/councilService.ts`
- Multi-agent prompt refinement flow
- Fallback to single agent when multi-agent fails
- OpenRouter vs Vertex AI routing decision
- Timeout handling (10-second limit)
- Empty/invalid prompt handling

**Files:** `src/services/councilService.ts` (900 lines)
**Test Files:** `src/services/councilService.test.js`, `src/services/__tests__/councilService.test.js` - multiple test files exist
**Priority:** High - expensive API calls, needs quality assurance

### API Route Error Handling

**What's Not Tested:**
- `/api/v1/generate/route.ts` - Image generation API
- `/api/v1/council/enhance/route.ts` - Prompt enhancement
- `/api/neo4j/query/route.ts` - Neo4j queries
- `/api/predictions/route.ts` - Replicate polling

**Missing:** Error scenarios: missing env vars, invalid auth, timeout, malformed requests
**Priority:** High - production stability

---

*Concerns audit: 2026-02-15*
