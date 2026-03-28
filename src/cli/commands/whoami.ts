import type { Command } from 'commander';
import { loadToken } from '../auth/token-store.js';
import { CanupClient } from '../api-client.js';

/**
 * Register the `whoami` command.
 *
 * Loads the stored session token and calls GET /v1/me to display
 * the current user's identity.
 */
export function registerWhoamiCommand(program: Command): void {
  program
    .command('whoami')
    .description('Show the currently logged-in user')
    .action(async () => {
      const token = loadToken();

      if (!token) {
        console.error('Not logged in. Run `canup login` first.');
        process.exit(1);
      }

      try {
        const client = new CanupClient({ token });
        const me = await client.getMe();

        console.log(`Name:         ${me.name ?? '(not set)'}`);
        console.log(`Email:        ${me.email}`);
        console.log(`Member since: ${new Date(me.createdAt).toLocaleDateString()}`);
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;

        if (statusCode === 401) {
          console.error('Session expired. Run `canup login` to re-authenticate.');
          process.exit(1);
        }

        const message = err instanceof Error ? err.message : String(err);
        console.error(`Failed to get user info: ${message}`);
        process.exit(1);
      }
    });
}
