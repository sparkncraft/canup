import { Command } from 'commander';
import type { Command as CommandType } from 'commander';
import { registerStripeConnectAction } from './connect.js';
import { registerStripeStatusAction } from './status.js';
import { registerStripeDisconnectAction } from './disconnect.js';

export function registerStripeCommand(program: CommandType): void {
  const stripe = new Command('stripe').description('Manage Stripe integration');

  registerStripeConnectAction(stripe);
  registerStripeStatusAction(stripe);
  registerStripeDisconnectAction(stripe);

  program.addCommand(stripe);
}
