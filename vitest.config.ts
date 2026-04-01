import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '#test': path.resolve(import.meta.dirname, 'test'),
    },
  },
  test: {
    clearMocks: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/index.ts'],
      reporter: ['text', 'json-summary', 'json'],
      thresholds: {
        autoUpdate: true,
        statements: 75.47,
        branches: 68.53,
        functions: 68,
        lines: 75.76,
      },
    },
  },
});
