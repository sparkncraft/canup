import type { Command } from 'commander';
import { CanupClient } from '../../api-client.js';
import { requireProject } from '../../config/require-project.js';
import { info, hint, formatTable } from '../../ui/output.js';

export function registerSecretsListAction(secretsCommand: Command): void {
  secretsCommand
    .command('list')
    .description('List all secrets')
    .action(async () => {
      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      const secrets = await client.listSecrets(config.appId);

      if (secrets.length === 0) {
        info('No secrets found.');
        hint('Run `canup secrets set KEY` to add your first secret.');
        return;
      }

      const table = formatTable(
        ['Name', 'Value'],
        secrets.map((s) => [s.name, s.maskedValue]),
      );
      console.log(table);
    });
}
