import { Command } from 'commander';
import type { Command as CommandType } from 'commander';
import { registerDepsAddAction } from './add.js';
import { registerDepsRemoveAction } from './remove.js';
import { registerDepsListAction } from './list.js';
import { registerDepsClearAction } from './clear.js';

export function registerDepsCommand(program: CommandType): void {
  const deps = new Command('deps').description('Manage dependencies (pip/npm packages)');

  registerDepsAddAction(deps);
  registerDepsRemoveAction(deps);
  registerDepsListAction(deps);
  registerDepsClearAction(deps);

  program.addCommand(deps);
}
