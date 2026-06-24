import { describe, expect, vi } from 'vitest';
import { test, client, output, project, spinner } from '#test/fixtures.js';
import { ApiError } from '../../errors.js';

const { mockReadSecretInput } = vi.hoisted(() => ({ mockReadSecretInput: vi.fn() }));

vi.mock('../../config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
  requireClient: vi.fn(() => ({ ...project, client })),
}));
vi.mock('../../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));
vi.mock('../../ui/output.js', () => output);
vi.mock('../../ui/spinner.js', () => spinner);
vi.mock('../../lib/input.js', () => ({ readSecretInput: mockReadSecretInput }));

describe('stripe connect command', () => {
  test('connects stripe with --value flag', async ({ client, output }) => {
    mockReadSecretInput.mockResolvedValue('sk_test_xxx');
    client.connectStripe.mockResolvedValue({ connected: true });

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect', '--value', 'sk_test_xxx'], { from: 'user' });

    expect(mockReadSecretInput).toHaveBeenCalledWith('sk_test_xxx', {
      prompt: 'Enter Stripe API key: ',
    });
    expect(client.connectStripe).toHaveBeenCalledWith('test-app-id', 'sk_test_xxx');
    expect(output.success).toHaveBeenCalledWith('Stripe connected successfully.');
  });

  test('acquires the key via readSecretInput when no --value flag', async ({ client }) => {
    mockReadSecretInput.mockResolvedValue('sk_test_acquired');
    client.connectStripe.mockResolvedValue({ connected: true });

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect'], { from: 'user' });

    expect(mockReadSecretInput).toHaveBeenCalledWith(undefined, {
      prompt: 'Enter Stripe API key: ',
    });
    expect(client.connectStripe).toHaveBeenCalledWith('test-app-id', 'sk_test_acquired');
  });

  test('shows error for invalid Stripe key', async ({ client, output, processMocks }) => {
    mockReadSecretInput.mockResolvedValue('sk_bad');
    client.connectStripe.mockRejectedValue(
      new ApiError(400, 'STRIPE_KEY_INVALID', 'Invalid API key'),
    );

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect', '--value', 'sk_bad'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith(
      'Invalid Stripe API key. Check that you copied the full key.',
    );
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('shows error for permission issue', async ({ client, output, processMocks }) => {
    mockReadSecretInput.mockResolvedValue('sk_test_limited');
    client.connectStripe.mockRejectedValue(
      new ApiError(403, 'STRIPE_PERMISSION_ERROR', 'Missing: charges:read, subscriptions:read'),
    );

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect', '--value', 'sk_test_limited'], {
      from: 'user',
    });

    expect(output.error).toHaveBeenCalledWith(
      'Stripe key lacks required permissions: Missing: charges:read, subscriptions:read',
    );
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('shows generic error message for unknown errors', async ({
    client,
    output,
    processMocks,
  }) => {
    mockReadSecretInput.mockResolvedValue('sk_test_xxx');
    client.connectStripe.mockRejectedValue(new Error('Network timeout'));

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect', '--value', 'sk_test_xxx'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Network timeout');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('shows error when the acquired value is empty', async ({ output, processMocks }) => {
    mockReadSecretInput.mockResolvedValue('');

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Stripe API key cannot be empty.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
