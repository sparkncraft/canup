import { describe, expect, vi } from 'vitest';
import { test, client, output, project, spinner } from '../../../fixtures/cli.js';

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

// Mock spinner
vi.mock('../../../../src/cli/ui/spinner.js', () => spinner);

// Mock input utilities
vi.mock('../../../../src/cli/lib/input.js', () => ({
  readHiddenInput: vi.fn().mockResolvedValue('sk_test_interactive'),
  readStdinPipe: vi.fn().mockResolvedValue('sk_test_piped'),
}));

describe('stripe connect command', () => {
  test('connects stripe with --value flag', async ({ client, output }) => {
    client.connectStripe.mockResolvedValue({ connected: true });

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../../../src/cli/commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect', '--value', 'sk_test_xxx'], { from: 'user' });

    expect(client.connectStripe).toHaveBeenCalledWith('test-app-id', 'sk_test_xxx');
    expect(output.success).toHaveBeenCalledWith('Stripe connected successfully.');
  });

  test('connects stripe via interactive prompt when TTY', async ({ client, output }) => {
    client.connectStripe.mockResolvedValue({ connected: true });

    // Set up TTY mode
    const originalIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true as boolean;

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../../../src/cli/commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect'], { from: 'user' });

    expect(client.connectStripe).toHaveBeenCalledWith('test-app-id', 'sk_test_interactive');

    // Restore
    process.stdin.isTTY = originalIsTTY;
  });

  test('connects stripe via stdin pipe', async ({ client }) => {
    client.connectStripe.mockResolvedValue({ connected: true });

    // Non-TTY mode (pipe)
    const originalIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = undefined;

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../../../src/cli/commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect'], { from: 'user' });

    expect(client.connectStripe).toHaveBeenCalledWith('test-app-id', 'sk_test_piped');

    // Restore
    process.stdin.isTTY = originalIsTTY;
  });

  test('shows error for invalid Stripe key', async ({ client, output, processMocks }) => {
    const err = new Error('Invalid API key') as Error & { errorType: string };
    err.errorType = 'STRIPE_KEY_INVALID';
    client.connectStripe.mockRejectedValue(err);

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../../../src/cli/commands/stripe/connect.js');

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
    const { registerStripeConnectAction } = await import('../../../../src/cli/commands/stripe/connect.js');

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

  test('shows error when stdin pipe returns empty (no input source)', async ({
    output,
    processMocks,
  }) => {
    const originalIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = undefined;

    // Override the default mock to return empty string for this test
    const { readStdinPipe } = await import('../../../../src/cli/lib/input.js');
    vi.mocked(readStdinPipe).mockResolvedValueOnce('');

    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../../../src/cli/commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Stripe API key cannot be empty.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);

    process.stdin.isTTY = originalIsTTY;
  });

  test('shows error for empty value', async ({ output, processMocks }) => {
    const { Command } = await import('commander');
    const { registerStripeConnectAction } = await import('../../../../src/cli/commands/stripe/connect.js');

    const program = new Command();
    const stripe = program.command('stripe');
    registerStripeConnectAction(stripe);

    await program.parseAsync(['stripe', 'connect', '--value', ''], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Stripe API key cannot be empty.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
