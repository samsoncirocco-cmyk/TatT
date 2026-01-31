# Coding Conventions

**Analysis Date:** 2026-01-31

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `DesignGenerator.jsx`, `BodyPartSelector.tsx`)
- Services: camelCase with 'Service' suffix (e.g., `designLibraryService.js`, `councilService.js`)
- Utilities: camelCase descriptive (e.g., `matching.js`, `layerUtils.js`)
- Hooks: camelCase with 'use' prefix (e.g., `useToast.js`, `useVersionHistory.js`)
- Config files: camelCase descriptive (e.g., `councilSkillPack.js`, `promptTemplates.js`)
- Test files: Same name as source with `.test.js` or `.test.ts` suffix
- API routes (Next.js): `route.ts` in nested folders following REST conventions

**Functions:**
- camelCase for all functions (e.g., `enhancePrompt`, `getAllDesigns`, `buildCharacterMap`)
- Event handlers prefixed with `handle` or `on` (e.g., `handleSubmit`, `onSelect`)
- Boolean functions prefixed with `is`, `has`, `should` (e.g., `isGenerating`, `hasCharacter`)
- Custom hooks prefixed with `use` (e.g., `useToast`, `useArtistMatching`)

**Variables:**
- camelCase for local variables (e.g., `userInput`, `enhancedPrompts`, `apiUsage`)
- SCREAMING_SNAKE_CASE for constants (e.g., `MAX_DESIGNS`, `LIBRARY_STORAGE_KEY`, `COUNCIL_SKILL_PACK`)
- State variables descriptive with `set` prefix for setters (e.g., `[isGenerating, setIsGenerating]`)

**Types:**
- PascalCase for TypeScript types and interfaces (e.g., `BodyPart`, `BodyPartSelectorProps`)

## Code Style

**Formatting:**
- No Prettier config detected - relies on Next.js defaults
- 2-space indentation (observed in most files)
- Single quotes preferred in JSX, double quotes in TypeScript
- Trailing commas in multiline objects/arrays
- Template literals for string interpolation

**Linting:**
- ESLint with Next.js config (`eslint.config.mjs`)
- Legacy config also present (`.eslintrc.cjs`) for React
- Key rules: React hooks recommended, no prop-types (TypeScript/JSDoc instead)
- Strict TypeScript mode enabled in `tsconfig.json`

## Import Organization

**Order:**
1. External packages (React, Next.js, third-party)
2. Internal absolute imports using `@/` alias
3. Relative imports (services, utils, components)
4. Type imports (when using TypeScript)
5. Assets/styles (if any)

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- Used extensively in API routes and Next.js app directory

**Examples:**
```javascript
// From src/app/api/v1/council/enhance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { enhancePrompt } from '@/services/councilService';

// From src/services/designLibraryService.js
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
  validateDesign,
  purgeExpiredDesigns
} from './storageService.js';
```

**Import Extensions:**
- `.js` extension explicit in ES modules
- No extension in TypeScript files
- Destructured imports on multiple lines when more than 3 items

## Error Handling

**Patterns:**
- Try-catch blocks in service functions with console.error logging
- Error objects thrown with descriptive messages
- API routes return NextResponse with status codes and error codes
- Validation before operations with early returns

**Examples:**
```javascript
// Service pattern
export function saveDesign(imageUrl, metadata, userInput) {
  try {
    const designs = getAllDesigns();
    // ... validation
    if (!validation.valid) {
      throw new Error(`Invalid design: ${validation.errors.join(', ')}`);
    }
    // ... operation
    return newDesign;
  } catch (error) {
    console.error('[DesignLibrary] Error saving design:', error);
    throw error;
  }
}

// API route pattern
export async function POST(req: NextRequest) {
  try {
    const authError = verifyApiAuth(req);
    if (authError) return authError;

    const body = await req.json();
    if (!body.user_prompt || body.user_prompt.length < 3) {
      return NextResponse.json({ error: 'Invalid prompt', code: 'INVALID_REQUEST' }, { status: 400 });
    }
    // ... operation
  } catch (error: any) {
    return NextResponse.json({
      error: 'Enhancement failed',
      code: 'ENHANCEMENT_FAILED',
      message: error.message
    }, { status: 500 });
  }
}
```

## Logging

**Framework:** Native console object

**Patterns:**
- Prefixed with component/service name in brackets (e.g., `[API]`, `[DesignLibrary]`, `[Inpainting]`)
- `console.log` for operations, timing, and status updates
- `console.error` for errors with full error objects
- `console.warn` for warnings and degraded states
- Performance timing included in key operations

**Examples:**
```javascript
console.log('[API] Council enhancement request:', { prompt_length, style, body_part });
console.log(`[API] Council enhancement completed in ${duration}ms`);
console.error('[DesignLibrary] Error saving design:', error);
console.warn('[StorageWarning] Check failed:', error);
```

## Comments

**When to Comment:**
- File-level JSDoc blocks describing module purpose
- Complex algorithms with inline explanations
- TODO markers for future work
- Business logic explanations
- Not used for obvious code

**JSDoc/TSDoc:**
- Used extensively for functions in service files
- Parameter descriptions with types
- Return value descriptions
- Examples when helpful

**Examples:**
```javascript
/**
 * Design Library Service
 *
 * Manages user's saved tattoo designs using browser localStorage.
 * In production, this will be replaced with proper database storage.
 */

/**
 * Save design to library
 *
 * @param {string} imageUrl - URL or base64 of the image
 * @param {Object} metadata - Design metadata from generation
 * @param {Object} userInput - Original user input
 * @returns {Object} Saved design object
 */
export function saveDesign(imageUrl, metadata, userInput) {
  // ...
}
```

## Function Design

**Size:** Functions generally 20-50 lines; complex operations broken into helpers

**Parameters:**
- Object destructuring for multiple related params
- Optional parameters with defaults
- Type annotations in TypeScript files

**Return Values:**
- Explicit returns (no implicit undefined)
- Objects for multiple values
- Null/undefined for not-found cases
- Throw errors for exceptional cases

**Examples:**
```typescript
// TypeScript with interface
export function BodyPartSelector({
    selectedBodyPart,
    onSelect,
    disabled = false
}: BodyPartSelectorProps) {
  // ...
}

// Service with object params
export async function enhancePrompt({
    userIdea,
    style,
    bodyPart,
    isStencilMode
}) {
  // ...
}
```

## Module Design

**Exports:**
- Named exports preferred over default exports
- Multiple functions exported from service modules
- React components use default export
- Barrel files not heavily used

**File Organization:**
- Constants at top
- Helper functions before exports
- Main exports at bottom
- Related functionality grouped together

**Examples:**
```javascript
// Constants
const LIBRARY_STORAGE_KEY = 'tattester_design_library';
const MAX_DESIGNS = 50;

// Helper functions
function createDesign(imageUrl, metadata, userInput) {
  // ...
}

function generateId() {
  // ...
}

// Exports
export function getAllDesigns() { }
export function saveDesign() { }
export function deleteDesign() { }
```

## React Patterns

**Component Style:**
- Functional components with hooks
- State management with useState
- Effects with useEffect
- Custom hooks for reusable logic

**Props:**
- Destructured in function signature
- TypeScript interfaces for prop types
- Default values in destructuring
- No PropTypes (disabled in ESLint)

**State:**
- Multiple useState calls (not single object)
- Descriptive state names
- Callbacks with useCallback where appropriate

**Styling:**
- Tailwind CSS utility classes
- Template strings for conditional classes
- Custom design tokens (e.g., `ducks-yellow`, `ducks-green`)

---

*Convention analysis: 2026-01-31*
