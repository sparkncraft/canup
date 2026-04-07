import type { Command } from 'commander';
import { clearToken } from '../auth/token-store.js';
import { success } from '../ui/output.js';

/**
 * Register the `logout` command.
 *
 * Revokes the local session by clearing the stored token.
 */
export function registerLogoutCommand(program: Command): void {
  program
    .command('logout')
    .description('Log out of CanUp (clear stored session)')
    .action(() => {
      clearToken();
      success('Logged out.');
    });
}
