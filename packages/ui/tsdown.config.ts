import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  outDir: 'dist',
  format: 'esm',
  // eager: full tsc-driven declarations so the re-exported @canup/contracts types
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
});
