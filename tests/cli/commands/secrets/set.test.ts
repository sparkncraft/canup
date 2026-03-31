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

describe('secrets set command', () => {
  test('sets a new secret with --value flag', async ({ client, output }) => {
    client.setSecret.mockResolvedValue({ name: 'MY_KEY', created: true, synced: true });

    const { Command } = await import('commander');
    const { registerSecretsSetAction } =
      await import('../../../../src/cli/commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY', '--value', 'my-secret-val'], {
      from: 'user',
    });

    expect(client.setSecret).toHaveBeenCalledWith('test-app-id', 'MY_KEY', 'my-secret-val');
    expect(output.success).toHaveBeenCalledWith('Secret MY_KEY set and synced.');
  });

  test('updates an existing secret with --value flag', async ({ client, output }) => {
    client.setSecret.mockResolvedValue({ name: 'MY_KEY', created: false, synced: true });

    const { Command } = await import('commander');
    const { registerSecretsSetAction } =
      await import('../../../../src/cli/commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY', '--value', 'updated-val'], {
      from: 'user',
    });

    expect(output.success).toHaveBeenCalledWith('Secret MY_KEY updated and synced.');
  });

  test('shows sync failure warning', async ({ client, output }) => {
    client.setSecret.mockResolvedValue({ name: 'MY_KEY', created: true, synced: false });

    const { Command } = await import('commander');
    const { registerSecretsSetAction } =
      await import('../../../../src/cli/commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY', '--value', 'val'], { from: 'user' });

    expect(output.hint).toHaveBeenCalledWith(expect.stringContaining('Lambda sync failed'));
  });

  test('reads value from interactive prompt when no --value flag (TTY mode)', async ({
    client,
    output,
  }) => {
    client.setSecret.mockResolvedValue({ name: 'MY_KEY', created: true, synced: true });

    // Set up TTY mode
    const originalIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true as boolean;

    // Mock stdin raw mode methods
    const mockSetRawMode = vi.fn();
    const originalSetRawMode = process.stdin.setRawMode;
    process.stdin.setRawMode = mockSetRawMode as typeof process.stdin.setRawMode;

    const originalResume = process.stdin.resume;
    process.stdin.resume = vi.fn().mockReturnValue(process.stdin) as typeof process.stdin.resume;

    const originalPause = process.stdin.pause;
    process.stdin.pause = vi.fn().mockReturnValue(process.stdin) as typeof process.stdin.pause;

    const originalSetEncoding = process.stdin.setEncoding;
    process.stdin.setEncoding = vi.fn().mockReturnValue(process.stdin);

    // Capture the data listener and emit keys after it's registered
    const originalOn = process.stdin.on.bind(process.stdin);
    const originalRemoveListener = process.stdin.removeListener.bind(process.stdin);
    let dataHandler: ((key: string) => void) | null = null;
    vi.spyOn(process.stdin, 'on').mockImplementation(((
      event: string,
      handler: (...args: unknown[]) => void,
    ) => {
      if (event === 'data') {
        dataHandler = handler as (key: string) => void;
        // Emit characters asynchronously
        setTimeout(() => {
          if (dataHandler) {
            dataHandler('s');
            dataHandler('e');
            dataHandler('c');
            dataHandler('r');
            dataHandler('e');
            dataHandler('t');
            dataHandler('\r'); // Enter
          }
        }, 0);
      }
      return process.stdin;
    }) as typeof process.stdin.on);

    vi.spyOn(process.stdin, 'removeListener').mockImplementation(((event: string) => {
      if (event === 'data') dataHandler = null;
      return process.stdin;
    }) as typeof process.stdin.removeListener);

    // Suppress stderr writes from readHiddenInput
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const { Command } = await import('commander');
    const { registerSecretsSetAction } =
      await import('../../../../src/cli/commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY'], { from: 'user' });

    expect(client.setSecret).toHaveBeenCalledWith('test-app-id', 'MY_KEY', 'secret');
    expect(output.success).toHaveBeenCalledWith('Secret MY_KEY set and synced.');

    // Restore
    process.stdin.isTTY = originalIsTTY;
    process.stdin.setRawMode = originalSetRawMode;
    process.stdin.resume = originalResume;
    process.stdin.pause = originalPause;
    process.stdin.setEncoding = originalSetEncoding;
    process.stdin.on = originalOn as typeof process.stdin.on;
    process.stdin.removeListener = originalRemoveListener as typeof process.stdin.removeListener;
  });

  test('handles API error', async ({ client, output, processMocks }) => {
    client.setSecret.mockRejectedValue(new Error('Server error'));

    const { Command } = await import('commander');
    const { registerSecretsSetAction } =
      await import('../../../../src/cli/commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY', '--value', 'val'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Server error');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
