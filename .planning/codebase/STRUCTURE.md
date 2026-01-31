# Codebase Structure

**Analysis Date:** 2026-01-31

## Directory Layout

```
manama-next/
├── src/
│   ├── app/                          # Next.js 16 App Router directory
│   │   ├── api/                      # API routes (v1 endpoints, health, etc.)
│   │   ├── layout.tsx                # Root layout with metadata
│   │   ├── page.tsx                  # Home page / hero
│   │   ├── generate/                 # Design generation page
│   │   ├── uploads/                  # Dynamic route for uploaded assets
│   │   ├── globals.css               # Global Tailwind styles
│   │   └── favicon.ico
│   │
│   ├── components/                   # React components (JSX/TSX)
│   │   ├── ui/                       # Reusable UI primitives (Button, Card, Toast)
│   │   ├── shared/                   # Shared components (Motion, etc.)
│   │   ├── generate/                 # Generation page components (PromptInterface, ForgeCanvas, etc.)
│   │   ├── Match/                    # Artist matching components (MatchPulse, ArtistCard, etc.)
│   │   ├── Forge/                    # Legacy canvas components
│   │   ├── generator/                # Generator utilities (partial/backup)
│   │   └── [individual components]   # Page-level components (DesignLibrary.jsx, etc.)
│   │
│   ├── features/                     # Feature page containers (JSX only)
│   │   ├── Generate.jsx              # Main generation interface (78KB)
│   │   ├── Visualize.jsx             # AR visualization feature
│   │   ├── SmartMatch.jsx            # Advanced matching UI
│   │   ├── SwipeMatch.jsx            # Card-based matching
│   │   ├── Artists.jsx               # Artist browse/discovery
│   │   ├── ArtistProfile.jsx         # Individual artist detail
│   │   ├── Journey.jsx               # Onboarding/journey page
│   │   └── Philosophy.jsx            # Brand philosophy page
│   │
│   ├── services/                     # Business logic and integrations
│   │   ├── __tests__/                # Service test files
│   │   ├── ar/                       # AR-specific services (6 files)
│   │   ├── canvasService.ts          # Layer management and rendering
│   │   ├── hybridMatchService.ts     # Vector + graph artist matching
│   │   ├── neo4jService.ts           # Graph database queries
│   │   ├── vertex-ai-service.js      # Vertex AI Imagen integration
│   │   ├── vertex-ai-edge.ts         # Vertex AI edge runtime wrapper
│   │   ├── councilService.js         # Multi-model AI prompt enhancement
│   │   ├── gcs-service.ts            # Google Cloud Storage integration
│   │   ├── replicateService.js       # External model execution
│   │   ├── stencilService.js         # Stencil/tattoo line conversion
│   │   ├── multiLayerService.js      # Multi-layer image composition
│   │   ├── imageProcessingService.js # Image resize, crop, format
│   │   ├── versionService.js         # Design version history
│   │   ├── vectorDbService.js        # Vector similarity search
│   │   └── [19+ more services]       # Additional domain services
│   │
│   ├── stores/                       # Zustand state stores
│   │   └── useForgeStore.ts          # Canvas layers, selection, history state
│   │
│   ├── hooks/                        # React hooks (custom logic)
│   │   ├── useImageGeneration.js     # Image generation workflow
│   │   ├── useLayerManagement.ts     # Layer CRUD operations
│   │   ├── useArtistMatching.js      # Artist search and filtering
│   │   ├── useCanvasAspectRatio.ts   # Body part aspect ratio logic
│   │   ├── useTransformShortcuts.ts  # Keyboard shortcuts for transforms
│   │   ├── useVersionHistory.js      # Design history navigation
│   │   ├── useVibeChipSuggestions.js # Style chip suggestions
│   │   ├── useSmartPreview.js        # Preview generation
│   │   ├── useRealtimeMatchPulse.js  # Real-time artist match updates
│   │   └── [7+ more hooks]           # Additional feature hooks
│   │
│   ├── lib/                          # Utility libraries and helpers
│   │   ├── api-auth.ts               # Bearer token verification
│   │   ├── neo4j.ts                  # Neo4j client configuration
│   │   ├── vertex-imagen-client.js   # Vertex Imagen HTTP client
│   │   ├── segmentation-vertex.ts    # Image segmentation via Vertex
│   │   ├── google-auth-edge.ts       # Google auth for edge runtime
│   │   ├── rate-limit.ts             # Rate limiter configuration
│   │   ├── motion-variants.ts        # Framer Motion animation presets
│   │   └── layerUtils.js             # Layer ID generation, utilities
│   │
│   ├── utils/                        # Pure utility functions
│   │   ├── scoreAggregation.js       # Match score calculation
│   │   ├── styleModelMapping.js      # Style → model routing
│   │   ├── matching.js               # Legacy matching algorithms
│   │   ├── anatomicalMapping.js      # Body part → style mapping
│   │   ├── performanceMonitor.js     # Performance tracking
│   │   ├── pdfGenerator.js           # PDF export utilities
│   │   └── stencilCalibration.js     # Stencil size/DPI calibration
│   │
│   ├── config/                       # Configuration and reference data
│   │   ├── promptTemplates.js        # Style-based prompt templates
│   │   ├── modelRoutingRules.js      # Model selection logic
│   │   ├── characterDatabase.js      # 100KB+ character/style database
│   │   ├── vectorDbConfig.js         # Vector DB connection settings
│   │   └── councilSkillPack.js       # AI model skill definitions
│   │
│   ├── constants/                    # Static constants
│   │   └── bodyPartAspectRatios.ts   # Canvas dimensions per body part
│   │
│   ├── data/                         # Static data files
│   │   └── [reference data]
│   │
│   ├── db/                           # Database configuration
│   │   └── migrations/               # (Empty - migration directory)
│   │
│   ├── pages/                        # Legacy pages directory (co-exists with app/)
│   │   └── [legacy route files]
│   │
│   ├── test/                         # Test utilities and fixtures
│   │   └── services/                 # Service test helpers
│   │
│   ├── store/                        # Legacy store directory (unused)
│   │
│   ├── App.jsx                       # Legacy root component (unused in Next.js)
│   ├── main.jsx                      # Legacy entry point (unused in Next.js)
│   └── index.css                     # Legacy global styles (unused)
│
├── public/                           # Static assets served directly
│
├── .planning/
│   └── codebase/                     # Architecture documentation (this dir)
│
├── package.json                      # Dependencies: React 19, Next 16, Zustand, Vertex AI, etc.
├── tsconfig.json                     # TypeScript config with @ path alias
├── next.config.ts                    # Next.js configuration
├── tailwind.config.js                # Tailwind CSS v3
├── postcss.config.js                 # PostCSS with Tailwind
└── server.js                         # Express server for non-Next.js routes
```

## Directory Purposes

**src/app/:**
- Purpose: Next.js App Router directory; all files here become routes
- Contains: Page components (.tsx), API route handlers (api/**/route.ts), layout files
- Key convention: Folders without page.tsx are layout containers; page.tsx defines the route component
- Special: `api/` subdirectory contains server-side request handlers

**src/components/:**
- Purpose: Reusable and page-specific React components
- Organization: Grouped by feature (generate/, Match/, etc.) and type (ui/)
- Key convention: PascalCase filenames for components
- Special: `ui/` is for primitive, feature-agnostic components

**src/features/:**
- Purpose: Feature page containers; high-level page logic without React 19 client boundaries
- Contains: JSX files (not TSX), large (~20KB+) components integrating multiple subcomponents
- Key convention: Each file is a self-contained feature page
- Special: Dynamically imported in page.tsx files with `dynamic()` to avoid SSR

**src/services/:**
- Purpose: Business logic isolation; no React dependencies
- Organization: By domain (ar/, generic services in root, tests in __tests__/)
- Key convention: Services export pure or idempotent functions; imports use relative or @ paths
- Special: Mixed JS/TS; critical services converted to TS (neo4jService, hybridMatchService, canvasService, gcs-service)

**src/stores/:**
- Purpose: Zustand state stores
- Contains: Single file `useForgeStore.ts` (for now)
- Key convention: Store name starts with `use` to follow hook naming
- Special: Conditional Zustand persist middleware wrapping based on `typeof window`

**src/hooks/:**
- Purpose: Custom React hooks for feature logic
- Key convention: Filename starts with `use`, e.g., `useImageGeneration.js`
- Dependency: Hooks call services and use React hooks (useState, useEffect, useCallback)
- Usage: Imported by components and features

**src/lib/:**
- Purpose: Low-level utilities, clients, middleware, and helpers
- Key convention: Exported functions/classes for use by services and routes
- Examples: Auth middleware, external API clients, configuration helpers

**src/utils/:**
- Purpose: Pure utility functions and calculations
- Key convention: Stateless, no side effects, referential transparent
- Usage: Called by services, hooks, components

**src/config/:**
- Purpose: Application configuration and reference data
- Key convention: Exported as constants or default exports
- Size: characterDatabase.js is 100KB+; others are modest
- Usage: Imported by services, components, routes

**src/constants/:**
- Purpose: Static constant values (enums, mappings, defaults)
- Key convention: UPPER_CASE or PascalCase exports
- Usage: Imported where needed

**src/pages/:**
- Purpose: Legacy pages directory from old project structure
- Status: Coexists with src/app/ but not used by Next.js 16 routing
- Migration: New routes should use src/app/

**public/:**
- Purpose: Static assets (images, fonts, icons)
- Served: At root path, e.g., /images/trending/... → public/images/trending/...

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout with font config, metadata
- `src/app/page.tsx`: Home page (hero with feature cards)
- `src/app/generate/page.tsx`: Generation page (lazy-loads Generate.jsx)

**Configuration:**
- `tsconfig.json`: TypeScript + path alias `@/*` → `./src/*`
- `next.config.ts`: Next.js build config
- `tailwind.config.js`: Tailwind CSS v3 customization (ducks-green, ducks-yellow colors)
- `package.json`: Next 16.1.2, React 19.2.3, Zustand 5.0.10, etc.

**Core Logic:**
- `src/stores/useForgeStore.ts`: Zustand store for canvas layer state and history
- `src/services/hybridMatchService.ts`: Semantic artist matching (vector + graph)
- `src/services/neo4jService.ts`: Graph queries for artist relationships
- `src/services/vertex-ai-service.js`: Vertex Imagen 3.0 generation
- `src/services/councilService.js`: Multi-model prompt enhancement via OpenRouter

**API Routes:**
- `src/app/api/v1/generate/route.ts`: POST endpoint for image generation (edge runtime)
- `src/app/api/v1/match/semantic/route.ts`: POST endpoint for semantic artist matching (edge runtime)
- `src/app/api/v1/storage/upload/route.ts`: Multipart file upload to GCS (nodejs runtime)
- `src/app/api/v1/ar/visualize/route.ts`: AR visualization generation (nodejs runtime)
- `src/app/api/health/route.ts`: Health check endpoint

**Authentication & Auth:**
- `src/lib/api-auth.ts`: Bearer token verification for all `/api/v1/*` routes
- `src/lib/google-auth-edge.ts`: Google authentication for edge runtime

**Testing:**
- `src/services/__tests__/`: Service unit test files (.test.js)
- `src/test/services/`: Test helper utilities and fixtures

## Naming Conventions

**Files:**
- React components: PascalCase (e.g., `PromptInterface.jsx`, `ForgeCanvas.tsx`)
- Services: camelCase + domain suffix (e.g., `councilService.js`, `matchService.js`)
- Hooks: camelCase with `use` prefix (e.g., `useImageGeneration.js`)
- Utilities: camelCase (e.g., `scoreAggregation.js`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_BODY_PART`)
- Types/Interfaces: PascalCase (e.g., `Layer`, `MatchResult`)

**Directories:**
- Feature pages: `features/[FeatureName].jsx`
- Component groups: `components/[Feature]/` or `components/[Type]/`
- Route structure: `src/app/api/v1/[domain]/[action]/route.ts`
- Test co-location: `__tests__/` directories in service folders

**Exports:**
- Named exports: Services export multiple functions/types
- Default exports: Page components (in src/app/), feature containers (in src/features/)
- Re-exports: `src/components/` re-exports from subcomponents

## Where to Add New Code

**New Feature Page:**
- Create: `src/features/NewFeature.jsx` (container with all page logic)
- Create: `src/app/new-feature/page.tsx` (thin wrapper with dynamic import)
- Create: `src/components/[NewFeature]/` directory for subcomponents
- Add route: Reference in `src/app/[new-feature]/page.tsx`

**New Component:**
- Reusable UI: `src/components/ui/ComponentName.jsx`
- Feature-specific: `src/components/[FeatureName]/ComponentName.jsx`
- Page-level: `src/components/ComponentName.jsx`
- Naming: PascalCase filename matching component name

**New Service:**
- Location: `src/services/[domainName]Service.{js,ts}`
- Pattern: Export pure functions or class methods
- Imports: Use relative paths for utilities, `@/` for config/constants
- Error handling: Throw Error with `.code` property for specific errors
- Logging: Use console.log/error with contextual prefix

**New Utility:**
- Location: `src/utils/[utilityName].js`
- Pattern: Pure functions, no state, no React dependencies
- Usage: Imported by services, hooks, components

**New API Route:**
- Location: `src/app/api/v1/[domain]/[action]/route.ts`
- Pattern: Verify auth first, call service, return NextResponse
- Runtime: Choose `'edge'` for lightweight operations, `'nodejs'` for heavy compute
- Error response: `{ error, code, details? }` with appropriate HTTP status

**New Hook:**
- Location: `src/hooks/use[FeatureName].{js,ts}`
- Pattern: useState/useCallback for local state, service calls in useEffect
- Usage: Import in components or features
- Naming: Always start with `use`

**New Store Slice (Zustand):**
- Location: Extend `src/stores/useForgeStore.ts` or create new file
- Pattern: Add action methods to state interface, implement in baseStore
- Persistence: Wrap with persist middleware if sessionStorage/localStorage needed

## Special Directories

**src/api/:**
- Purpose: Legacy Express.js routes (pre-Next.js migration)
- Generated: No (manual files)
- Committed: Yes (but not active in Next.js 16 routing)
- Status: Superseded by src/app/api/

**src/store/:**
- Purpose: Legacy Redux/context store (pre-Zustand migration)
- Generated: No
- Committed: Yes
- Status: Unused; canvas state now in Zustand at src/stores/

**public/:**
- Purpose: Static assets
- Generated: No (manual organization)
- Committed: Yes
- Access: Direct root path (e.g., /images/trending/...)

**.next/:**
- Purpose: Next.js build output
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignore)
- Contains: Compiled routes, sourcemaps, prerendered pages

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (by npm install)
- Committed: No (.gitignore)

---

*Structure analysis: 2026-01-31*
