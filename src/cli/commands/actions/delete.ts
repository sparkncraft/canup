import type { Command } from 'commander';
import { CanupClient } from '../../api-client.js';
import { requireProject } from '../../config/require-project.js';
import { success, error, hint } from '../../ui/output.js';

export function registerActionsDeleteAction(actionsCommand: Command): void {
  actionsCommand
    .command('delete <name>')
    .description('Delete an action')
    .action(async (name: string) => {
      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      try {
        await client.deleteAction(config.appId, name);
        success(`Deleted ${name}`);
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        if (e.statusCode === 404) {
          error(`Action not found: ${name}`);
          hint('Run `canup actions list` to see available actions.');
        } else {
          error(e.message);
        }
        process.exit(1);
      }
    });
}
