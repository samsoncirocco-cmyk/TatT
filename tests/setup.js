/**
 * Test setup file
 * Configures testing environment
 */

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
// TODO: Fix jest-dom module resolution issue
// import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.VITE_PROXY_URL = 'http://localhost:3001/api';
process.env.VITE_FRONTEND_AUTH_TOKEN = 'test-token';
process.env.VITE_USE_COUNCIL = 'false';
process.env.VITE_DEMO_MODE = 'false';
process.env.NEXT_PUBLIC_COUNCIL_DEMO_MODE = 'true';
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id';

const storage = new Map();
const localStorageMock = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(String(key), String(value)),
  removeItem: (key) => storage.delete(String(key)),
  clear: () => storage.clear(),
  key: (index) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size;
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
}
