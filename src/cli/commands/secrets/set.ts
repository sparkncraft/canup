import type { Command } from 'commander';
import { CanupClient } from '../../api-client.js';
import { requireProject } from '../../config/require-project.js';
import { readHiddenInput, readStdinPipe } from '../../lib/input.js';
import { success, error, hint } from '../../ui/output.js';

export function registerSecretsSetAction(secretsCommand: Command): void {
  secretsCommand
    .command('set <name>')
    .description('Set a secret value')
    .option('--value <value>', 'Secret value (for CI/scripting)')
    .action(async (name: string, options: { value?: string }) => {
      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      let value: string;

      if (options.value) {
        // Mode 1: --value flag (CI/scripting)
        value = options.value;
      } else if (!process.stdin.isTTY) {
        // Mode 2: Stdin pipe
        value = await readStdinPipe();
      } else {
        // Mode 3: Interactive hidden prompt
        value = await readHiddenInput('Enter value: ');
      }

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
