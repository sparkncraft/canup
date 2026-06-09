import type { Command } from 'commander';
import { requireClient } from '../../config/require-project.js';
import { info, hint, formatTable } from '../../ui/output.js';

export function registerActionsListAction(actionsCommand: Command): void {
  actionsCommand
    .command('list')
    .description('List all actions')
    .action(async () => {
      const { config, client } = requireClient();

      const actions = await client.listActions(config.appId);

      if (actions.length === 0) {
        info('No actions found.');
        hint('Run `canup actions deploy <file>` to deploy your first action.');
        return;
      }

      const table = formatTable(
        ['Name', 'Language', 'Deployed', 'Updated'],
        actions.map((a) => [
          a.slug,
          a.language,
          a.deployed ? 'yes' : 'no',
          new Date(a.updatedAt).toLocaleDateString(),
        ]),
      );
      console.log(table);
    });
}
