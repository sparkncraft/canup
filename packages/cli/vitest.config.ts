import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'cli',
    include: ['src/**/*.test.ts'],
    mockReset: true,
    unstubGlobals: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts'],
      reporter: ['text', 'json-summary', 'json'],
      thresholds: {
        statements: 95,
        branches: 85,
        functions: 95,
        lines: 95,
      },
    },
  },
});
