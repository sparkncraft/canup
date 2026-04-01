import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '#test': path.resolve(import.meta.dirname, 'test'),
    },
  },
  test: {
    mockReset: true,
    unstubGlobals: true,
    unstubEnvs: true,
    setupFiles: ['test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/index.ts'],
      reporter: ['text', 'json-summary', 'json'],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
});
