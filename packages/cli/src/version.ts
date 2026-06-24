// CLI version, resolved at boot from the package's own package.json.
//
// `tsdown` writes the bundle to `dist/index.mjs`; the published package ships
// package.json one level up at the install root. `new URL('../package.json',
// import.meta.url)` resolves to that same file in both `dist/index.mjs`
// (production) and `src/version.ts` (tests via vitest), since each sits one
// directory below the package root.

import { readFileSync } from 'node:fs';
import type { PackageJson } from 'type-fest';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
) as PackageJson;

export const CLI_VERSION = pkg.version ?? '0.0.0';

export const CLI_USER_AGENT = `canup-cli/${CLI_VERSION}`;
