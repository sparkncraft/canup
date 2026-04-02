import { describe, expect, vi } from 'vitest';
import { test, client, output, project } from '#test/fixtures.js';
import { mockIsTTY } from '#test/mocks/cli.js';

const { mockCreateInterface } = vi.hoisted(() => ({
  mockCreateInterface: vi.fn(),
}));

vi.mock('node:readline', () => ({
  createInterface: mockCreateInterface,
}));

vi.mock('../../config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

vi.mock('../../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

vi.mock('../../ui/output.js', () => output);

async function runDisconnect(...extraArgs: string[]) {
  const { Command } = await import('commander');
  const { registerStripeDisconnectAction } = await import('../../commands/stripe/disconnect.js');

  const program = new Command();
  const stripe = program.command('stripe');
  registerStripeDisconnectAction(stripe);

  await program.parseAsync(['stripe', 'disconnect', ...extraArgs], { from: 'user' });
}

describe('stripe disconnect command', () => {
  test('disconnects with --yes flag (skips confirmation)', async ({ client, output }) => {
    client.disconnectStripe.mockResolvedValue({ disconnected: true });

    await runDisconnect('--yes');

    expect(client.disconnectStripe).toHaveBeenCalledWith('test-app-id');
    expect(output.success).toHaveBeenCalledWith('Stripe disconnected. Webhook endpoint removed.');
  });

  test('handles API error on disconnect', async ({ client, output, processMocks }) => {
    client.disconnectStripe.mockRejectedValue(new Error('Not connected'));

    await runDisconnect('--yes');

    expect(output.error).toHaveBeenCalledWith('Not connected');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('prompts for confirmation in TTY mode and proceeds on "y"', async ({ client, output }) => {
    using _tty = mockIsTTY(true);

    mockCreateInterface.mockReturnValue({
      question: vi.fn((_q: string, cb: (answer: string) => void) => cb('y')),
      close: vi.fn(),
    });

    client.disconnectStripe.mockResolvedValue({ disconnected: true });

    await runDisconnect();

    expect(mockCreateInterface).toHaveBeenCalled();
    expect(client.disconnectStripe).toHaveBeenCalledWith('test-app-id');
    expect(output.success).toHaveBeenCalledWith('Stripe disconnected. Webhook endpoint removed.');
  });

  test('prompts for confirmation in TTY mode and aborts on "n"', async ({ client }) => {
    using _tty = mockIsTTY(true);

    mockCreateInterface.mockReturnValue({
      question: vi.fn((_q: string, cb: (answer: string) => void) => cb('n')),
      close: vi.fn(),
    });

    await runDisconnect();

    expect(mockCreateInterface).toHaveBeenCalled();
    expect(client.disconnectStripe).not.toHaveBeenCalled();
  });

  test('accepts "yes" as confirmation answer', async ({ client, output }) => {
    using _tty = mockIsTTY(true);

    mockCreateInterface.mockReturnValue({
      question: vi.fn((_q: string, cb: (answer: string) => void) => cb('yes')),
      close: vi.fn(),
    });

    client.disconnectStripe.mockResolvedValue({ disconnected: true });

    await runDisconnect();

    expect(client.disconnectStripe).toHaveBeenCalledWith('test-app-id');
  });

  test('non-TTY mode bypasses confirmation and proceeds directly', async ({ client, output }) => {
    using _tty = mockIsTTY(undefined);

    client.disconnectStripe.mockResolvedValue({ disconnected: true });

    await runDisconnect();

    expect(mockCreateInterface).not.toHaveBeenCalled();
    expect(client.disconnectStripe).toHaveBeenCalledWith('test-app-id');
    expect(output.success).toHaveBeenCalledWith('Stripe disconnected. Webhook endpoint removed.');
  });
});
