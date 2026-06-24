import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  outDir: 'dist',
  format: 'esm',
  dts: false,
  platform: 'node',
  target: 'node20',
  clean: true,
});
