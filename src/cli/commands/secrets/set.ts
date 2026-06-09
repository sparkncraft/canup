import type { Command } from 'commander';
import { requireClient } from '../../config/require-project.js';
import { readSecretInput } from '../../lib/input.js';
import { success, error, hint } from '../../ui/output.js';

export function registerSecretsSetAction(secretsCommand: Command): void {
  secretsCommand
    .command('set <name>')
    .description('Set a secret value')
    .option('--value <value>', 'Secret value (for CI/scripting)')
    .action(async (name: string, options: { value?: string }) => {
      const { config, client } = requireClient();

      const value = await readSecretInput(options.value, { prompt: 'Enter value: ' });

      if (!value) {
        error('Secret value cannot be empty');
        process.exit(1);
      }

      try {
        const result = await client.setSecret(config.appId, name, value);

        if (result.created) {
          success(`Secret ${name} set and synced.`);
        } else {
          success(`Secret ${name} updated and synced.`);
        }

        if (!result.synced) {
          hint('Warning: Lambda sync failed. Secret will be synced on next operation.');
        }
      } catch (err) {
        const e = err as Error;
        error(e.message);
        process.exit(1);
      }
    });
}
