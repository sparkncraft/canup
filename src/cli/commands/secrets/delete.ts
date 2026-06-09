import type { Command } from 'commander';
import { requireClient } from '../../config/require-project.js';
import { success, error, hint } from '../../ui/output.js';

export function registerSecretsDeleteAction(secretsCommand: Command): void {
  secretsCommand
    .command('delete <name>')
    .description('Delete a secret')
    .action(async (name: string) => {
      const { config, client } = requireClient();

      try {
        const result = await client.deleteSecret(config.appId, name);

        success(`Deleted ${name}`);

        if (!result.synced) {
          hint('Warning: Lambda sync failed. Changes will be synced on next operation.');
        }
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        if (e.statusCode === 404) {
          error(`Secret "${name}" not found.`);
        } else {
          error(e.message);
        }
        process.exit(1);
      }
    });
}
