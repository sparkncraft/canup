import { defineConfig } from 'tsdown';

export default defineConfig([
  // UI components (what `import from 'canup'` resolves to)
  {
    entry: { 'ui/index': 'src/ui/index.ts' },
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
  // CLI binary
  {
    entry: { 'cli/index': 'src/cli/index.ts' },
    format: 'esm',
    dts: false,
    platform: 'node',
    target: 'node20',
  },
]);
