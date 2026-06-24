import { defineConfig } from 'tsdown';

export default defineConfig([
  // @canup/ui — browser React components.
  {
    entry: { index: 'packages/ui/src/index.ts' },
    outDir: 'packages/ui/dist',
    format: 'esm',
    // eager: full tsc-driven declarations so the re-exported @canup/types types
    // (e.g. CreditBalance) inline cleanly into the bundled .d.ts.
    dts: { eager: true },
    platform: 'browser',
    deps: {
      neverBundle: [
        'react',
        'react/jsx-runtime',
        'react-intl',
        '@canva/app-ui-kit',
        '@canva/platform',
        '@canva/user',
      ],
    },
    clean: true,
  },
  // @canup/cli — Node binary.
  {
    entry: { index: 'packages/cli/src/index.ts' },
    outDir: 'packages/cli/dist',
    format: 'esm',
    dts: false,
    platform: 'node',
    target: 'node20',
    clean: true,
  },
]);
