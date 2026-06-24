import type { Command } from 'commander';
import { requireClient } from '../../config/require-project.js';
import { success, error, hint } from '../../ui/output.js';

export function registerActionsRemoveAction(actionsCommand: Command): void {
  actionsCommand
    .command('remove <name>')
    .description('Remove a deployed action')
    .action(async (name: string) => {
      const { config, client } = requireClient();

      try {
        await client.deleteAction(config.appId, name);
        success(`Removed ${name}`);
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        if (e.statusCode === 404) {
          error(`Action not found: ${name}`);
          hint('Run `canup actions list` to see deployed actions.');
        } else {
          error(e.message);
        }
        process.exit(1);
      }
    });
}
