# Testing Patterns

**Analysis Date:** 2026-02-15

## Test Framework

**Runner:**
- Vitest v4.0.18 (Jest-compatible API)
- Config: `vitest.config.js`

**Environment:**
- JSDOM for DOM simulation in Node.js
- Global test functions enabled (`globals: true`)
- Test setup file: `tests/setup.js`

**Assertion Library:**
- Vitest built-in `expect()` function (Jest-compatible)
- Additional testing libraries:
  - `@testing-library/react` v16.3.2 - Component testing
  - `@testing-library/dom` v10.4.1 - DOM utilities
  - `@testing-library/jest-dom` v6.9.1 - Matcher extensions

**Run Commands:**
```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode (TDD)
npm run test:coverage # Generate coverage report (text, json, html)
```

## Test File Organization

**Location Patterns:**
- Service tests: Co-located in `src/services/` directory with `.test.js` extension
  - `src/services/versionService.ts` → `src/services/versionService.test.js`
  - `src/services/councilService.ts` → `src/services/councilService.test.js`
- Alternative location: `src/test/services/[name].test.js` (e.g., `src/test/services/replicateService.test.js`)
- Integration tests: In `tests/` directory
  - `tests/server.test.js` - Proxy server security and auth
  - `tests/DesignGenerator.test.jsx` - Component integration tests

**Naming:**
- Test files follow pattern: `[module].test.{js|jsx}`
- Describe blocks mirror module structure
- Test names use imperative verb phrases: "should X when Y", "should return Z"

**Structure:**
```
src/
├── services/
│   ├── versionService.ts
│   └── versionService.test.js
├── test/
│   └── services/
│       └── replicateService.test.js
└── components/
    └── DesignGenerator.jsx
tests/
├── setup.js                    # Global test configuration
├── server.test.js              # Express proxy tests
├── DesignGenerator.test.jsx    # Component tests
└── [...more integration tests]
```

## Test Structure

**Suite Organization:**
```typescript
describe('versionService', () => {
  const testSessionId = 'test_session_123';

  beforeEach(() => {
    // Clear state before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Cleanup after each test
    clearSessionHistory(testSessionId);
  });

  describe('Version Storage and Retrieval', () => {
    it('should store and retrieve versions', () => {
      // Arrange
      const versionData = { prompt: 'dragon tattoo' };

      // Act
      const version = addVersion(testSessionId, versionData);
      const retrieved = getVersionById(testSessionId, version.id);

      // Expect
      expect(retrieved.prompt).toBe('dragon tattoo');
    });
  });
});
```

**Patterns:**
- Nested `describe()` blocks for feature areas (e.g., "Version Storage", "Version Merging", "Edge Cases")
- Shared test data in `beforeEach()` for state isolation
- Cleanup in `afterEach()` (localStorage cleared, resources released)
- Arrange-Act-Assert pattern within each `it()` block

## Mocking

**Framework:** Vitest built-in `vi.mock()` and `vi.fn()`

**Patterns:**

**Module-level mocks:**
```typescript
vi.mock('../../services/fetchWithAbort.js', async () => {
  const actual = await vi.importActual('../../services/fetchWithAbort.js');
  return {
    ...actual,
    postJSON: vi.fn(),
    fetchJSON: vi.fn()
  };
});
```

**Function mocks in tests:**
```typescript
const mockCallback = vi.fn();

await enhancePrompt({
  userIdea: 'A dragon design',
  style: 'traditional',
  bodyPart: 'forearm',
  onDiscussionUpdate: mockCallback
});

expect(mockCallback.mock.calls.length).toBeGreaterThanOrEqual(0);
```

**Mock setup in beforeEach:**
```typescript
beforeEach(async () => {
  ({ postJSON } = await import('../../services/fetchWithAbort.js'));
  ({ generatePreviewDesign } = await import('../../services/replicateService'));

  postJSON.mockResolvedValue({
    id: 'preview-id',
    status: 'succeeded',
    output: ['https://example.com/preview.png']
  });
});
```

**Mock reset/clearing:**
```typescript
vi.resetModules();      // Reset all mocked modules
vi.clearAllMocks();     // Clear call history
vi.stubEnv('VAR', 'value');  // Set environment variables for test
```

**What to Mock:**
- External API calls: Replicate, OpenRouter, Firebase, Supabase
- Service layer functions from other modules
- Environment variables that affect behavior

**What NOT to Mock:**
- Pure utility functions (canvasService layer operations)
- localStorage operations (use real localStorage with cleanup)
- Internal function calls within same module
- Type definitions and interfaces

## Fixtures and Factories

**Test Data:**
```typescript
// In versionService.test.js
const versionData = {
  prompt: 'dragon tattoo',
  enhancedPrompt: 'detailed dragon',
  parameters: { size: 'large' },
  layers: [{ id: 'l1', name: 'Background' }],
  imageUrl: 'url1'
};

const version = addVersion(testSessionId, versionData);
```

**Structured fixtures for complex operations:**
```typescript
const version1Data = {
  prompt: 'version 1',
  layers: [
    { id: 'layer_shared', name: 'Background', zIndex: 0 },
    { id: 'layer_v1_only', name: 'Subject', zIndex: 1 }
  ]
};

const version2Data = {
  prompt: 'version 2',
  layers: [
    { id: 'layer_shared', name: 'Background', zIndex: 0 },
    { id: 'layer_v2_only', name: 'Effect', zIndex: 1 }
  ]
};
```

**Location:**
- Inline in test files (no separate fixture files)
- Test data defined in describe blocks or beforeEach setup
- Complex mocks in separate mock file pattern at module top

## Coverage

**Requirements:** No explicit coverage target enforced

**View Coverage:**
```bash
npm run test:coverage
# Generates HTML report in `coverage/` directory
```

**Coverage Config (`vitest.config.js`):**
```javascript
coverage: {
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    'tests/',
    '*.config.js',
    'src/main.jsx'
  ]
}
```

## Test Types

**Unit Tests:**
- Scope: Single function or service method
- Location: `src/services/[name].test.js`
- Approach: Mock external dependencies, test function behavior in isolation
- Example: `versionService.test.js` tests version storage, merging, branching
- Example: `replicateService.test.js` tests preview vs high-res generation parameters

**Integration Tests:**
- Scope: Multiple services working together, API routing
- Location: `tests/` directory
- Approach: Mock at system boundaries (APIs, databases), test workflows
- Example: `server.test.js` - Tests auth, CORS, rate limiting together
- Example: `DesignGenerator.test.jsx` - Tests component with mocked services

**E2E Tests:**
- Framework: Not currently in use (no Playwright/Cypress config)
- Placeholder: Manual testing via `npm run dev` + browser
- Structure: `tests/` directory would contain e2e specs if added

## Common Patterns

**Async Testing:**
```typescript
it('should create a low-res preview', async () => {
  const result = await generatePreviewDesign({
    style: 'traditional',
    subject: 'dragon tattoo',
    bodyPart: 'forearm'
  });

  expect(result.metadata.mode).toBe('preview');
});
```

**Promise resolution in tests:**
```typescript
vi.mock('./fetchService', () => ({
  postJSON: vi.fn().mockResolvedValue({
    id: 'pred-id',
    status: 'succeeded'
  })
}));
```

**Error Testing:**
```typescript
it('should handle merge with non-existent versions', () => {
  const result = mergeVersions(testSessionId, 'fake_id_1', 'fake_id_2');
  expect(result).toBeNull();
});
```

**Testing edge cases:**
```typescript
describe('Edge Cases', () => {
  it('should enforce version limit per session', () => {
    for (let i = 0; i < 55; i++) {
      addVersion(testSessionId, { prompt: `version ${i}` });
    }

    const versions = getVersions(testSessionId);
    expect(versions.length).toBeLessThanOrEqual(50);
  });

  it('should handle missing layer arrays in merge', () => {
    const v1 = addVersion(testSessionId, { prompt: 'no layers' });
    const v2 = addVersion(testSessionId, { prompt: 'also no layers' });

    const merged = mergeVersions(testSessionId, v1.id, v2.id, {
      layersFromVersion1: [0],
      layersFromVersion2: [0]
    });

    expect(merged.layers).toEqual([]);
  });
});
```

**Testing with complex state:**
```typescript
// multiLayerService.test.js
it('should generate multiple layer specs from result', async () => {
  const result = {
    images: ['url1', 'url2', 'url3'],
    metadata: { prompt: 'dragon with lightning' }
  };

  const layerSpecs = await processGenerationResult(result, {
    separateAlpha: false
  });

  expect(layerSpecs).toHaveLength(3);
  expect(layerSpecs[0].type).toBe('subject');
  expect(layerSpecs[1].type).toBe('background');
});
```

**Testing with DOM (component tests):**
```typescript
// DesignGenerator.test.jsx
describe('Initial Render', () => {
  it('should render the form with all inputs', () => {
    render(
      <TestWrapper>
        <DesignGenerator />
      </TestWrapper>
    );

    expect(screen.getByText(/the forge/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/describe your vision/i)).toBeTruthy();
  });
});
```

**Test Wrapper Pattern:**
```typescript
function TestWrapper({ children }) {
  return (
    <BrowserRouter>
      <ToastProvider>
        {children}
      </ToastProvider>
    </BrowserRouter>
  );
}

// Use in tests:
render(
  <TestWrapper>
    <DesignGenerator />
  </TestWrapper>
);
```

## Test Setup & Environment

**Global setup (`tests/setup.js`):**
```javascript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.VITE_PROXY_URL = 'http://localhost:3001/api';
process.env.VITE_FRONTEND_AUTH_TOKEN = 'test-token';
process.env.VITE_USE_COUNCIL = 'false';
process.env.VITE_DEMO_MODE = 'false';
```

**Per-test environment setup:**
```typescript
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_PROXY_URL', 'http://localhost:3001/api');
  vi.stubEnv('VITE_DEMO_MODE', 'false');
});
```

## Known Testing Issues

**jest-dom Module Resolution:**
- Comment in `tests/setup.js` notes unresolved jest-dom import
- Workaround: Tests use direct expect assertions instead of jest-dom matchers
- Impact: No `.toBeInTheDocument()` or similar matchers available

---

*Testing analysis: 2026-02-15*
