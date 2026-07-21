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
