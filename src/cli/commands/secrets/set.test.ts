import { describe, expect, vi } from 'vitest';
import { test, client, output, project } from '#test/fixtures.js';
import { mockIsTTY } from '#test/mocks/cli.js';

const { mockReadStdinPipe, mockReadHiddenInput } = vi.hoisted(() => ({
  mockReadStdinPipe: vi.fn(),
  mockReadHiddenInput: vi.fn(),
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
vi.mock('../../lib/input.js', () => ({
  readStdinPipe: mockReadStdinPipe,
  readHiddenInput: mockReadHiddenInput,
}));

describe('secrets set command', () => {
  test('sets a new secret with --value flag', async ({ client, output }) => {
    client.setSecret.mockResolvedValue({ name: 'MY_KEY', created: true, synced: true });

    const { Command } = await import('commander');
    const { registerSecretsSetAction } = await import('../../commands/secrets/set.js');

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
    const { registerSecretsSetAction } = await import('../../commands/secrets/set.js');

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
    const { registerSecretsSetAction } = await import('../../commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY', '--value', 'val'], { from: 'user' });

    expect(output.hint).toHaveBeenCalledWith(expect.stringContaining('Lambda sync failed'));
  });

  test('reads value from interactive prompt when TTY', async ({ client, output }) => {
    client.setSecret.mockResolvedValue({ name: 'MY_KEY', created: true, synced: true });
    mockReadHiddenInput.mockResolvedValue('secret');

    using _tty = mockIsTTY(true);

    const { Command } = await import('commander');
    const { registerSecretsSetAction } = await import('../../commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY'], { from: 'user' });

    expect(mockReadHiddenInput).toHaveBeenCalledWith('Enter value: ');
    expect(client.setSecret).toHaveBeenCalledWith('test-app-id', 'MY_KEY', 'secret');
    expect(output.success).toHaveBeenCalledWith('Secret MY_KEY set and synced.');
  });

  test('reads value from stdin pipe when not TTY', async ({ client, output }) => {
    client.setSecret.mockResolvedValue({ name: 'MY_KEY', created: true, synced: true });
    mockReadStdinPipe.mockResolvedValue('piped-secret');

    using _tty = mockIsTTY(undefined);

    const { Command } = await import('commander');
    const { registerSecretsSetAction } = await import('../../commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY'], { from: 'user' });

    expect(mockReadStdinPipe).toHaveBeenCalled();
    expect(client.setSecret).toHaveBeenCalledWith('test-app-id', 'MY_KEY', 'piped-secret');
  });

  test('exits with error when value is empty', async ({ output, processMocks }) => {
    mockReadStdinPipe.mockResolvedValue('');

    using _tty = mockIsTTY(undefined);

    const { Command } = await import('commander');
    const { registerSecretsSetAction } = await import('../../commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Secret value cannot be empty');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles API error', async ({ client, output, processMocks }) => {
    client.setSecret.mockRejectedValue(new Error('Server error'));

    const { Command } = await import('commander');
    const { registerSecretsSetAction } = await import('../../commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY', '--value', 'val'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Server error');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
