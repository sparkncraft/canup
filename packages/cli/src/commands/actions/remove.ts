import type { Command } from 'commander';
import { isCanupError } from '@canup/contracts';
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
        if (isCanupError(err) && err.code === 'ACTION_NOT_FOUND') {
          error(`Action not found: ${name}`);
          hint('Run `canup actions list` to see deployed actions.');
        } else {
          error(err instanceof Error ? err.message : String(err));
        }
        process.exit(1);
      }
    });
}
