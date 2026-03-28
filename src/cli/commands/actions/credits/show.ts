import type { Command } from 'commander';
import { CanupClient } from '../../../api-client.js';
import { requireProject } from '../../../config/require-project.js';
import { info, label, error } from '../../../ui/output.js';

export function registerCreditsShowAction(creditsCommand: Command): void {
  creditsCommand
    .command('show <slug>')
    .description('Show credit config for an action')
    .action(async (slug: string) => {
      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      try {
        const result = await client.getCreditConfig(config.appId, slug);

        if (!result) {
          info('No credit config — action is free');
          return;
        }

        label('Action', slug);
        label('Quota', String(result.quota));
        label('Interval', result.interval);
        label('Plan', result.plan ?? 'free');
      } catch (err) {
        error((err as Error).message);
        process.exit(1);
      }
    });
}
