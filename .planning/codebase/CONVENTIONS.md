# Coding Conventions

**Analysis Date:** 2026-01-31

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `BodyPartSelector.tsx`, `TransformControls.tsx`)
- Utility/service files: camelCase (e.g., `canvasService.ts`, `hybridMatchService.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `STORAGE_KEY`, `CACHE_TTL` in `src/stores/useForgeStore.ts`)
- Test files: Same name as source + `.test.ts` or `.spec.ts` suffix (e.g., `councilService.test.js`)
- API routes: kebab-case in file paths (e.g., `/api/v1/layers/decompose`, `/api/v1/council/enhance`)

**Functions:**
- Standard functions: camelCase (e.g., `generateLayerId()`, `createLayer()`, `uploadToGCS()`)
- React hooks: `use` prefix followed by PascalCase (e.g., `useForgeStore`, `useCanvasAspectRatio`)
- Event handlers: `on` prefix followed by action name (e.g., `onClick`, `onFlipHorizontal`, `onSelect`)

**Variables:**
- Standard variables: camelCase (e.g., `maxZIndex`, `selectedBodyPart`, `requestedCount`)
- Boolean variables: often prefixed with `is`, `has`, `should` (e.g., `isSelected`, `hasReplicateToken`)
- Configuration objects: camelCase keys (e.g., `SIZE_MAP`, `ALLOWED_ORIGINS`)

**Types:**
- Interface names: PascalCase (e.g., `BodyPartConfig`, `ForgeState`, `GCSUploadResult`)
- Type aliases: PascalCase (e.g., `type BodyPart =`, `type ImagenGenerationOptions =`)
- Generic type parameters: Single uppercase letters or descriptive PascalCase (e.g., `<T>`, `<State>`)

## Code Style

**Formatting:**
- Tool: ESLint 9 (no Prettier detected in project configuration)
- Line breaks: Typical modern conventions (implied from code samples)
- Indentation: 2 spaces (standard for JavaScript/TypeScript)
- Quotes: Double quotes in JSX attributes, implementation varies in code

**Linting:**
- ESLint configuration: `.eslintrc.cjs`
- Base config: `eslint:recommended` with React plugin
- Key rules:
  - `react/prop-types`: off (TypeScript provides type safety)
  - `react-refresh/only-export-components`: warn (allows const exports for components)
  - Uses `plugin:react/recommended`, `plugin:react/jsx-runtime`, `plugin:react-hooks/recommended`

## Import Organization

**Order:**
1. Next.js imports (`next/server`, `next/dynamic`, `next/font`, etc.)
2. React and third-party UI libraries (`react`, `lucide-react`, `framer-motion`)
3. Local service imports (`@/services/...`)
4. Local lib/utility imports (`@/lib/...`)
5. Local component/constant imports (`@/components/...`, `@/constants/...`)

**Example from `src/app/api/v1/storage/upload/route.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiAuth } from '@/lib/api-auth';
import crypto from 'crypto';
import { uploadToGCS, type GCSUploadResult } from '@/services/gcs-service';
```

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Used consistently throughout codebase for imports

## Error Handling

**Patterns:**
- Try-catch blocks with typed error objects
- Error type checking: `error instanceof Error ? error.message : 'Unknown error'`
- Error objects thrown with descriptive messages: `throw new Error('Failed to upload to GCS: ${message}')`
- API responses return structured error objects with `error`, `code`, and optional `message` fields

**Example from `src/services/gcs-service.ts`:**
```typescript
catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GCS] Upload failed:', message);
    throw new Error(`Failed to upload to GCS: ${message}`);
}
```

**API Error Responses:**
- HTTP status codes aligned with error type (400 for validation, 401 for auth, 429 for rate limits, 500 for server errors)
- Response structure: `{ error: string, code: string, message?: string, details?: any }`

## Logging

**Framework:** Plain `console` object (no logger library)

**Patterns:**
- Prefix log messages with service/module name in square brackets: `console.log('[VertexAI Council] ...')`
- Log levels:
  - `console.log()`: informational messages, status updates
  - `console.error()`: error conditions
  - `console.warn()`: warnings and fallback scenarios
- Examples from codebase:
  - `console.log('[Replicate] Prediction created:', prediction.id)`
  - `console.error('[HybridMatch] Error in findMatchingArtists:', message)`
  - `console.warn('Failed to generate thumbnail:', error)`

## Comments

**When to Comment:**
- Block-level comments for major functions and services (JSDoc-style at top of file)
- Inline comments for non-obvious logic or workarounds
- No need to comment obvious code (variable assignments, simple loops)

**JSDoc/TSDoc:**
- Used for service/utility function documentation
- Format: Block comments with `/**` at top of files/functions
- Example from `src/services/gcs-service.ts`:
```typescript
/**
 * Google Cloud Storage Service
 *
 * Handles all interactions with Google Cloud Storage for TatT Pro:
 * - Upload designs, layers, stencils, and portfolio images
 * - Generate signed URLs for secure, temporary access
 * - Delete files when no longer needed
 */
```

- Example from `src/services/canvasService.ts`:
```typescript
/**
 * Canvas Service - Layer Management
 *
 * Core service for managing canvas layers, rendering, and operations
 */
```

**Component Comments:**
- Components use JSDoc comments for description and props
- Example from `src/components/generate/BodyPartSelector.tsx`:
```typescript
/**
 * BodyPartSelector - Visual picker for body part selection
 * Premium glassmorphism cards with staggered reveal
 */
```

## Function Design

**Size:**
- Functions typically range from 5-50 lines
- Services break down large operations into smaller, composable functions
- Example: `canvasService.ts` has ~20 small utility functions for layer operations

**Parameters:**
- Prefer object destructuring for multiple parameters
- Example from `useForgeStore.ts`:
```typescript
addLayer: async (imageUrl: string, type: Layer['type'] = 'subject') => Promise<Layer>
```
- Options parameters often use object pattern with defaults

**Return Values:**
- Async functions return Promises with typed return values
- Service functions return strongly typed objects (interfaces defined at top of file)
- Zustand store actions use `void` for mutations or return modified state

## Module Design

**Exports:**
- Named exports preferred for utilities and services
- Default exports used for React components and page components
- Type exports using `export type` syntax: `export type GCSUploadResult`
- Service exports include both types and functions

**Example from `src/services/hybridMatchService.ts`:**
```typescript
export interface QueryPreferences { ... }
export interface VectorSearchResult { ... }
export interface MatchResult { ... }
export async function findMatchingArtists(...) { ... }
```

**Barrel Files:**
- Not widely used in this codebase
- Direct imports to specific service files preferred

## TypeScript Usage

**Strict Mode:** Enabled in `tsconfig.json` (`"strict": true`)

**Key Configurations:**
- `"noEmit": true` - TypeScript for type checking only, Next.js handles compilation
- `"jsx": "react-jsx"` - Modern JSX transform (no React import needed in files)
- `"moduleResolution": "bundler"` - Modern module resolution

**Typing Patterns:**
- Interfaces for object shapes and state objects
- Type aliases for discriminated unions or simple type combinations
- Generic typing for reusable utilities (e.g., state management)

---

*Convention analysis: 2026-01-31*
