import type { Command } from 'commander';
import { requireClient } from '../../config/require-project.js';
import { isCanupError } from '@canup/contracts';
import { readSecretInput } from '../../lib/input.js';
import { success, error } from '../../ui/output.js';
import { createSpinner } from '../../ui/spinner.js';

export function registerStripeConnectAction(stripeCommand: Command): void {
  stripeCommand
    .command('connect')
    .description('Connect a Stripe API key to your app')
    .option('--value <key>', 'Stripe API key (for CI/scripting)')
    .action(async (options: { value?: string }) => {
      const { config, client } = requireClient();

      const key = await readSecretInput(options.value, { prompt: 'Enter Stripe API key: ' });

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

        if (isCanupError(err) && err.code === 'STRIPE_KEY_INVALID') {
          error('Invalid Stripe API key. Check that you copied the full key.');
        } else if (isCanupError(err) && err.code === 'STRIPE_PERMISSION_ERROR') {
          error(`Stripe key lacks required permissions: ${err.message}`);
        } else {
          error(err instanceof Error ? err.message : String(err));
        }

        process.exit(1);
      }
    });
}
