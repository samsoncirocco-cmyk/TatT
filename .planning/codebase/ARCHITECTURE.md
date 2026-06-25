# Architecture

**Analysis Date:** 2026-01-31

## Pattern Overview

**Overall:** Hybrid Next.js App Router + Legacy SPA

**Key Characteristics:**
- Next.js 16 with App Router for modern pages and API routes
- Legacy React SPA code (`src/App.jsx`, `src/main.jsx`) for older features
- Feature-based modular organization for domain logic
- Service-oriented architecture with shared utilities
- Zustand for client state management
- Edge runtime for critical API routes

## Layers

**Presentation Layer (App Router):**
- Purpose: Next.js pages and layouts using App Router pattern
- Location: `src/app/`
- Contains: Page components, layouts, API route handlers
- Depends on: Features, components, services, stores
- Used by: End users via browser navigation

**Presentation Layer (Legacy SPA):**
- Purpose: React Router-based SPA application
- Location: `src/App.jsx`, `src/main.jsx`, `src/pages/`, `src/components/`
- Contains: Page components, shared components, routing logic
- Depends on: Features, services, stores
- Used by: Legacy entry point (parallel to Next.js)

**Feature Layer:**
- Purpose: Domain-specific business logic organized by feature
- Location: `src/features/`
- Contains: Feature-specific components, hooks, services for generate, match-pulse, inpainting, stencil
- Depends on: Services, lib, stores
- Used by: Presentation layers

**Service Layer:**
- Purpose: External integrations and data operations
- Location: `src/services/`
- Contains: API clients, business logic services (councilService, generationService, gcs-service, etc.)
- Depends on: Lib utilities, external APIs
- Used by: Features, API routes

**Utility Layer:**
- Purpose: Shared cross-cutting utilities and helpers
- Location: `src/lib/`, `src/utils/`
- Contains: Auth helpers, API clients, utilities, reusable functions
- Depends on: External libraries only
- Used by: All layers

**State Management Layer:**
- Purpose: Global client state using Zustand
- Location: `src/store/`, `src/stores/`
- Contains: Zustand stores (useForgeStore, useAuthStore, useMatchStore)
- Depends on: Feature services (for actions)
- Used by: Components and hooks

**Configuration Layer:**
- Purpose: Static configuration and data
- Location: `src/config/`, `src/constants/`, `src/data/`
- Contains: Character database, prompt templates, body part configs, model routing rules
- Depends on: Nothing
- Used by: Services and features

## Data Flow

**Image Generation Flow:**

1. User triggers generation from `src/app/generate/page.tsx` or `src/features/Generate.jsx`
2. Component calls feature hook or makes API request to `src/app/api/v1/generate/route.ts`
3. API route validates auth via `src/lib/api-auth.ts`
4. Route delegates to `src/services/generationService.ts`
5. GenerationService gets GCP token via `src/lib/google-auth-edge.ts`
6. Service calls Vertex AI Imagen API with retry logic
7. Base64 images returned through service → route → component
8. Component adds images to canvas via `useForgeStore` which uses `src/features/generate/services/canvasService.ts`

**Artist Matching Flow:**

1. User interacts with match UI in `src/features/match-pulse/`
2. Component uses `src/features/match-pulse/hooks/useArtistMatching.js` or `useRealtimeMatchPulse.js`
3. Hook calls `src/features/match-pulse/services/hybridMatchService.ts`
4. HybridMatchService generates embedding via `src/services/embeddingService.ts`
5. Service queries Neo4j via `src/features/match-pulse/services/neo4jService.ts`
6. Service performs vector search via custom vectorDbService
7. Results merged and scored, returned to UI
8. State updated in `src/store/useMatchStore.ts`

**State Management:**
- Zustand stores provide reactive state with persistence (sessionStorage for Forge, localStorage for auth/match)
- Stores import service functions directly for actions
- Components subscribe to stores via hooks
- State changes trigger re-renders automatically

## Key Abstractions

**Layer (Canvas System):**
- Purpose: Represents a compositable image layer with transforms
- Examples: `src/features/generate/services/canvasService.ts`, `src/stores/useForgeStore.ts`
- Pattern: Immutable data structure with functional updates, managed in Zustand store with history

**Feature Module:**
- Purpose: Self-contained domain feature with components, hooks, services
- Examples: `src/features/generate/`, `src/features/match-pulse/`, `src/features/stencil/`, `src/features/inpainting/`
- Pattern: Index exports, internal services, isolated from other features

**Service:**
- Purpose: Encapsulates external API interaction or complex business logic
- Examples: `src/services/generationService.ts`, `src/services/councilService.ts`, `src/services/gcs-service.ts`
- Pattern: Export async functions with typed interfaces, handle errors with custom error codes

**API Route Handler:**
- Purpose: Next.js API endpoint with auth, validation, error handling
- Examples: `src/app/api/v1/generate/route.ts`, `src/app/api/v1/match/semantic/route.ts`
- Pattern: Edge runtime, auth middleware, service delegation, structured error responses

## Entry Points

**Next.js App (Modern):**
- Location: `src/app/layout.tsx`, `src/app/page.tsx`
- Triggers: Next.js server-side routing
- Responsibilities: Root layout, home page, app-level metadata

**Next.js Generate Page:**
- Location: `src/app/generate/page.tsx`
- Triggers: Navigation to `/generate`
- Responsibilities: Dynamic import of Generate feature, client-side rendering

**Legacy SPA Entry:**
- Location: `src/main.jsx`, `src/App.jsx`
- Triggers: ReactDOM.createRoot on `index.html`
- Responsibilities: React Router setup, legacy page routing (parallel system to Next.js)

**API Routes:**
- Location: `src/app/api/v1/*/route.ts`
- Triggers: HTTP requests from frontend
- Responsibilities: Auth, validation, service orchestration, error handling

**Standalone Server (Legacy):**
- Location: `server.js` (root)
- Triggers: Node process start
- Responsibilities: Express server, CORS, Replicate proxy, rate limiting (legacy, may be deprecated)

## Error Handling

**Strategy:** Custom error codes with structured responses

**Patterns:**
- Services throw errors with `code` property (e.g., `VERTEX_QUOTA_EXCEEDED`, `AUTH_INVALID`)
- API routes catch errors and map codes to HTTP status codes
- Frontend receives structured JSON: `{ error, code, message, details }`
- Edge routes use NextResponse for consistent error format
- Client-side: Display user-friendly messages based on error codes

## Cross-Cutting Concerns

**Logging:** Centralized via `src/lib/observability.ts` with event tracking (logEvent function)
**Validation:** Request validation in API routes, type safety via TypeScript
**Authentication:** Bearer token auth via `src/lib/api-auth.ts` for protected API routes

---

*Architecture analysis: 2026-01-31*
