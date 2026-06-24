import { Command } from 'commander';
import type { Command as CommandType } from 'commander';
import { registerSecretsSetAction } from './set.js';
import { registerSecretsListAction } from './list.js';
import { registerSecretsDeleteAction } from './delete.js';

export function registerSecretsCommand(program: CommandType): void {
  const secrets = new Command('secrets').description('Manage secrets (environment variables)');

  registerSecretsSetAction(secrets);
  registerSecretsListAction(secrets);
  registerSecretsDeleteAction(secrets);

  program.addCommand(secrets);
}
