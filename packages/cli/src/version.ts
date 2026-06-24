// CLI version, taken from package.json. The CLI is bundled by tsdown, so this
// import is resolved and inlined at build time — no runtime file read — and
// `resolveJsonModule` resolves it for typecheck and tests.

import { version } from '../package.json';

export const CLI_VERSION = version;

export const CLI_USER_AGENT = `canup-cli/${CLI_VERSION}`;
