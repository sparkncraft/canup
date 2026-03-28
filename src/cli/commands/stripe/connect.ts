import type { Command } from 'commander';
import { CanupClient } from '../../api-client.js';
import { requireProject } from '../../config/require-project.js';
import { readHiddenInput, readStdinPipe } from '../../lib/input.js';
import { success, error } from '../../ui/output.js';
import { createSpinner } from '../../ui/spinner.js';

export function registerStripeConnectAction(stripeCommand: Command): void {
  stripeCommand
    .command('connect')
    .description('Connect a Stripe API key to your app')
    .option('--value <key>', 'Stripe API key (for CI/scripting)')
    .action(async (options: { value?: string }) => {
      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      let key: string;

      if (options.value !== undefined) {
        // Mode 1: --value flag (CI/scripting)
        key = options.value;
      } else if (!process.stdin.isTTY) {
        // Mode 2: Stdin pipe
        key = await readStdinPipe();
      } else {
        // Mode 3: Interactive hidden prompt
        key = await readHiddenInput('Enter Stripe API key: ');
      }

      if (!key) {
        error('Stripe API key cannot be empty.');
        process.exit(1);
        return;
      }

      const spin = createSpinner('Connecting Stripe...');

      try {
        await client.connectStripe(config.appId, key);
        spin.succeed('Stripe connected');
        success('Stripe connected successfully.');
      } catch (err) {
        spin.fail('Connection failed');
        const e = err as Error & { errorType?: string };

        if (e.errorType === 'STRIPE_KEY_INVALID') {
          error('Invalid Stripe API key. Check that you copied the full key.');
        } else if (e.errorType === 'STRIPE_PERMISSION_ERROR') {
          error(`Stripe key lacks required permissions: ${e.message}`);
        } else {
          error(e.message);
        }

        process.exit(1);
      }
    });
}
