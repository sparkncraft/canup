#!/usr/bin/env node
import { resolve } from 'node:path';
import { Command } from 'commander';
import { registerLoginCommand } from './commands/login.js';
import { registerLogoutCommand } from './commands/logout.js';
import { registerWhoamiCommand } from './commands/whoami.js';
import { registerInitCommand } from './commands/init.js';
import { registerPullCommand } from './commands/pull.js';
import { registerStatusCommand } from './commands/status.js';
import { registerActionsCommand } from './commands/actions/index.js';
import { registerSecretsCommand } from './commands/secrets/index.js';
import { registerDepsCommand } from './commands/deps/index.js';
import { registerStripeCommand } from './commands/stripe/index.js';

const program = new Command();

program
  .name('canup')
  .description('Canup CLI - Deploy and manage actions for Canva Apps')
  .version('0.1.0')
  .option('--cwd <path>', 'Run as if canup was started in <path>')
  .hook('preAction', () => {
    const opts = program.opts<{ cwd?: string }>();
    if (opts.cwd) {
      process.chdir(resolve(opts.cwd));
    }
  });

// Register commands
registerLoginCommand(program);
registerLogoutCommand(program);
registerWhoamiCommand(program);
registerInitCommand(program);
registerPullCommand(program);
registerStatusCommand(program);
registerActionsCommand(program);
registerSecretsCommand(program);
registerDepsCommand(program);
registerStripeCommand(program);

program.parse();
