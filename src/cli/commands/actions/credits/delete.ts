import type { Command } from 'commander';
import { CanupClient } from '../../../api-client.js';
import { requireProject } from '../../../config/require-project.js';
import { success, error } from '../../../ui/output.js';

export function registerCreditsDeleteAction(creditsCommand: Command): void {
  creditsCommand
    .command('delete <slug>')
    .description('Remove credit config for an action (action becomes free)')
    .action(async (slug: string) => {
      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      try {
        await client.deleteCreditConfig(config.appId, slug);
        success(`Credit config removed for ${slug} — action is now free`);
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        if (e.statusCode === 404) {
          error(`No credit config found for "${slug}"`);
        } else {
          error(e.message);
        }
        process.exit(1);
      }
    });
}
