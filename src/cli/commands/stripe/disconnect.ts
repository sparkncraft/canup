import * as readline from 'node:readline';
import type { Command } from 'commander';
import { CanupClient } from '../../api-client.js';
import { requireProject } from '../../config/require-project.js';
import { success, error } from '../../ui/output.js';

/**
 * Prompt user for confirmation via readline.
 */
function askConfirmation(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export function registerStripeDisconnectAction(stripeCommand: Command): void {
  stripeCommand
    .command('disconnect')
    .description('Disconnect Stripe from your app')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (options: { yes?: boolean }) => {
      const { config, apiKey } = requireProject();

      if (!options.yes && process.stdin.isTTY) {
        const confirmed = await askConfirmation(
          'Are you sure? This will remove Stripe integration. (y/N): ',
        );
        if (!confirmed) {
          return;
        }
      }

      const client = new CanupClient({ token: apiKey });

      try {
        await client.disconnectStripe(config.appId);
        success('Stripe disconnected. Webhook endpoint removed.');
      } catch (err) {
        const e = err as Error;
        error(e.message);
        process.exit(1);
      }
    });
}
