# Coding Conventions

**Analysis Date:** 2026-02-15

## Naming Patterns

**Files:**
- Services: `camelCaseService.ts` (e.g., `canvasService.ts`, `versionService.ts`, `councilService.ts`)
- Hooks: `useCapitalizedName.ts` (e.g., `useLayerManagement.ts`, `useVersionHistory.ts`, `useImageGeneration.ts`)
- Components: `CapitalizedName.tsx` (e.g., `DesignGenerator.jsx`)
- Tests: `[service/component].test.js` or `.test.jsx` (e.g., `versionService.test.js`, `DesignGenerator.test.jsx`)
- Utilities: `camelCaseName.ts` (e.g., `styleModelMapping.ts`, `layerUtils.js`)

**Functions:**
- All functions use `camelCase` naming
- Exported functions in services are verb-action patterns: `addVersion()`, `getVersions()`, `updateTransform()`, `deleteLayer()`
- Private/internal functions use underscore prefix or remain unexported: `normalizeStyle()`, `parseQuery()`
- Hook functions start with `use` prefix required by React: `useLayerManagement()`, `useVersionHistory()`

**Variables:**
- Constants use `SCREAMING_SNAKE_CASE`: `MAX_VERSIONS_PER_DESIGN`, `VERSION_STORAGE_KEY_PREFIX`, `DEFAULT_BODY_PART`
- Local variables and parameters use `camelCase`: `sessionId`, `layerId`, `imageUrl`, `existingLayers`
- Configuration objects use `camelCase` keys: `{ layerTypes: [], prompt: string }`

**Types:**
- TypeScript interfaces use `CapitalizedPascalCase`: `Layer`, `DesignVersion`, `EnhancementResult`, `ModelSelection`
- Type unions use `camelCase` keys: `type PromptLevel = 'simple' | 'detailed' | 'ultra'`
- Generic type parameters use single letters or abbreviated names: `T`, `K`, `V`

## Code Style

**Formatting:**
- Enforced by ESLint config: `.eslintrc.cjs` and Next.js defaults
- Line length: No explicit limit enforced, but examples show ~80-100 character lines
- Indentation: 2 spaces (TypeScript/JavaScript standard)
- Trailing semicolons: Required in TypeScript files, optional in some JS files

**Linting:**
- Tool: ESLint v9 with Next.js core-web-vitals and TypeScript presets
- Key rules:
  - `react-refresh/only-export-components`: Warn when exporting non-components from component files
  - `react/prop-types`: Off (TypeScript replaces PropTypes)
  - `react-hooks/recommended`: Enforces hook rules

**TypeScript Configuration:**
- Target: ES5 (transpiled for browser compatibility)
- Strict mode: Enabled (`strict: true`)
- Module resolution: `bundler` (for Next.js)
- JSX: `react-jsx` (React 18+ without import)
- Path aliases: `@/*` maps to `./src/*`

## Import Organization

**Order:**
1. External packages (React, Next.js, third-party libraries)
2. Internal utilities and configs
3. Services layer
4. Types/interfaces (from local files)
5. Constants

**Example from `councilService.ts`:**
```typescript
import { buildCharacterMap, getAllCharacterNames } from '../config/characterDatabase.js';
import {
  selectModelWithFallback,
  getModelPromptEnhancements
} from '../utils/styleModelMapping.js';
import { COUNCIL_SKILL_PACK } from '../config/councilSkillPack';
```

**Path Aliases:**
- `@/*` resolves to `./src/*` allowing imports like `@/services/canvasService`
- Relative imports used when `@/` alias is not needed

**Multi-line imports:** Group related imports together with blank lines separating categories

## Error Handling

**Patterns:**
- Try-catch blocks used for I/O operations: API calls, localStorage, file operations
- Console logging for error tracking with service prefixes: `console.error('[VersionService] Error message:', error)`
- Functions return `null` for failed operations (graceful degradation):
  ```typescript
  export function addVersion(sessionId: string, versionData: Partial<DesignVersion>): DesignVersion | null {
    if (!sessionId) {
      console.warn('[VersionService] No session ID provided');
      return null;
    }
    try {
      // ... operation
    } catch (error) {
      console.error('[VersionService] Error adding version:', error);
      return null;
    }
  }
  ```
- Result objects with `success` flag for complex operations:
  ```typescript
  const result = safeLocalStorageSet(key, versions);
  if (!result.success) {
    console.error('[VersionService] Failed to save:', result.error);
    return null;
  }
  ```
- FetchError wrapper for HTTP errors with error codes: `isErrorCode(error, 'AUTH_REQUIRED')`, `getUserErrorMessage(error)`

## Logging

**Framework:** `console` (no external logging library)

**Patterns:**
- Prefixed log messages with service name in square brackets: `[ServiceName]`
- Three levels:
  - `console.log()` - Informational, successful operations: `[DesignLibrary] Design saved: id`
  - `console.warn()` - Non-critical issues: `[Firebase] Client initialization failed`
  - `console.error()` - Critical failures: `[VersionService] Error adding version`
- Include context in log messages: operation, IDs, and error details
- Use error objects directly for stack traces: `console.error('[Service] Message:', error)`

**Examples from codebase:**
```typescript
console.log('[VersionService] Purged expired history:', key);
console.warn('[CouncilService] Error detecting characters:', error);
console.error('[DesignLibrary] Error updating design:', error);
console.log('[Firebase] Subscribed to matches for user:', userId);
```

## Comments

**When to Comment:**
- Function behavior that isn't obvious from the name
- Complex algorithms or non-obvious logic
- Section headers using `// ============...` decorators (common in larger services)
- Type definitions and interfaces with JSDoc-style comments
- Algorithm explanations: RRF scoring, layer composition, etc.

**JSDoc/TSDoc:**
- Block comments (/** ... */) used for functions and types in service files:
  ```typescript
  /**
   * Version History Service
   *
   * Manages the version history of tattoo designs using localStorage.
   * Handles auto-saving versions, branching, and comparison data retrieval.
   */
  ```
- Param descriptions with types:
  ```typescript
  /**
   * Add a new version to the history
   */
  export function addVersion(
    sessionId: string,
    versionData: Partial<DesignVersion>
  ): DesignVersion | null
  ```
- Sparse usage in component files (more reliance on TypeScript types)

## Function Design

**Size:** Typically 10-50 lines; larger functions broken into helper functions
- `canvasService.ts` functions: 15-40 lines (pure layer operations)
- `versionService.ts` functions: 20-80 lines (include localStorage operations)
- Helper functions inline or prefixed with underscore: `normalizeStyle()`, `parseQuery()`

**Parameters:**
- Single object parameter for functions with multiple arguments (common in service APIs):
  ```typescript
  export function hybridMatch(params: {
    query: string;
    preferences: MatchPreferences;
    maxResults: number;
  })
  ```
- Spread operators for optional configs: `{ ...existingConfig, newProperty }`

**Return Values:**
- Immutable updates return new arrays/objects (never mutate input):
  ```typescript
  // Wrong
  layers[0].visible = false;

  // Correct
  return layers.map(l => l.id === layerId ? { ...l, visible: !l.visible } : l);
  ```
- Functions returning undefined explicitly or implicitly return undefined for void operations
- Type unions for success/failure: `DesignVersion | null`, `CacheEntry | undefined`

## Module Design

**Exports:**
- Named exports required (no default exports in utility modules)
- Services export pure functions at module root level
- Types exported separately from implementations:
  ```typescript
  export interface Layer { ... }
  export function createLayer(...): Layer { ... }
  ```

**Barrel Files:**
- Minimal use; mostly direct imports from service files
- `@/` alias used to simplify import paths

## Immutability Patterns

**State Updates:** All array/object mutations return new objects:
```typescript
// Layer operations in canvasService.ts
export function reorderLayers(layers: Layer[], fromIndex: number, toIndex: number): Layer[] {
  const reordered = [...layers];  // Copy array
  const [movedLayer] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, movedLayer);
  return reordered.map((layer, index) => ({  // Return new objects
    ...layer,
    zIndex: index
  }));
}
```

**Zustand Store:** State mutations happen through actions, not direct property assignment
```typescript
// useLayerManagement.ts - facade over Zustand store
const updateTransform = useForgeStore((store) => store.updateTransform);
updateTransform(layerId, { x: 100, y: 50 });  // Action call
```

---

*Convention analysis: 2026-02-15*
