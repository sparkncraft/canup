import type { Command } from 'commander';
import { CanupClient } from '../../api-client.js';
import { requireProject } from '../../config/require-project.js';
import { error, hint } from '../../ui/output.js';

export function registerStripeStatusAction(stripeCommand: Command): void {
  stripeCommand
    .command('status')
    .description('Show Stripe connection status')
    .action(async () => {
      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      try {
        const result = await client.stripeStatus(config.appId);

        if (result.connected) {
          console.log(`Stripe: Connected`);
          if (result.maskedKey) {
            console.log(`API Key: ${result.maskedKey}`);
          }
          if (result.webhookUrl) {
            console.log(`Webhook: ${result.webhookUrl}`);
          }
        } else {
          console.log('Stripe: Not connected');
          hint('Run `canup stripe connect` to connect your Stripe account.');
        }
      } catch (err) {
        const e = err as Error;
        error(e.message);
        process.exit(1);
      }
    });
}
