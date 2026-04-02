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
          include: ['src/cli/**/*.test.ts'],
        },
      }),
      defineProject({
        test: {
          ...shared,
          name: 'ui',
          environment: 'jsdom',
          include: ['src/ui/**/*.test.ts', 'src/ui/**/*.test.tsx'],
          setupFiles: ['test/setup/ui.ts'],
        },
      }),
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/index.ts', 'src/**/types.ts'],
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
