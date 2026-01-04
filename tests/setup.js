/**
 * Test setup file
 * Configures testing environment
 */

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.VITE_PROXY_URL = 'http://localhost:3001/api';
process.env.VITE_FRONTEND_AUTH_TOKEN = 'test-token';
process.env.VITE_USE_COUNCIL = 'false';
process.env.VITE_DEMO_MODE = 'false';

