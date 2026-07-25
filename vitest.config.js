import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    // Never discover test files inside agent worktrees or build output —
    // the overnight crew spawns worktrees under .claude/, and their stale
    // duplicate tests would otherwise pollute the main test run.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**', '.claude/**'],
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    // The council prompt-construction suites legitimately run 3-4s each and
    // tipped over the 5s default whenever the machine was busy (three
    // separate agents reported the same false failure in one afternoon). The
    // work is real, not hung — give it headroom rather than teaching people
    // to ignore red runs.
    testTimeout: 20000,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        'src/main.jsx'
      ]
    }
  },
});
