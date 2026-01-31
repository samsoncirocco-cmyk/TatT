# Testing Patterns

**Analysis Date:** 2026-01-31

## Test Framework

**Runner:**
- Vitest 1.x (configured in `vitest.config.js`)
- Config: `/Users/ciroccofam/conductor/workspaces/tatt-v1/manama-next/vitest.config.js`

**Assertion Library:**
- Vitest built-in (expect)
- Testing Library for React components

**Run Commands:**
```bash
npm test                 # Run all tests (inferred from standard setup)
npm run test:watch       # Watch mode (standard Vitest)
npm run test:coverage    # Coverage report (standard Vitest)
```

## Test File Organization

**Location:**
- Co-located in `__tests__` directories: `src/services/__tests__/councilService.test.js`
- Co-located alongside source: `src/config/councilSkillPack.test.js`, `src/services/councilService.test.js`
- Dedicated test directory: `tests/` (legacy tests for integration)

**Naming:**
- `*.test.js` or `*.test.ts` suffix
- Same base name as file under test

**Structure:**
```
src/
├── services/
│   ├── councilService.js
│   ├── councilService.test.js
│   ├── multiLayerService.test.js
│   └── __tests__/
│       └── councilService.test.js
├── config/
│   ├── councilSkillPack.js
│   └── councilSkillPack.test.js
tests/
├── setup.js
├── hybridMatching.test.js
├── stencilService.test.js
└── DesignGenerator.test.jsx
```

## Test Structure

**Suite Organization:**
```javascript
import { describe, test, expect } from 'vitest';

describe('Character Database', () => {
  test('should build character map with primary names', () => {
    const map = buildCharacterMap();

    expect(map['goku']).toBeDefined();
    expect(map['goku']).toContain('spiky black hair');
    expect(map['goku']).toContain('orange gi');
  });
});

describe('Character Enhancement Logic', () => {
  test('should detect single character in prompt', () => {
    // ...
  });
});
```

**Patterns:**
- `describe` blocks for logical grouping by feature/module
- `test` or `it` for individual test cases
- Nested `describe` blocks for sub-features
- Descriptive test names starting with "should"
- Arrange-Act-Assert structure

**Assertion Patterns:**
```javascript
// Existence checks
expect(map['goku']).toBeDefined();
expect(map['goku']).toBeUndefined();

// Value comparisons
expect(flow).toContain('vertical flow');
expect(matches.length).toBe(2);
expect(matches.length).toBeGreaterThan(0);

// Array/object operations
expect(Array.isArray(keywords)).toBe(true);
expect(names).toContain('goku');
expect(validation.valid).toBe(true);

// Pattern matching
expect(shield).toMatch(/:\s*1\.\d+/);

// Performance assertions
expect(endTime - startTime).toBeLessThan(10);
```

## Mocking

**Framework:** Vitest built-in mocking (`vi`)

**Patterns:**
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock modules
vi.mock('./councilService');

// Mock timers
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

**What to Mock:**
- External API calls
- File system operations
- Browser APIs (localStorage, fetch)
- Time-dependent operations

**What NOT to Mock:**
- Pure functions
- Simple utilities
- Data transformations
- Business logic under test

## Fixtures and Factories

**Test Data:**
```javascript
// Inline test data
const testPrompt = 'goku and vegeta fighting';

// Configuration-based fixtures
const expectedBodyParts = ['forearm', 'shin', 'chest', 'back', 'shoulder', 'hip'];

// Pattern: Build test objects in-place
const map = buildCharacterMap();
```

**Location:**
- No centralized fixtures directory
- Test data defined inline or in test file constants
- Shared test utilities in `tests/setup.js`

## Coverage

**Requirements:** Not strictly enforced (no coverage thresholds in config)

**Configuration:**
```javascript
// From vitest.config.js
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

**View Coverage:**
```bash
npm run test:coverage  # Generates text, JSON, and HTML reports
```

## Test Types

**Unit Tests:**
- Service function tests (e.g., `src/services/__tests__/councilService.test.js`)
- Utility function tests
- Configuration validation tests (e.g., `src/config/councilSkillPack.test.js`)
- Isolated component logic

**Integration Tests:**
- Multi-step workflows (e.g., `tests/hybridMatching.test.js`)
- API route tests
- Component rendering with context

**E2E Tests:**
- Not currently implemented
- No Playwright or Cypress detected

## Common Patterns

**Async Testing:**
```javascript
test('should handle async operations', async () => {
  const result = await enhancePrompt({
    userIdea: 'test',
    style: 'traditional'
  });

  expect(result).toBeDefined();
});
```

**Error Testing:**
```javascript
test('should throw error for invalid design', () => {
  expect(() => {
    saveDesign(null, {}, {});
  }).toThrow('Invalid design');
});
```

**Performance Testing:**
```javascript
test('character map building should be fast', () => {
  const startTime = performance.now();
  buildCharacterMap();
  const endTime = performance.now();

  expect(endTime - startTime).toBeLessThan(10); // <10ms
});
```

**Data Validation Testing:**
```javascript
describe('Structure Validation', () => {
  it('should have all required top-level keys', () => {
    expect(COUNCIL_SKILL_PACK).toHaveProperty('negativeShield');
    expect(COUNCIL_SKILL_PACK).toHaveProperty('anatomicalFlow');
  });

  it('should have non-empty flow descriptions for all body parts', () => {
    expectedBodyParts.forEach(bodyPart => {
      const flow = COUNCIL_SKILL_PACK.anatomicalFlow[bodyPart];
      expect(typeof flow).toBe('string');
      expect(flow.length).toBeGreaterThan(0);
    });
  });
});
```

**Regex Pattern Testing:**
```javascript
test('should detect character names with word boundaries', () => {
  const testPrompt = 'goku vs vegeta';
  const names = getAllCharacterNames();

  const matches = names.filter(name =>
    new RegExp(`\\b${name}\\b`, 'i').test(testPrompt)
  );

  expect(matches.length).toBe(2);
});
```

## Setup and Teardown

**Global Setup:**
```javascript
// tests/setup.js
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.VITE_PROXY_URL = 'http://localhost:3001/api';
process.env.VITE_FRONTEND_AUTH_TOKEN = 'test-token';
```

**Per-Test Setup:**
```javascript
import { beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
  // Reset state
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup
  vi.restoreAllMocks();
});
```

## Test Organization Best Practices

**Grouping:**
- One `describe` per feature area
- Nested `describe` for sub-features
- Related assertions grouped together

**Naming:**
- Test names describe expected behavior: "should [action] [expected result]"
- Specific context in nested describes
- Use "when" or "with" for conditional scenarios

**Example Structure:**
```javascript
describe('Multi-Character Detection', () => {
  test('should detect multi-character scene (2 characters)', () => {
    // ...
  });

  test('should NOT trigger multi-character for single character', () => {
    // ...
  });

  test('should handle complex multi-character prompts', () => {
    // ...
  });

  test('should not count duplicates', () => {
    // ...
  });
});
```

## Current Test Coverage

**Well-Tested Areas:**
- Character database and enhancement (`src/services/__tests__/councilService.test.js`)
- Council skill pack configuration (`src/config/councilSkillPack.test.js`)
- Version service (`src/features/generate/services/versionService.test.js`)

**Test Gaps:**
- API routes (no tests detected)
- React components (minimal component tests)
- Hooks (no hook tests detected)
- Multi-layer service edge cases

---

*Testing analysis: 2026-01-31*
