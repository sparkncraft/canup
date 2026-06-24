import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'ui',
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./test/setup/ui.ts'],
    mockReset: true,
    unstubGlobals: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/index.ts'],
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
