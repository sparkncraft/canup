import type { Command } from 'commander';
import { clearCredentials, loadCredentials } from '../auth/token-store.js';
import { CanupClient } from '../api-client.js';
import { success } from '../ui/output.js';

const REVOKE_TIMEOUT_MS = 1_000;

/**
 * Register the `logout` command.
 *
 * Best-effort: try to revoke the server-side key with a short timeout, then
 * unconditionally clear the local credentials file. Logout always succeeds
 * locally — a stale or unreachable server cannot keep the user signed in.
 */
export function registerLogoutCommand(program: Command): void {
  program
    .command('logout')
    .description('Log out of CanUp (revoke and clear stored credentials)')
    .action(async () => {
      const credentials = loadCredentials();
      if (credentials) {
        try {
          const client = new CanupClient({ token: credentials.userKey });
          const controller = new AbortController();
          const timer = setTimeout(() => {
            controller.abort();
          }, REVOKE_TIMEOUT_MS);
          try {
            await client.revokeUserKey(credentials.keyId, { signal: controller.signal });
          } finally {
            clearTimeout(timer);
          }
        } catch {
          // Best-effort revoke: swallow network errors, expired-key errors,
          // and AbortError. Local clear still happens.
        }
      }
      clearCredentials();
      success('Logged out.');
    });
}
