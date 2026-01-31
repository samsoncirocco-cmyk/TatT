# Architecture

**Analysis Date:** 2026-01-31

## Pattern Overview

**Overall:** Hybrid Next.js 16 + React 19 full-stack application with client-side canvas composition, server-side AI generation, and semantic artist matching using Neo4j graph + vector embedding search.

**Key Characteristics:**
- Next.js App Router with mixed Edge/Node.js runtimes for different computational requirements
- Layered client state management (Zustand for canvas, React hooks for features)
- Service-oriented architecture with clear separation of concerns
- Hybrid matching combining vector similarity search with graph database traversal
- Dynamic runtime selection based on operation complexity (edge for matching, nodejs for heavy compute)

## Layers

**Presentation Layer:**
- Purpose: Render UI components and handle user interactions
- Location: `src/app/*`, `src/components/**/*.{jsx,tsx}`, `src/features/**`
- Contains: Next.js pages, React components (class and functional), feature modules
- Depends on: Hooks, stores, services, UI components
- Used by: End users via browser

**State Management Layer:**
- Purpose: Manage application state including canvas layers, user session, and feature flags
- Location: `src/stores/useForgeStore.ts` (Zustand), `src/hooks/**` (React hooks)
- Contains: Zustand store for layer persistence, custom hooks for feature logic
- Depends on: Services, utilities
- Used by: Presentation layer components

**Service Layer:**
- Purpose: Handle business logic, API integrations, and data transformations
- Location: `src/services/**`
- Contains: 35+ services including generation, matching, storage, image processing
- Key services:
  - `hybridMatchService.ts`: Semantic artist matching combining vectors and graphs
  - `neo4jService.ts`: Graph database queries for artist genealogy and relationships
  - `vertex-ai-service.js`: Imagen 3.0 image generation integration
  - `canvasService.ts`: Layer manipulation and canvas operations
  - `councilService.js`: Multi-model AI prompt enhancement (OpenRouter)
  - `gcs-service.ts`: Google Cloud Storage integration
  - `replicateService.js`: External model execution via Replicate
- Depends on: External APIs, utilities, config
- Used by: API routes, components via hooks

**API Layer:**
- Purpose: Handle HTTP requests and delegate to services, with authentication
- Location: `src/app/api/**` (Next.js route handlers)
- Contains: Route files organized by domain (v1/generate, v1/match, v1/storage, etc.)
- Runtime selection:
  - `edge`: Lightweight operations like semantic matching, council enhancement (routes: `/v1/match/semantic`, `/v1/council/enhance`)
  - `nodejs`: Heavy compute or external integrations (routes: `/v1/generate`, `/v1/embeddings/generate`, `/v1/stencil/export`)
- Depends on: Services, authentication middleware
- Used by: Frontend via fetch, external clients

**Data & Configuration Layer:**
- Purpose: Define schemas, constants, and configuration
- Location: `src/constants/`, `src/config/`, `src/db/`, `src/data/`
- Contains:
  - `bodyPartAspectRatios.ts`: Canvas dimensions for different body parts
  - `promptTemplates.js`: Style-based prompt construction
  - `modelRoutingRules.js`: Model selection logic
  - `characterDatabase.js`: 100KB+ character/style reference data
  - `vectorDbConfig.js`: Vector database configuration
- Depends on: Nothing (foundational)
- Used by: All layers

**Infrastructure Layer:**
- Purpose: Authentication, rate limiting, logging, external service clients
- Location: `src/lib/`, middleware
- Contains:
  - `api-auth.ts`: Bearer token verification
  - `vertex-imagen-client.ts`: Vertex AI API client
  - `segmentation-vertex.ts`: Image segmentation via Vertex
  - `neo4j.ts`: Neo4j connection configuration
  - `rate-limit.ts`: Express rate limiting
- Depends on: Environment variables
- Used by: Service and API layers

## Data Flow

**Design Generation Flow:**

1. User enters prompt on `/generate` page (`src/features/Generate.jsx`)
2. Component calls `enhancePrompt()` from `councilService.js` via hook
3. Enhanced prompt sent to `/api/v1/generate` (edge runtime)
4. Route calls `generateWithImagen()` from `vertex-ai-edge.ts`
5. Returns base64 images
6. Component adds image to canvas via `useForgeStore.addLayer()`
7. Store creates Layer object with `canvasService.createLayer()`
8. Layer persisted to sessionStorage via Zustand persist middleware

**Artist Matching Flow:**

1. User provides search query on Match page
2. Component calls `/api/v1/match/semantic` with query and preferences
3. Edge route calls `findMatchingArtists()` from `hybridMatchService.ts`
4. Service performs dual search:
   - Vector similarity: calls `searchSimilar()` from `vectorDbService.js`
   - Graph traversal: calls `findMatchingArtists()` from `neo4jService.ts` (HTTP proxy)
5. Results merged and scored via `mergeResults()` and `calculateCompositeScore()`
6. Response includes matches, match reasoning, and score breakdown
7. Frontend renders artist cards with MatchPulse animations

**Layer Composition Flow:**

1. Multiple layers managed in Zustand store (`useForgeStore`)
2. Each layer has transform (position, scale, rotation), blend mode, visibility
3. Transform updates via `useTransformShortcuts` hook
4. History tracked: every operation recorded to `history.past` array (max 50)
5. Undo/redo replay from history snapshots
6. Canvas export via `exportAsPNG()` from `canvasService.ts`
7. Optional stencil conversion via `convertToStencil()` from `stencilService.js`

**State Management:**

- Canvas state: Zustand store with sessionStorage persistence (layers, selection, transforms)
- Feature state: React hooks (useImageGeneration, useLayerManagement, useArtistMatching)
- No global Redux/Recoil: selective Zustand for canvas only
- History: In-memory array of Layer snapshots, max 50 states

## Key Abstractions

**Layer:**
- Purpose: Represents a single composable image on the canvas
- Examples: `src/services/canvasService.ts` (Layer interface), `src/stores/useForgeStore.ts` (layer management)
- Pattern: Immutable data with pure functions for transformations
- Structure: ID, name, image URL, transform matrix, blend mode, visibility, z-index, optional thumbnail

**Service Pattern:**
- Purpose: Encapsulate business logic for specific domains
- Examples: `councilService.js` (AI enhancement), `hybridMatchService.ts` (matching), `neo4jService.ts` (graph queries)
- Pattern: Pure or idempotent functions, error throwing with specific codes, logging
- Composition: Services call other services, utilities, and external APIs

**Hook Pattern:**
- Purpose: Reuse stateful logic in functional components
- Examples: `useImageGeneration.js`, `useLayerManagement.ts`, `useArtistMatching.js`
- Pattern: useState/useCallback for local state, integration with services
- Lifecycle: useEffect for initialization, cleanup

**Store Pattern (Zustand):**
- Purpose: Share mutable state across component tree without prop drilling
- Examples: `useForgeStore.ts` for canvas layer state
- Pattern: Action methods (addLayer, updateTransform, undo) that update state via `set()`
- Persistence: Conditional middleware wrapping based on `typeof window`

## Entry Points

**Frontend Entry:**
- Location: `src/app/layout.tsx`
- Triggers: Browser navigation to domain
- Responsibilities: Root layout, font setup, metadata, children rendering

**Generation Route:**
- Location: `src/app/generate/page.tsx` → dynamically imports `src/features/Generate.jsx`
- Triggers: User navigates to `/generate` or clicks "Enter the Forge"
- Responsibilities: Load generation UI with lazy loading, render full-featured editor

**API Entry - Image Generation:**
- Location: `src/app/api/v1/generate/route.ts`
- Triggers: POST to `/api/v1/generate` with `{ prompt, bodyPart, aspectRatio, ... }`
- Responsibilities: Validate request, call Vertex Imagen, return base64 images

**API Entry - Semantic Matching:**
- Location: `src/app/api/v1/match/semantic/route.ts`
- Triggers: POST to `/api/v1/match/semantic` with `{ query, location, style_preferences, radius, ... }`
- Responsibilities: Authenticate, call hybrid matching, return ranked artists

**API Entry - Storage:**
- Location: `src/app/api/v1/storage/upload/route.ts`, `/get-signed-url/route.ts`
- Triggers: POST for upload or get signed URL
- Responsibilities: Handle multipart/file uploads to GCS, return signed URLs

## Error Handling

**Strategy:** Differentiated error handling by layer

**API Routes:**
- Pattern: Try/catch blocks with specific error codes
- Error types: AUTH_REQUIRED, AUTH_INVALID, INVALID_PROMPT, VERTEX_QUOTA_EXCEEDED, GENERATION_FAILED
- Response: `{ error, code, details?, message? }` with appropriate HTTP status (400, 401, 403, 429, 500)
- Logging: console.error with context prefix (e.g., `[API] Semantic match error:`)

**Services:**
- Pattern: Throw Error with `.code` property for specific error types
- Codes: VERTEX_QUOTA_EXCEEDED, GCS_NOT_CONFIGURED, INVALID_PROMPT, etc.
- Propagation: Errors bubble up to API route handlers
- Logging: Limited logging in services, detailed logging in route handlers

**Frontend Components:**
- Pattern: ErrorBoundary component wraps feature modules
- Location: `src/components/ErrorBoundary.jsx`
- Fallback: Error message display, optional recovery actions

**Edge Cases:**
- Missing auth header → 401 with WWW-Authenticate header
- Invalid prompt (empty or <3 chars) → 400 with code INVALID_PROMPT
- Quota exceeded → 429 status code
- Configuration missing (VERTEX_KEY, GCS_PROJECT) → 500 with config error code

## Cross-Cutting Concerns

**Logging:**
- Framework: native console (console.log, console.error)
- Pattern: Contextual prefixes like `[API]`, `[Service]`
- Granularity: Operation start/completion with duration in ms
- Examples: `[API] Semantic match completed in ${duration}ms, found ${result.matches.length} matches`

**Validation:**
- Frontend: Basic input validation in components and hooks
- Backend: Request body validation in route handlers (e.g., prompt length, enum values)
- Service: Domain-specific validation (e.g., supported body parts in AR endpoint)
- Pattern: Return early with specific error codes for invalid inputs

**Authentication:**
- Pattern: Bearer token in Authorization header
- Implementation: `verifyApiAuth()` called at start of protected routes
- Token source: Environment variable `FRONTEND_AUTH_TOKEN`
- Scope: All `/api/v1/*` routes use this pattern

**Rate Limiting:**
- Implementation: Express middleware `express-rate-limit`
- Location: Potentially used in Express server.js, not yet integrated into Next.js routes
- Purpose: Prevent abuse of generation and matching endpoints

**Performance Monitoring:**
- Pattern: Duration tracking in route handlers via `Date.now()`
- Response field: `performance: { duration_ms: ... }`
- No centralized monitoring: performance data returned to client

---

*Architecture analysis: 2026-01-31*
