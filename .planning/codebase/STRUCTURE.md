# Codebase Structure

**Analysis Date:** 2026-01-31

## Directory Layout

```
manama-next/
├── .planning/          # GSD planning and codebase documentation
├── src/                # Primary source code
│   ├── app/            # Next.js App Router (pages, layouts, API routes)
│   ├── features/       # Domain-specific feature modules
│   ├── components/     # Shared React components
│   ├── services/       # External API clients and business logic
│   ├── lib/            # Shared utilities and helpers
│   ├── utils/          # Additional utility functions
│   ├── stores/         # Zustand state management stores
│   ├── store/          # Additional stores (legacy location)
│   ├── hooks/          # Shared React hooks
│   ├── config/         # Configuration files and databases
│   ├── constants/      # Static constants
│   ├── data/           # Static data files
│   ├── db/             # Database migrations and schemas
│   ├── pages/          # Legacy React Router pages
│   ├── api/            # Legacy API routes (Express)
│   ├── test/           # Test utilities
│   ├── App.jsx         # Legacy SPA root component
│   ├── main.jsx        # Legacy SPA entry point
│   └── index.css       # Global styles
├── public/             # Static assets (images, fonts)
├── scripts/            # Build and utility scripts
├── docs/               # Documentation
├── tests/              # Test files
├── archive/            # Archived code
├── generated/          # Generated files
├── uploads/            # Upload directory
├── node_modules/       # Dependencies
├── .next/              # Next.js build output
├── next.config.ts      # Next.js configuration
├── tsconfig.json       # TypeScript configuration
├── tailwind.config.ts  # Tailwind CSS configuration
├── package.json        # Dependencies and scripts
├── server.js           # Legacy Express server
└── index.html          # Legacy SPA HTML entry
```

## Directory Purposes

**src/app/**
- Purpose: Next.js 16 App Router structure
- Contains: Pages (page.tsx), layouts (layout.tsx), API routes (route.ts)
- Key files: `layout.tsx` (root layout), `page.tsx` (home), `generate/page.tsx`, `api/v1/*/route.ts`

**src/app/api/**
- Purpose: Next.js API route handlers
- Contains: Versioned API routes under `v1/`, legacy routes at root level
- Key files: `v1/generate/route.ts`, `v1/match/semantic/route.ts`, `v1/storage/upload/route.ts`, `health/route.ts`

**src/features/**
- Purpose: Feature modules organized by domain
- Contains: `generate/`, `match-pulse/`, `inpainting/`, `stencil/` - each with components, hooks, services, index.ts
- Key files: `generate/services/canvasService.ts`, `match-pulse/services/hybridMatchService.ts`

**src/components/**
- Purpose: Shared and page-specific React components (legacy)
- Contains: `generate/` (generation UI), `generator/`, `shared/` (Motion wrapper), `ui/` (Button, etc.)
- Key files: `DesignGenerator.jsx`, `DesignLibrary.jsx`, `ErrorBoundary.jsx`

**src/services/**
- Purpose: External API integrations and business logic services
- Contains: TypeScript and JavaScript service modules
- Key files: `generationService.ts`, `councilService.ts`, `embeddingService.ts`, `gcs-service.ts`, `vertex-ai-service.js`

**src/lib/**
- Purpose: Shared library utilities for cross-cutting concerns
- Contains: Auth, API clients, utilities
- Key files: `api-auth.ts`, `google-auth-edge.ts`, `observability.ts`, `neo4j.ts`, `segmentation.ts`

**src/stores/ and src/store/**
- Purpose: Zustand state management stores
- Contains: Store hooks using Zustand with persistence
- Key files: `stores/useForgeStore.ts` (canvas layers), `store/useAuthStore.ts`, `store/useMatchStore.ts`

**src/hooks/**
- Purpose: Shared React hooks for component logic
- Contains: Custom hooks for common patterns
- Key files: `useCanvasAspectRatio.ts`, `useTransformOperations.ts`, `useTransformShortcuts.ts`

**src/config/**
- Purpose: Static configuration and data structures
- Contains: Large configuration objects and databases
- Key files: `characterDatabase.js` (250+ character descriptions), `promptTemplates.js`, `modelRoutingRules.js`, `councilSkillPack.js`

**src/constants/**
- Purpose: Typed constants and enums
- Contains: Body part configurations, aspect ratios
- Key files: `bodyPartAspectRatios.ts`

**src/pages/**
- Purpose: Legacy React Router page components
- Contains: Full-page components for SPA routing
- Key files: `Generate.jsx`, `SmartMatch.jsx`, `Visualize.jsx`, `Artists.jsx`

**src/utils/**
- Purpose: Utility functions for specific domains
- Contains: Helper functions for matching, PDF generation, style mapping
- Key files: `matching.js`, `styleModelMapping.js`, `anatomicalMapping.js`

**public/**
- Purpose: Static assets served directly
- Contains: Images, portfolio assets
- Key files: `images/`, `portfolio/`

**scripts/**
- Purpose: Build, deployment, and utility scripts
- Contains: Shell scripts and Node scripts for automation
- Key files: Various automation scripts

**docs/**
- Purpose: Project documentation
- Contains: Migration guides, API documentation, planning docs
- Key files: Various markdown documentation

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Next.js root layout with fonts and metadata
- `src/app/page.tsx`: Next.js home page (modern)
- `src/main.jsx`: Legacy SPA entry point (ReactDOM.createRoot)
- `src/App.jsx`: Legacy SPA router and navigation
- `server.js`: Legacy Express server (may be deprecated)

**Configuration:**
- `next.config.ts`: Next.js config with webpack overrides for server-only packages
- `tsconfig.json`: TypeScript config with path aliases (@/*)
- `tailwind.config.ts`: Tailwind CSS configuration
- `package.json`: Dependencies and scripts
- `.env.example`: Environment variable template

**Core Logic:**
- `src/services/generationService.ts`: Vertex AI Imagen generation with retry
- `src/services/councilService.ts`: LLM council prompt enhancement
- `src/features/generate/services/canvasService.ts`: Layer management and compositing
- `src/stores/useForgeStore.ts`: Canvas state management with Zustand
- `src/lib/google-auth-edge.ts`: GCP authentication for Edge runtime

**Testing:**
- `src/services/__tests__/`: Service unit tests
- `src/test/`: Test utilities
- `tests/`: Top-level test directory

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., `DesignGenerator.jsx`, `ForgeCanvas.tsx`)
- Services: camelCase (e.g., `generationService.ts`, `councilService.ts`)
- API routes: kebab-case directories, `route.ts` files (e.g., `api/v1/generate/route.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useForgeStore.ts`, `useLayerManagement.ts`)
- Config: camelCase (e.g., `characterDatabase.js`, `promptTemplates.js`)

**Directories:**
- Features: kebab-case (e.g., `match-pulse/`, `generate/`)
- Components: PascalCase or domain name (e.g., `generate/`, `ui/`)
- API: kebab-case with versioning (e.g., `v1/match/semantic/`)

## Where to Add New Code

**New Feature:**
- Primary code: `src/features/{feature-name}/`
  - Create subdirectories: `components/`, `hooks/`, `services/`
  - Export via `index.ts`
- Tests: `src/features/{feature-name}/__tests__/`

**New Next.js Page:**
- Implementation: `src/app/{route-name}/page.tsx`
- Layout (if needed): `src/app/{route-name}/layout.tsx`

**New API Endpoint:**
- Implementation: `src/app/api/v1/{domain}/{action}/route.ts`
- Use Edge runtime for GCP integrations
- Import auth from `@/lib/api-auth`

**New Component:**
- Shared UI: `src/components/ui/{ComponentName}.tsx`
- Feature-specific: `src/features/{feature}/components/{ComponentName}.tsx`
- Page-specific (legacy): `src/components/{page}/{ComponentName}.jsx`

**New Service:**
- Implementation: `src/services/{serviceName}.ts`
- Pattern: Export async functions, use typed interfaces
- Tests: `src/services/__tests__/{serviceName}.test.ts`

**Utilities:**
- Shared helpers: `src/lib/{utilityName}.ts` (for framework-level utilities)
- Domain helpers: `src/utils/{utilityName}.js` (for domain-specific logic)

**New Store:**
- Implementation: `src/stores/use{Domain}Store.ts`
- Pattern: Zustand with persist middleware, typed interfaces

**New Hook:**
- Implementation: `src/hooks/use{HookName}.ts`
- Feature-specific: `src/features/{feature}/hooks/use{HookName}.ts`

## Special Directories

**.next/**
- Purpose: Next.js build output and cache
- Generated: Yes
- Committed: No (in .gitignore)

**node_modules/**
- Purpose: npm package dependencies
- Generated: Yes (via npm install)
- Committed: No (in .gitignore)

**uploads/**
- Purpose: User-uploaded files and temporary storage
- Generated: Yes (at runtime)
- Committed: No (in .gitignore)

**generated/**
- Purpose: Script-generated assets and data
- Generated: Yes (by scripts)
- Committed: Partial (depends on content)

**archive/**
- Purpose: Archived/deprecated code for reference
- Generated: No (manual moves)
- Committed: Yes

**.planning/**
- Purpose: GSD command planning and codebase analysis
- Generated: Yes (by GSD commands)
- Committed: Yes

---

*Structure analysis: 2026-01-31*
