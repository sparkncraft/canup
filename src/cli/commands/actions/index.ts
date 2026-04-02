import { Command } from 'commander';
import type { Command as CommandType } from 'commander';
import { registerActionsNewAction } from './new.js';
import { registerActionsDeployAction } from './deploy.js';
import { registerActionsListAction } from './list.js';
import { registerActionsDeleteAction } from './delete.js';
import { registerActionsTestAction } from './test.js';
import { registerActionsRunAction } from './run.js';
import { registerActionsLogsAction } from './logs.js';
import { registerActionsRemoveAction } from './remove.js';

export function registerActionsCommand(program: CommandType): void {
  const actions = new Command('actions').description('Manage actions');

  registerActionsNewAction(actions);
  registerActionsTestAction(actions);
  registerActionsDeployAction(actions);
  registerActionsRunAction(actions);
  registerActionsListAction(actions);
  registerActionsLogsAction(actions);
  registerActionsRemoveAction(actions);
  registerActionsDeleteAction(actions); // Backward compat (same as remove)

  program.addCommand(actions);
}
