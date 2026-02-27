# Codebase Structure

**Analysis Date:** 2026-02-15

## Directory Layout

```
project-root/
├── src/                          # All source code
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes
│   │   │   ├── v1/               # Versioned API endpoints (preferred)
│   │   │   │   ├── embeddings/generate/
│   │   │   │   ├── layers/decompose/
│   │   │   │   ├── council/enhance/
│   │   │   │   ├── stencil/export/
│   │   │   │   ├── match/semantic/
│   │   │   │   ├── match/update/
│   │   │   │   ├── storage/get-signed-url/
│   │   │   │   ├── storage/upload/
│   │   │   │   ├── upload-layer/
│   │   │   │   ├── ar/visualize/
│   │   │   │   └── generate/
│   │   │   ├── neo4j/query/       # Graph DB access
│   │   │   ├── health/            # Health check (public)
│   │   │   ├── generate/          # Legacy endpoint
│   │   │   ├── predictions/        # Legacy endpoint
│   │   │   └── predictions/[id]/  # Legacy endpoint
│   │   ├── dashboard/            # Dashboard routes
│   │   ├── demo/                 # Demo mode
│   │   ├── generate/             # Generate page
│   │   ├── swipe/                # Swipe matching
│   │   ├── visualize/            # AR visualization
│   │   ├── journey/              # User journey
│   │   ├── smart-match/          # Semantic matching
│   │   ├── philosophy/           # Philosophy page
│   │   ├── uploads/layers/       # Layer uploads
│   │   └── layout.tsx            # Root layout
│   ├── components/               # React components
│   │   ├── generate/             # Generate feature components
│   │   │   ├── BodyPartSelector/
│   │   │   ├── ForgeCanvas.tsx
│   │   │   ├── LayerStack.tsx
│   │   │   ├── LayerItem.tsx
│   │   │   ├── BlendModeSelector.jsx
│   │   │   ├── AdvancedOptions.jsx
│   │   │   ├── TransformControls.tsx
│   │   │   ├── VersionTimeline.jsx
│   │   │   ├── VersionComparison.jsx
│   │   │   ├── LayerContextMenu.jsx
│   │   │   ├── RegenerateElementModal.jsx
│   │   │   ├── NeuralPromptEditor.tsx
│   │   │   ├── VibeChips.jsx
│   │   │   ├── MatchPulseSidebar.jsx
│   │   │   ├── CleanupTool.jsx
│   │   │   ├── PlacementGrid.tsx
│   │   │   └── ForgeGuide.jsx
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Toast.jsx
│   │   │   └── [other-ui]/
│   │   ├── layouts/              # Layout wrappers
│   │   │   ├── HolyGrailLayout.jsx
│   │   │   └── CollapsibleSidebar.jsx
│   │   ├── Match/                # Artist matching components
│   │   ├── Forge/                # Canvas forge components
│   │   ├── shared/               # Shared feature components
│   │   ├── Home.jsx              # Home page
│   │   ├── DesignGenerator.jsx   # Generation interface
│   │   ├── DesignGeneratorWithCouncil.jsx  # Council variant
│   │   ├── DesignLibrary.jsx     # Design library
│   │   ├── StencilExport.jsx     # Stencil export UI
│   │   ├── InpaintingEditor.jsx  # Inpainting tool
│   │   ├── PromptEnhancer.jsx    # Prompt enhancement UI
│   │   ├── KeyboardShortcutsModal.jsx
│   │   └── ErrorBoundary.jsx
│   ├── services/                 # Business logic & API clients
│   │   ├── replicateService.ts   # Image generation (Replicate)
│   │   ├── vertex-ai-service.js  # Image generation (Vertex AI)
│   │   ├── vertex-ai-edge.ts     # Edge-optimized Vertex AI
│   │   ├── canvasService.ts      # Layer operations & rendering
│   │   ├── versionService.ts     # Design version history
│   │   ├── neo4jService.ts       # Graph database queries
│   │   ├── vectorDbService.ts    # Vector similarity search
│   │   ├── hybridMatchService.ts # Combined vector+graph matching
│   │   ├── matchService.ts       # Artist matching orchestration
│   │   ├── councilService.ts     # LLM council for prompt enhancement
│   │   ├── openRouterCouncil.js  # OpenRouter implementation
│   │   ├── vertexAICouncil.js    # Vertex AI implementation
│   │   ├── multiLayerService.ts  # Multi-layer generation
│   │   ├── layerDecompositionService.js # Layer decomposition
│   │   ├── stencilService.ts     # Stencil generation & export
│   │   ├── stencilEdgeService.js # Edge optimization for stencils
│   │   ├── pngDpiService.js      # DPI metadata for PNGs
│   │   ├── imageProcessingService.js # Image optimization
│   │   ├── inpaintingService.ts  # Inpainting/touch-up
│   │   ├── storageService.ts     # Cloud storage (GCS/Supabase)
│   │   ├── designLibraryService.ts # Design library management
│   │   ├── gcs-service.js        # Google Cloud Storage
│   │   ├── firebase-match-service.ts # Firebase integration
│   │   ├── generationRouter.ts   # Routes to Replicate or Vertex AI
│   │   ├── demoMatchService.js   # Demo mode matching
│   │   ├── matchUpdateService.js # Match caching
│   │   ├── matchPulseIntegration.js # Real-time match updates
│   │   ├── emailQueueService.js  # Email queue management
│   │   ├── fetchWithAbort.ts     # HTTP client with abort handling
│   │   └── __tests__/            # Service tests
│   ├── hooks/                    # Custom React hooks
│   │   ├── useLayerManagement.ts  # Layer CRUD facade
│   │   ├── useImageGeneration.ts  # Image generation orchestration
│   │   ├── useVersionHistory.ts   # Version control hook
│   │   ├── useArtistMatching.ts   # Artist search
│   │   ├── useCanvasAspectRatio.ts # Body part dimensions
│   │   ├── useVibeChipSuggestions.ts # Vibe suggestions
│   │   ├── useSmartPreview.ts     # Preview generation
│   │   ├── useTransformOperations.ts # Layer transforms
│   │   ├── useTransformShortcuts.ts  # Keyboard shortcuts
│   │   ├── useRealtimeMatchPulse.ts  # Live match updates
│   │   ├── useStorageWarning.ts   # Storage quota warnings
│   │   └── useToast.ts           # Toast notifications
│   ├── stores/                   # State management (Zustand)
│   │   └── useForgeStore.ts      # Canvas layer state
│   ├── contexts/                 # React contexts
│   │   └── ToastContext.jsx      # Toast notifications
│   ├── pages/                    # Legacy page components (Next.js Pages Router)
│   │   ├── Generate.jsx          # Main generation page
│   │   ├── Visualize.jsx         # AR visualization
│   │   ├── SmartMatch.tsx        # Semantic matching
│   │   ├── SwipeMatch.tsx        # Swipe-based matching
│   │   ├── Artists.jsx           # Artist directory
│   │   ├── ArtistProfile.jsx     # Single artist view
│   │   ├── Journey.jsx           # User journey
│   │   ├── Philosophy.jsx        # About/philosophy
│   │   └── _app.tsx             # App wrapper
│   ├── config/                   # Configuration & constants
│   │   ├── promptTemplates.js    # Prompt building & validation
│   │   ├── characterDatabase.js  # Character/style definitions
│   │   ├── councilSkillPack.js   # Council capabilities
│   │   ├── modelRoutingRules.js  # Model selection logic
│   │   └── vectorDbConfig.js     # Vector DB configuration
│   ├── constants/                # Immutable constants
│   │   ├── bodyPartAspectRatios.ts # Tattoo placement configs
│   │   ├── featureFlags.ts       # Feature toggles
│   │   └── [other-constants]/
│   ├── lib/                      # Utility libraries
│   │   ├── api-auth.ts          # API authentication
│   │   ├── layerUtils.js        # Layer ID generation
│   │   ├── neo4j.ts             # Neo4j configuration
│   │   ├── motion-variants.ts   # Framer Motion presets
│   │   ├── rate-limit.ts        # Rate limiting logic
│   │   ├── google-auth-edge.ts  # Google auth edge function
│   │   ├── segmentation.ts      # Image segmentation
│   │   ├── segmentation-vertex.ts # Vertex segmentation
│   │   ├── vertex-imagen-client.ts # Vertex Imagen client
│   │   └── vertex-imagen-client.js
│   ├── utils/                    # Pure utility functions
│   │   ├── styleModelMapping.js  # Map styles to models
│   │   ├── scoreAggregation.js   # RRF & scoring
│   │   ├── matching.js          # Matching algorithms
│   │   ├── anatomicalMapping.js  # Body part mappings
│   │   ├── stencilCalibration.js # Stencil sizing
│   │   ├── pdfGenerator.js       # PDF creation
│   │   └── performanceMonitor.js # Performance tracking
│   ├── assets/                   # Static assets (images, fonts)
│   ├── data/                     # Static data files
│   ├── db/                       # Database clients
│   ├── styles/                   # Global styles
│   │   ├── globals.css
│   │   ├── studio-utilities.css
│   │   └── placement-grid.css
│   ├── test/                     # Test utilities & setup
│   ├── index.css                 # Root styles
│   ├── main.jsx                  # Entry point
│   └── App.jsx                   # Root component with router
├── public/                       # Static files served directly
├── .env                          # Environment variables (git-ignored)
├── .env.local                    # Local overrides (git-ignored)
├── .env.example                  # Template for environment variables
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
├── next.config.ts                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── vitest.config.js              # Test runner configuration
└── vite.config.js                # Build configuration
```

## Directory Purposes

**src/app/**
- Purpose: Next.js App Router pages and API routes
- Contains: Server components, API endpoints, route groups
- Key files: `page.tsx` files for routes, `route.ts` for API endpoints

**src/components/**
- Purpose: All React UI components
- Contains: Feature-specific components, reusable UI components, layout wrappers
- Key files: `ForgeCanvas.tsx` (canvas rendering), `LayerStack.tsx` (layer list), `AdvancedOptions.jsx` (settings)

**src/services/**
- Purpose: Business logic, API clients, external service integration
- Contains: Stateless functions for core functionality
- Key files: `replicateService.ts` (image generation), `neo4jService.ts` (graph DB), `canvasService.ts` (layer operations)

**src/hooks/**
- Purpose: Reusable React hooks for stateful logic
- Contains: Custom hooks that use services and manage component state
- Key files: `useLayerManagement.ts` (layer facade), `useVersionHistory.ts` (design versions), `useImageGeneration.ts` (generation orchestration)

**src/stores/**
- Purpose: Global state management with Zustand
- Contains: Centralized store definitions
- Key files: `useForgeStore.ts` (canvas layers, selection, history)

**src/config/**
- Purpose: Application configuration and data definitions
- Contains: Prompt templates, character database, model routing, configuration objects
- Key files: `promptTemplates.js` (prompt building), `modelRoutingRules.js` (model selection), `characterDatabase.js` (style definitions)

**src/constants/**
- Purpose: Immutable application constants
- Contains: Type definitions, configuration objects, feature flags
- Key files: `bodyPartAspectRatios.ts` (tattoo placement configs), `featureFlags.ts` (feature toggles)

**src/lib/**
- Purpose: Utility libraries and helper functions
- Contains: Authentication, configuration clients, rate limiting, platform-specific code
- Key files: `api-auth.ts` (API authentication), `layerUtils.js` (layer ID generation), `neo4j.ts` (database config)

**src/utils/**
- Purpose: Pure utility functions with no side effects
- Contains: Algorithms, calculations, transformations
- Key files: `scoreAggregation.js` (RRF scoring), `styleModelMapping.js` (style→model routing), `matching.js` (match algorithms)

**src/api/**
- Purpose: Legacy API routes (being deprecated)
- Contains: Older endpoints
- Note: Use `/api/v1/*` for new endpoints

**src/pages/**
- Purpose: Page components using Next.js Pages Router (legacy)
- Contains: Top-level route pages
- Note: Gradual migration to App Router in `src/app/`

## Key File Locations

**Entry Points:**
- `src/main.jsx`: React app initialization
- `src/App.jsx`: Root component with router setup
- `src/app/page.tsx` or `src/pages/index.tsx`: Home page

**Configuration:**
- `src/config/promptTemplates.js`: Prompt building logic
- `src/config/characterDatabase.js`: Character/style definitions (107KB database)
- `src/constants/bodyPartAspectRatios.ts`: Tattoo placement configs
- `src/constants/featureFlags.ts`: Feature toggles (council, studio layout, etc.)

**Core Logic:**
- `src/services/replicateService.ts`: Image generation (primary)
- `src/services/canvasService.ts`: Layer compositing
- `src/services/versionService.ts`: Version history with localStorage
- `src/services/hybridMatchService.ts`: Artist matching (vector+graph)
- `src/services/councilService.ts`: LLM-based prompt enhancement
- `src/services/neo4jService.ts`: Graph database queries
- `src/services/vectorDbService.ts`: Vector similarity search

**State Management:**
- `src/stores/useForgeStore.ts`: Zustand store (layers, selection, history)
- `src/hooks/useLayerManagement.ts`: Layer operations hook
- `src/hooks/useVersionHistory.ts`: Version control hook
- `src/contexts/ToastContext.jsx`: Toast notifications

**Testing:**
- `src/services/versionService.test.js`: Version history tests
- `src/services/councilService.test.js`: Council enhancement tests
- `src/services/multiLayerService.test.js`: Multi-layer tests
- `src/test/services/replicateService.test.js`: Generation tests

## Naming Conventions

**Files:**
- Services: `[name]Service.ts` or `[name]Service.js` (e.g., `canvasService.ts`)
- Hooks: `use[Name].ts` (e.g., `useLayerManagement.ts`)
- Components: PascalCase (e.g., `ForgeCanvas.tsx`, `LayerItem.tsx`)
- Utilities: camelCase functions in utility files
- Tests: `[target].test.js` or `[target].spec.js` co-located with source
- API routes: `route.ts` in directory matching endpoint path (e.g., `src/app/api/v1/generate/route.ts`)

**Directories:**
- Feature directories: kebab-case or camelCase (e.g., `src/components/generate/`)
- API directory structure mirrors endpoint path (e.g., `/api/v1/match/semantic/`)

**Variables & Functions:**
- Variables: camelCase (e.g., `selectedLayerId`, `layerStack`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_VERSIONS_PER_DESIGN`, `STORAGE_KEY_PREFIX`)
- Types: PascalCase (e.g., `Layer`, `GenerationResult`, `MatchedArtist`)
- React components: PascalCase (e.g., `LayerStack`, `ForgeCanvas`)

## Where to Add New Code

**New Feature:**
- Primary code: `src/services/[featureName]Service.ts` (business logic)
- Hook: `src/hooks/use[FeatureName].ts` (state + service orchestration)
- Component: `src/components/[feature]/[Component].tsx` (UI)
- Tests: `src/services/[featureName]Service.test.js`
- Config: `src/config/[featureName]Config.js` (if needed)

**New Component/Module:**
- Implementation: `src/components/[category]/[ComponentName].tsx`
- Usage: Import in page or parent component
- Styles: Tailwind classes inline or separate `.css` file in `src/styles/`

**New Service:**
- Implementation: `src/services/[serviceName]Service.ts`
- Export: Named exports for pure functions
- Tests: Co-located `[serviceName].test.js`
- Used by: Hooks that consume service functions

**New Hook:**
- Implementation: `src/hooks/use[HookName].ts`
- Pattern: Combines service calls with React state
- Export: Named export of function `export function use[Name]() { ... }`
- Used by: Components that need the state/logic

**Utilities:**
- Location: `src/utils/[utilityName].js`
- Pattern: Pure functions with no side effects
- Export: Named exports (e.g., `export function calculateScore() { ... }`)

**API Endpoint:**
- Location: `src/app/api/v1/[feature]/[action]/route.ts`
- Pattern: POST endpoint with `verifyApiAuth()` check
- Exports: Async handlers (`POST`, `GET`, etc.)
- Pattern: Extract body → validate → call service → return NextResponse

## Special Directories

**src/components/generate/**
- Purpose: Components specific to the Generate page
- Generated: No
- Committed: Yes
- Key files: Canvas, layer stack, controls, modals

**src/app/api/v1/**
- Purpose: Versioned API endpoints (preferred for new endpoints)
- Generated: No
- Committed: Yes
- Pattern: Each endpoint in own route.ts file under semantic path

**src/config/**
- Purpose: Configuration objects and databases
- Generated: characterDatabase.js is generated from data import
- Committed: Yes (includes generated database)
- Note: Large files like characterDatabase.js (107KB) are static config

**src/test/**
- Purpose: Test utilities and setup
- Generated: No
- Committed: Yes
- Contains: Test setup, mocks, factories

**node_modules/**
- Purpose: Installed dependencies
- Generated: Yes
- Committed: No
- Install with: `npm install`

**.next/**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No
- Created by: `npm run build`

---

*Structure analysis: 2026-02-15*
