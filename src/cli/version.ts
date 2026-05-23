// CLI version, resolved at boot from the bundled package.json.
//
// `tsdown` writes the CLI bundle to `dist/cli/index.js`; the published
// package ships package.json at `dist/../package.json` (the npm install
// root). `new URL('../../package.json', import.meta.url)` resolves to that
// same file in both `dist/cli/index.js` (production) and
// `src/cli/version.ts` (tests / tsx via `node --import`).

import { readFileSync } from 'node:fs';
import type { PackageJson } from 'type-fest';

const pkg = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'),
) as PackageJson;

export const CLI_VERSION = pkg.version ?? '0.0.0';

export const CLI_USER_AGENT = `canup-cli/${CLI_VERSION}`;
