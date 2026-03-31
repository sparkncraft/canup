import { describe, expect, vi } from 'vitest';
import { test, client, output, project } from '../../../fixtures/cli.js';

// Mock require-project
vi.mock('../../../../src/cli/config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

// Mock api-client
vi.mock('../../../../src/cli/api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

// Mock output
vi.mock('../../../../src/cli/ui/output.js', () => output);

describe('stripe disconnect command', () => {
  test('disconnects with --yes flag (skips confirmation)', async ({ client, output }) => {
    client.disconnectStripe.mockResolvedValue({ disconnected: true });

    const { Command } = await import('commander');
    const { registerStripeDisconnectAction } =
      await import('../../../../src/cli/commands/stripe/disconnect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeDisconnectAction(stripe);

    await program.parseAsync(['stripe', 'disconnect', '--yes'], { from: 'user' });

    expect(client.disconnectStripe).toHaveBeenCalledWith('test-app-id');
    expect(output.success).toHaveBeenCalledWith('Stripe disconnected. Webhook endpoint removed.');
  });

  test('handles API error on disconnect', async ({ client, output, processMocks }) => {
    client.disconnectStripe.mockRejectedValue(new Error('Not connected'));

    const { Command } = await import('commander');
    const { registerStripeDisconnectAction } =
      await import('../../../../src/cli/commands/stripe/disconnect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeDisconnectAction(stripe);

    await program.parseAsync(['stripe', 'disconnect', '--yes'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Not connected');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
