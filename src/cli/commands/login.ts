import type { Command } from 'commander';
import { performLogin } from '../auth/perform-login.js';

/**
 * Register the `login` command.
 *
 * Flow:
 * 1. Start a local callback server on 127.0.0.1 with an OS-assigned port
 * 2. Call the API to get the GitHub authorization URL
 * 3. Open the URL in the default browser
 * 4. Wait for the callback with the session token
 * 5. Save the token to ~/.canup/credentials
 */
export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Log in to CanUp via GitHub')
    .action(async () => {
      try {
        await performLogin();
        console.log('Logged in successfully!');
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
