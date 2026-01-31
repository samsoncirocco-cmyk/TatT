# Testing Patterns

**Analysis Date:** 2026-01-31

## Test Framework

**Runner:**
- Vitest (modern replacement for Jest)
- Configuration: `vitest.config.js`
- Environment: `jsdom` (browser-like DOM environment)

**Assertion Library:**
- Vitest's built-in expect API (Jest-compatible)

**Run Commands:**
```bash
npm test                    # Run all tests (not configured in package.json)
npm run test:watch         # Watch mode (not configured in package.json)
npm run test:coverage      # Coverage report (not configured in package.json)
```

**Note:** Test scripts not currently exposed in `package.json`. Tests can be run directly with Vitest CLI.

## Test File Organization

**Location:**
- Co-located pattern mixed with centralized pattern
- Some tests in `tests/` directory root
- Component/service may have adjacent `__tests__` directory or `.test.js` suffix in same directory
- Example: `src/services/councilService.test.js` co-located with `src/services/councilService.js`
- Tests in `tests/` directory: `tests/DesignGenerator.test.jsx`, `tests/hybridMatching.test.js`, `tests/server.test.js`

**Naming:**
- Pattern: `[filename].test.js` or `[filename].test.jsx` for test files
- Pattern: `[filename].spec.js` also supported but `.test.` is standard in codebase

**Structure:**
```
manama-next/
├── tests/                          # Centralized test directory
│   ├── setup.js                   # Vitest setup configuration
│   ├── DesignGenerator.test.jsx   # Component tests
│   ├── hybridMatching.test.js     # Integration tests
│   ├── server.test.js             # Server/API tests
│   └── stencilService.test.js
└── src/
    └── services/
        ├── councilService.js
        └── councilService.test.js # Co-located service tests
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('DesignGenerator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature Group', () => {
    it('should do specific thing', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

**Patterns:**

1. **Setup/Teardown:**
   - `beforeEach()` used to reset mocks and state before each test
   - `afterEach()` handled globally in `tests/setup.js` for cleanup
   - Example from `tests/setup.js`:
   ```javascript
   afterEach(() => {
     cleanup();  // @testing-library/react cleanup
   });
   ```

2. **Assertion Pattern:**
   - Vitest expect API: `expect(value).toBe()`, `expect(value).toBeCloseTo()`, etc.
   - Example from `tests/hybridMatching.test.js`:
   ```javascript
   expect(normalizeScore(5, 0, 10)).toBe(0.5);
   expect(result).toBeCloseTo(expected, 5);
   expect(shieldOccurrences).toBeLessThanOrEqual(1);
   ```

3. **Test Grouping:**
   - Nested `describe()` blocks for logical grouping of related tests
   - Example from `tests/hybridMatching.test.js`:
   ```javascript
   describe('Score Aggregation Utilities', () => {
     describe('normalizeScore', () => { ... });
     describe('weightedAverage', () => { ... });
     describe('calculateCompositeScore', () => { ... });
   });
   ```

## Mocking

**Framework:** Vitest's `vi` object

**Patterns:**

1. **Module Mocking:**
   ```javascript
   vi.mock('../src/services/replicateService', () => ({
     generateWithRateLimit: vi.fn(),
     getAPIUsage: vi.fn(() => ({
       totalSpent: 0.5,
       remainingBudget: 499.5
     })),
     HealthStatus: { HEALTHY: 'healthy' }
   }));
   ```

2. **Function Mocking:**
   - Use `vi.fn()` to create mock functions
   - Chain `mockResolvedValue()`, `mockRejectedValue()`, etc.
   - Example from `tests/DesignGenerator.test.jsx`:
   ```javascript
   vi.mock('../src/services/replicateService', () => ({
     generateWithRateLimit: vi.fn(),
     checkServiceHealth: vi.fn(() => Promise.resolve({
       healthy: true,
       status: 'healthy'
     }))
   }));
   ```

3. **Mock Configuration Modules:**
   - Mocking config/skill packs for prompt enhancement
   - Example from `src/services/councilService.test.js`:
   ```javascript
   vi.mock('../config/councilSkillPack', () => ({
     COUNCIL_SKILL_PACK: {
       negativeShield: '(...)',
       anatomicalFlow: { forearm: '...', chest: '...' }
     }
   }));
   ```

**What to Mock:**
- External API calls (Replicate, Vertex AI, Google Cloud)
- Service dependencies (Firebase, Neo4j, vector DB calls)
- Config modules that vary by environment
- Date/time for predictable testing

**What NOT to Mock:**
- Pure utility functions and business logic (test the actual implementation)
- File system operations (use temporary files if necessary)
- Local state management (Redux/Zustand actions)

## Fixtures and Factories

**Test Data:**
- Inline mock objects created in test setup or beforeEach
- Example from `tests/DesignGenerator.test.jsx`:
```javascript
beforeEach(() => {
  vi.clearAllMocks();
  // Test setup data would go here
});
```

- Service tests use structured mock returns matching service interface types

**Location:**
- Mock data defined at test file level, often in mock setup
- No separate fixtures directory observed; data is inline in test files

## Coverage

**Requirements:** Not enforced (no coverage threshold in config)

**View Coverage:**
```bash
vitest --coverage
```

**Configured reporters in `vitest.config.js`:**
- `text` - console output
- `json` - JSON format
- `html` - HTML report

**Excluded from coverage:**
- `node_modules/`
- `tests/` directory itself
- `*.config.js` files
- `src/main.jsx` (app entry point)

## Test Types

**Unit Tests:**
- Scope: Individual functions and utilities
- Approach: Test pure functions (score aggregation, normalization, etc.)
- Example: `tests/hybridMatching.test.js` tests utility functions with various input values
- Assertion patterns: Direct value comparisons, edge case testing

**Integration Tests:**
- Scope: Service interactions and API contract testing
- Approach: Mock external dependencies but test combined logic
- Example: `tests/server.test.js` tests Express server with mocked auth/CORS middleware
- Tools: Uses `supertest` for HTTP testing (`request(app).post(...).expect(...)`)

**E2E Tests:**
- Framework: Not used
- Implementation: Would likely use Playwright or Cypress if added

## Common Patterns

**Async Testing:**
```javascript
// Using async/await pattern
it('should fetch and process data', async () => {
  const result = await enhancePrompt({
    userIdea: 'Create a stencil design',
    style: 'traditional',
    bodyPart: 'forearm'
  });

  expect(result.negativePrompt).toContain('shading');
});
```

**Error Testing:**
```javascript
// Test error conditions
it('should handle edge cases', () => {
  expect(normalizeScore(5, 5, 5)).toBe(0.5);  // Same min/max
  expect(normalizeScore(-5, 0, 10)).toBe(0);  // Below min
});
```

**Testing with Mocked Time:**
- Not heavily used, but Vitest provides `vi.useFakeTimers()` if needed

**Testing React Components:**
- Use `@testing-library/react`: `render()`, `screen`, `fireEvent`, `waitFor()`
- Wrap components with providers as needed: `<BrowserRouter>{children}</BrowserRouter>`
- Query elements by role or text, avoid direct DOM queries
- Example from `tests/DesignGenerator.test.jsx`:
```javascript
const { render, screen, fireEvent, waitFor } = require('@testing-library/react');

render(
  <TestWrapper>
    <DesignGenerator />
  </TestWrapper>
);

const button = screen.getByRole('button');
fireEvent.click(button);
await waitFor(() => expect(...).toBe(...));
```

## Setup and Configuration

**Setup File:** `tests/setup.js`
- Imports Vitest globals
- Configures cleanup after each test
- Mocks environment variables
- Commented out: jest-dom matchers (module resolution issue noted)

**Environment Variables in Tests:**
```javascript
process.env.VITE_PROXY_URL = 'http://localhost:3001/api';
process.env.VITE_FRONTEND_AUTH_TOKEN = 'test-token';
process.env.VITE_USE_COUNCIL = 'false';
process.env.VITE_DEMO_MODE = 'false';
```

## Testing Best Practices Observed

1. **Descriptive Test Names:** Tests use "should..." pattern (e.g., "should detect stencil mode from user prompt")
2. **Single Responsibility:** Each test verifies one specific behavior
3. **Clear Arrange-Act-Assert:** Tests follow logical flow
4. **Mocking External Dependencies:** External API calls are mocked to isolate unit tests
5. **Edge Case Testing:** Tests include boundary conditions (empty arrays, missing values, etc.)

## Known Issues

1. **jest-dom matchers:** Import commented out in `tests/setup.js` due to module resolution issue
2. **No test npm scripts:** Tests must be run with Vitest CLI directly, not via `npm test`
3. **Inconsistent test location:** Mix of co-located and centralized test files may cause maintenance overhead
4. **Limited E2E coverage:** No E2E framework configured; system tested primarily through integration tests

---

*Testing analysis: 2026-01-31*
