import type { Command } from 'commander';
import { performLogin } from '../auth/perform-login.js';

/**
 * Register the `login` command.
 *
 * Drives the loopback OAuth flow against the platform's `/cli/login` route.
 * `performLogin` prints its own success message — this wrapper only handles
 * the failure surface.
 */
export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Log in to CanUp via GitHub')
    .action(async () => {
      try {
        await performLogin();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        if (message.includes('timed out')) {
          console.error('Login timed out. Please try again.');
        } else {
          console.error(`Login failed: ${message}`);
        }

        process.exit(1);
      }
    });
}
