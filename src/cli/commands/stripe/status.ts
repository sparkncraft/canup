import type { Command } from 'commander';
import { requireClient } from '../../config/require-project.js';
import { error, hint, warn, label } from '../../ui/output.js';

export function registerStripeStatusAction(stripeCommand: Command): void {
  stripeCommand
    .command('status')
    .description('Show Stripe connection status')
    .action(async () => {
      const { config, client } = requireClient();

      try {
        const status = await client.stripeStatus(config.appId);

        if (status.state === 'not_connected') {
          console.log('Stripe: Not connected');
          hint('Run `canup stripe connect` to connect your Stripe account.');
          return;
        }

        console.log('Stripe: Connected');
        if (status.maskedKey) {
          label('API Key', status.maskedKey);
        }

        switch (status.state) {
          case 'healthy':
            label('Health', 'Healthy');
            break;
          case 'unknown':
            label('Health', 'Not checked yet');
            break;
          case 'key_invalid':
            warn('The stored API key was rejected by Stripe.');
            hint('Run `canup stripe connect` with a valid key to reconnect.');
            break;
          case 'webhook_broken':
            warn('Webhook delivery is impaired — subscription events may be delayed.');
            break;
        }

        if (status.lastCheckedAt) {
          label('Last checked', status.lastCheckedAt);
        }
      } catch (err) {
        const e = err as Error;
        error(e.message);
        process.exit(1);
      }
    });
}
