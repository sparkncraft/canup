import type { Command } from 'commander';
import { requireClient } from '../../config/require-project.js';
import { success, error, hint } from '../../ui/output.js';

export function registerActionsDeleteAction(actionsCommand: Command): void {
  actionsCommand
    .command('delete <name>')
    .description('Delete an action')
    .action(async (name: string) => {
      const { config, client } = requireClient();

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
