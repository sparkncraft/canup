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

describe('stripe status command', () => {
  test('shows connected status with masked key and webhook URL', async ({
    client,
    processMocks,
  }) => {
    client.stripeStatus.mockResolvedValue({
      connected: true,
      maskedKey: 'sk_test_...xxxx',
      webhookUrl: 'https://canup.link/hooks/stripe/app-1',
    });

    const { Command } = await import('commander');
    const { registerStripeStatusAction } =
      await import('../../../../src/cli/commands/stripe/status.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeStatusAction(stripe);

    await program.parseAsync(['stripe', 'status'], { from: 'user' });

    expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('Connected'));
    expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('sk_test_...xxxx'));
    expect(processMocks.log).toHaveBeenCalledWith(
      expect.stringContaining('https://canup.link/hooks/stripe/app-1'),
    );
  });

  test('shows not connected status with hint', async ({ client, output, processMocks }) => {
    client.stripeStatus.mockResolvedValue({ connected: false });

    const { Command } = await import('commander');
    const { registerStripeStatusAction } =
      await import('../../../../src/cli/commands/stripe/status.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeStatusAction(stripe);

    await program.parseAsync(['stripe', 'status'], { from: 'user' });

    expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('Not connected'));
    expect(output.hint).toHaveBeenCalledWith(expect.stringContaining('canup stripe connect'));
  });
});
