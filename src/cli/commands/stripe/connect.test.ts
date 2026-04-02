import { describe, expect, vi } from 'vitest';
import { test, client, output, project, spinner } from '#test/fixtures.js';
import { mockIsTTY } from '#test/mocks/cli.js';

vi.mock('../../config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));
vi.mock('../../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));
vi.mock('../../ui/output.js', () => output);
vi.mock('../../ui/spinner.js', () => spinner);

const { mockReadHiddenInput, mockReadStdinPipe } = vi.hoisted(() => ({
  mockReadHiddenInput: vi.fn(),
  mockReadStdinPipe: vi.fn(),
}));
vi.mock('../../lib/input.js', () => ({
  readHiddenInput: mockReadHiddenInput,
  readStdinPipe: mockReadStdinPipe,
}));

describe('stripe connect command', () => {
  test('connects stripe with --value flag', async ({ client, output }) => {
    client.connectStripe.mockResolvedValue({ connected: true });

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect', '--value', 'sk_test_xxx'], { from: 'user' });

    expect(client.connectStripe).toHaveBeenCalledWith('test-app-id', 'sk_test_xxx');
    expect(output.success).toHaveBeenCalledWith('Stripe connected successfully.');
  });

  test('connects stripe via interactive prompt when TTY', async ({ client, output }) => {
    client.connectStripe.mockResolvedValue({ connected: true });
    mockReadHiddenInput.mockResolvedValue('sk_test_interactive');

    using _tty = mockIsTTY(true);

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect'], { from: 'user' });

    expect(client.connectStripe).toHaveBeenCalledWith('test-app-id', 'sk_test_interactive');
  });

  test('connects stripe via stdin pipe', async ({ client }) => {
    client.connectStripe.mockResolvedValue({ connected: true });
    mockReadStdinPipe.mockResolvedValue('sk_test_piped');

    using _tty = mockIsTTY(undefined);

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect'], { from: 'user' });

    expect(client.connectStripe).toHaveBeenCalledWith('test-app-id', 'sk_test_piped');
  });

  test('shows error for invalid Stripe key', async ({ client, output, processMocks }) => {
    const err = new Error('Invalid API key') as Error & { errorType: string };
    err.errorType = 'STRIPE_KEY_INVALID';
    client.connectStripe.mockRejectedValue(err);

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
    const err = new Error('Missing: charges:read, subscriptions:read') as Error & {
      errorType: string;
    };
    err.errorType = 'STRIPE_PERMISSION_ERROR';
    client.connectStripe.mockRejectedValue(err);

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

  test('shows error when stdin pipe returns empty (no input source)', async ({
    output,
    processMocks,
  }) => {
    using _tty = mockIsTTY(undefined);

    mockReadStdinPipe.mockResolvedValueOnce('');

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Stripe API key cannot be empty.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('shows error for empty value', async ({ output, processMocks }) => {
    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect', '--value', ''], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Stripe API key cannot be empty.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
