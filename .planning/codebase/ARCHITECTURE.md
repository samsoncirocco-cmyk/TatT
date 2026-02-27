# Architecture

**Analysis Date:** 2026-02-15

## Pattern Overview

**Overall:** Hybrid Frontend-Backend with Next.js, React, and Service-Oriented Architecture

**Key Characteristics:**
- Next.js 16 with React 19 as primary framework
- Service layer abstraction for all business logic
- Zustand for client-side state management
- Custom React hooks for stateful UI logic
- Dual-provider AI generation (Replicate + Vertex AI)
- Hybrid vector-graph matching for artist discovery

## Layers

**Presentation Layer:**
- Purpose: React components for user interface, animations, and interactive elements
- Location: `src/components/`, `src/pages/`
- Contains: Page components, feature-specific components, reusable UI components
- Depends on: Hooks, services, stores, constants
- Used by: Router (App.jsx), other components

**Pages/Route Layer:**
- Purpose: Top-level route pages that compose features
- Location: `src/pages/`
- Contains: `Generate.jsx`, `Visualize.jsx`, `SmartMatch.jsx`, `SwipeMatch.jsx`, `Artists.jsx`, `ArtistProfile.jsx`, `Journey.jsx`, `Philosophy.jsx`
- Depends on: Components, hooks, services
- Used by: App router via React Router DOM

**State Management Layer:**
- Purpose: Centralized state for canvas layers, history, and application data
- Location: `src/stores/useForgeStore.ts`, `src/contexts/`
- Contains: Zustand store with canvas layers, selection, undo/redo history, canvas metadata
- Depends on: Canvas service
- Used by: Hooks and components

**Custom Hooks Layer:**
- Purpose: Reusable stateful logic and orchestration of services
- Location: `src/hooks/`
- Contains: `useLayerManagement`, `useImageGeneration`, `useVersionHistory`, `useArtistMatching`, `useCanvasAspectRatio`, `useVibeChipSuggestions`, `useVersionHistory`, `useSmartPreview`, `useTransformOperations`, `useTransformShortcuts`, `useRealtimeMatchPulse`, `useStorageWarning`, `useToast`
- Depends on: Services, stores, constants
- Used by: Components and pages

**Service Layer:**
- Purpose: Business logic, API communication, and data processing
- Location: `src/services/`
- Contains: Specialized services for image generation, layer management, matching, version control, canvas operations, prompt enhancement, embeddings, storage
- Depends on: Config, utilities, external APIs
- Used by: Hooks, components, other services

**API Routes Layer:**
- Purpose: Next.js server-side API endpoints
- Location: `src/app/api/`
- Contains: RESTful endpoints for generation, matching, embeddings, stencil export, storage
- Depends on: Services, authentication, external APIs
- Used by: Frontend via fetch, external clients

**Configuration & Constants:**
- Purpose: Static configuration, prompt templates, body part definitions, model routing rules
- Location: `src/config/`, `src/constants/`
- Contains: Character database, prompt templates, model routing rules, body part aspect ratios, feature flags
- Depends on: (none)
- Used by: Services, components, pages

**Utilities:**
- Purpose: Pure functions for calculations, transformations, and helpers
- Location: `src/utils/`
- Contains: Score aggregation, style model mapping, anatomical mapping, PDF generation, stencil calibration, performance monitoring
- Depends on: (none - pure functions)
- Used by: Services, components

## Data Flow

**Image Generation Flow:**

1. User inputs prompt/style → `Generate.jsx` page
2. Optional prompt enhancement → `councilService.ts` (OpenRouter/Gemini)
3. Service selection → `generationRouter.ts` (routes to Replicate or Vertex AI)
4. Generation request → `replicateService.ts` or `vertex-ai-service.js`
5. Poll prediction status → 2s intervals, 60 max attempts
6. Receive image URLs → `useImageGeneration` hook
7. Add as layers → `useLayerManagement` + `useForgeStore` (Zustand)
8. Render in canvas → `ForgeCanvas.tsx` component
9. Version auto-save → `versionService.ts` (localStorage)
10. Export options → `canvasService.ts` (PNG or AR asset)

**Artist Matching Flow:**

1. User search query + preferences → `SmartMatch.jsx` page
2. Parallel execution:
   - Graph query → `neo4jService.ts` (Cypher via API)
   - Vector search → `vectorDbService.ts` (pgvector via Supabase)
3. Score aggregation → `scoreAggregation.js` (RRF - Reciprocal Rank Fusion)
4. Merged results → `hybridMatchService.ts`
5. Display matches → `ArtistCard` components

**Version Control Flow:**

1. Design changes → Layer modifications in store
2. Auto-save trigger → `useVersionHistory` hook
3. Version creation → `versionService.ts` (localStorage)
4. Storage key: `tattester_version_history_${sessionId}`
5. Load/branch → Restore layers from historical version
6. Merge → Combine layers from two versions with ID collision prevention
7. Cleanup → 90-day auto-purge of inactive histories

**Layer Management Flow:**

1. User action (add/edit/delete) → Component event
2. Hook call → `useLayerManagement` (facade)
3. Zustand action → `useForgeStore` (state update)
4. Canvas service → `canvasService.ts` (immutable operations)
5. Store update → Trigger z-index recalculation
6. Component re-render → Display updated layers in LayerStack
7. History record → Optional history entry

**State Management:**

- **Canvas State:** Zustand store (`useForgeStore`) maintains layers, selection, history
- **Version State:** React hooks (`useVersionHistory`) with localStorage persistence
- **Aspect Ratio:** React context/hooks (`useCanvasAspectRatio`) for body part dimensions
- **Session Management:** Unique session IDs stored in sessionStorage per tab
- **Generation State:** React local state in hooks (`useImageGeneration`) for polling, progress

## Key Abstractions

**Layer Abstraction:**
- Purpose: Represents a compositable image element with transforms, blend modes, visibility
- Files: `src/services/canvasService.ts`, `src/stores/useForgeStore.ts`, `src/hooks/useLayerManagement.ts`
- Pattern: Immutable data structure, pure functions for transformations
- Properties: id, name, type (subject/background/effect), imageUrl, transform, blendMode, visible, zIndex

**Hybrid Match Abstraction:**
- Purpose: Unified artist discovery combining graph relationships and vector similarity
- Files: `src/services/hybridMatchService.ts`, `src/services/neo4jService.ts`, `src/services/vectorDbService.ts`
- Pattern: Service orchestration with parallel execution and score merging
- Scoring: Reciprocal Rank Fusion (RRF) with weighted components

**Prompt Enhancement Abstraction:**
- Purpose: Multi-level prompt improvement with LLM council and model selection
- Files: `src/services/councilService.ts`, `src/config/promptTemplates.js`
- Pattern: Fallback chain (Gemini → OpenRouter → Single agent)
- Levels: Simple, Detailed, Ultra (with estimated time/cost per level)

**Canvas Rendering Abstraction:**
- Purpose: Compositable canvas with layer blending, transforms, and export
- Files: `src/services/canvasService.ts`, `src/components/generate/ForgeCanvas.tsx`
- Pattern: Konva.js for rendering, React hooks for state management
- Features: Real-time preview, multi-format export (PNG, AR asset, stencil)

**Body Part Configuration:**
- Purpose: Anatomically-accurate aspect ratios and silhouettes for tattoo placement
- Files: `src/constants/bodyPartAspectRatios.ts`
- Pattern: Type-safe configuration object with metadata
- Types: forearm, chest, back, thigh, shoulder, full-sleeve, ribs, calf

## Entry Points

**Frontend Entry Point:**
- Location: `src/main.jsx`
- Triggers: Browser navigation
- Responsibilities: Render React app, mount to DOM element

**Root Component:**
- Location: `src/App.jsx`
- Triggers: Application initialization
- Responsibilities: Router setup, provider wrapping (ToastProvider), navigation UI

**Page Entry Points:**
- Location: `src/pages/[PageName].jsx`
- Examples: `Generate.jsx`, `Visualize.jsx`, `SmartMatch.jsx`
- Triggers: Route navigation
- Responsibilities: Compose features, orchestrate hooks, manage page-level state

**API Entry Points:**
- Location: `src/app/api/v1/[endpoint]/route.ts`
- Examples: `/api/v1/generate`, `/api/v1/match/semantic`, `/api/v1/council/enhance`
- Triggers: HTTP POST/GET requests
- Responsibilities: Authentication, input validation, service orchestration, response formatting

## Error Handling

**Strategy:** Try-catch blocks with user-friendly messages and logging

**Patterns:**

1. **Service Errors:**
   ```typescript
   // replicateService.ts
   try {
     const result = await generateHighResDesign(input);
   } catch (error) {
     if (isErrorCode(error)) {
       const userMessage = getUserErrorMessage(error.code);
       showToast(userMessage);
     }
   }
   ```

2. **API Errors:**
   ```typescript
   // API route
   try {
     const result = await someService();
     return NextResponse.json({ success: true, data: result });
   } catch (error) {
     console.error('[Service] Failed:', error);
     return NextResponse.json(
       { error: 'Operation failed', message: error.message },
       { status: 500 }
     );
   }
   ```

3. **Component Errors:**
   - Boundary component: `src/components/ErrorBoundary.jsx`
   - Fallback UI for caught errors
   - Error logging to console

4. **Validation Errors:**
   ```typescript
   // validateInput() in promptTemplates.js
   if (!input.subject || input.subject.length < 2) {
     return { isValid: false, errors: ['Subject required'] };
   }
   ```

## Cross-Cutting Concerns

**Logging:**
- Approach: Console.log with prefixed context strings (e.g., `[Service] message`)
- Used in: Services, API routes, utilities
- Examples: `[VersionService]`, `[Embeddings]`, `[CouncilService]`

**Validation:**
- Approach: Input validation at API boundaries and service entry points
- Functions: `validateInput()` in promptTemplates, `verifyApiAuth()` in lib/api-auth
- Scope: User input, API parameters, file uploads

**Authentication:**
- Approach: Bearer token verification on API routes
- Function: `verifyApiAuth()` in `src/lib/api-auth.ts`
- Check: Verifies `Authorization: Bearer {token}` header
- Applied to: All `/api/v1/*` endpoints

**Rate Limiting:**
- Approach: Client-side tracking for budget constraints, server-side enforcement possible
- Client-side: `localStorage` for request count tracking
- Budget: Replicate API with 10 requests/minute limit
- Tracking: Per-session or per-user basis (configurable)

**Storage:**
- Approach: Multi-tier storage strategy
- localStorage: Version history, layer state, canvas metadata (5-10MB limit)
- sessionStorage: Session ID, temporary state (cleared on tab close)
- Cloud: Supabase for user-generated content, GCS for assets
- File paths: Environment-configured endpoints

**Performance:**
- Approach: Memoization, lazy loading, debouncing
- Patterns: `useMemo()` in hooks, `React.lazy()` for components, `useCallback()` for functions
- Monitoring: `src/utils/performanceMonitor.js` for tracking generation times

---

*Architecture analysis: 2026-02-15*
