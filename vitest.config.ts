import { defineConfig, defineProject } from 'vitest/config';

const shared = {
  mockReset: true,
  unstubGlobals: true,
  unstubEnvs: true,
} as const;

export default defineConfig({
  test: {
    projects: [
      defineProject({
        test: {
          ...shared,
          name: 'cli',
          include: ['packages/cli/src/**/*.test.ts'],
        },
      }),
      defineProject({
        test: {
          ...shared,
          name: 'ui',
          environment: 'jsdom',
          include: ['packages/ui/src/**/*.test.ts', 'packages/ui/src/**/*.test.tsx'],
          setupFiles: ['packages/ui/test/setup/ui.ts'],
        },
      }),
    ],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/index.ts', '**/types.ts'],
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
