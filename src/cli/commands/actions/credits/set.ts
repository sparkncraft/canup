import type { Command } from 'commander';
import { CanupClient } from '../../../api-client.js';
import { requireProject } from '../../../config/require-project.js';
import { success, error } from '../../../ui/output.js';

const VALID_INTERVALS = ['daily', 'weekly', 'monthly', 'lifetime'];

export function registerCreditsSetAction(creditsCommand: Command): void {
  creditsCommand
    .command('set <slug>')
    .description('Set credit quota for an action')
    .requiredOption('--quota <number>', 'Credit quota per period')
    .option('--interval <interval>', 'Reset interval (daily|weekly|monthly|lifetime)', 'lifetime')
    .action(async (slug: string, options: { quota: string; interval: string }) => {
      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      const quota = parseInt(options.quota, 10);
      if (isNaN(quota) || quota < 1) {
        error('Quota must be a positive integer');
        process.exit(1);
      }

      if (!VALID_INTERVALS.includes(options.interval)) {
        error(
          `Invalid interval "${options.interval}". Must be one of: ${VALID_INTERVALS.join(', ')}`,
        );
        process.exit(1);
      }

      try {
        await client.setCreditConfig(config.appId, slug, quota, options.interval);
        const intervalLabel =
          options.interval === 'lifetime' ? 'lifetime total' : `per ${options.interval}`;
        success(`Credits set for ${slug}: ${quota} ${intervalLabel}`);
      } catch (err) {
        error((err as Error).message);
        process.exit(1);
      }
    });
}
