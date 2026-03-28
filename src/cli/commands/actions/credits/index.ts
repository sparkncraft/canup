import { Command } from 'commander';
import type { Command as CommandType } from 'commander';
import { registerCreditsSetAction } from './set.js';
import { registerCreditsShowAction } from './show.js';
import { registerCreditsDeleteAction } from './delete.js';

export function registerCreditsCommand(actionsCommand: CommandType): void {
  const credits = new Command('credits').description('Manage credit quotas for actions');

  registerCreditsSetAction(credits);
  registerCreditsShowAction(credits);
  registerCreditsDeleteAction(credits);

  actionsCommand.addCommand(credits);
}
