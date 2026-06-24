import { describe, expect, vi } from 'vitest';
import { test, client, output, project } from '#test/fixtures.js';

// Mock require-project
vi.mock('../../config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
  requireClient: vi.fn(() => ({ ...project, client })),
}));

// Mock api-client
vi.mock('../../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

// Mock output
vi.mock('../../ui/output.js', () => output);

describe('stripe status command', () => {
  test('shows connected status with masked key and health', async ({
    client,
    output,
    processMocks,
  }) => {
    client.stripeStatus.mockResolvedValue({
      state: 'healthy',
      maskedKey: 'sk_test_...xxxx',
      lastCheckedAt: '2026-06-01T00:00:00.000Z',
    });

    const { Command } = await import('commander');
    const { registerStripeStatusAction } = await import('../../commands/stripe/status.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeStatusAction(stripe);

    await program.parseAsync(['stripe', 'status'], { from: 'user' });

    expect(processMocks.log).toHaveBeenCalledWith('Stripe: Connected');
    expect(output.label).toHaveBeenCalledWith('API Key', 'sk_test_...xxxx');
    expect(output.label).toHaveBeenCalledWith('Health', 'Healthy');
    expect(output.label).toHaveBeenCalledWith('Last checked', '2026-06-01T00:00:00.000Z');
  });

  test('shows not connected status with hint', async ({ client, output, processMocks }) => {
    client.stripeStatus.mockResolvedValue({
      state: 'not_connected',
      maskedKey: null,
      lastCheckedAt: null,
    });

    const { Command } = await import('commander');
    const { registerStripeStatusAction } = await import('../../commands/stripe/status.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeStatusAction(stripe);

    await program.parseAsync(['stripe', 'status'], { from: 'user' });

    expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('Not connected'));
    expect(output.hint).toHaveBeenCalledWith(expect.stringContaining('canup stripe connect'));
  });

  test('warns and prompts to reconnect when the stored key is invalid', async ({
    client,
    output,
    processMocks,
  }) => {
    client.stripeStatus.mockResolvedValue({
      state: 'key_invalid',
      maskedKey: null,
      lastCheckedAt: '2026-06-01T00:00:00.000Z',
    });

    const { Command } = await import('commander');
    const { registerStripeStatusAction } = await import('../../commands/stripe/status.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeStatusAction(stripe);

    await program.parseAsync(['stripe', 'status'], { from: 'user' });

    expect(processMocks.log).toHaveBeenCalledWith('Stripe: Connected');
    expect(output.warn).toHaveBeenCalledWith(expect.stringContaining('rejected'));
    expect(output.hint).toHaveBeenCalledWith(expect.stringContaining('canup stripe connect'));
  });

  test('handles API error', async ({ client, output, processMocks }) => {
    client.stripeStatus.mockRejectedValue(new Error('Network timeout'));

    const { Command } = await import('commander');
    const { registerStripeStatusAction } = await import('../../commands/stripe/status.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeStatusAction(stripe);

    await program.parseAsync(['stripe', 'status'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Network timeout');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
