import { describe, expect, vi } from 'vitest';
import { test, client, output, project } from '#test/fixtures.js';

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
vi.mock('../../lib/input.js', () => ({ readSecretInput: mockReadSecretInput }));

describe('secrets set command', () => {
  test('sets a new secret with --value flag', async ({ client, output }) => {
    mockReadSecretInput.mockResolvedValue('my-secret-val');
    client.setSecret.mockResolvedValue({ name: 'MY_KEY', created: true, synced: true });

    const { Command } = await import('commander');
    const { registerSecretsSetAction } = await import('../../commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY', '--value', 'my-secret-val'], {
      from: 'user',
    });

    expect(mockReadSecretInput).toHaveBeenCalledWith('my-secret-val', { prompt: 'Enter value: ' });
    expect(client.setSecret).toHaveBeenCalledWith('test-app-id', 'MY_KEY', 'my-secret-val');
    expect(output.success).toHaveBeenCalledWith('Secret MY_KEY set and synced.');
  });

  test('updates an existing secret', async ({ client, output }) => {
    mockReadSecretInput.mockResolvedValue('updated-val');
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
    mockReadSecretInput.mockResolvedValue('val');
    client.setSecret.mockResolvedValue({ name: 'MY_KEY', created: true, synced: false });

    const { Command } = await import('commander');
    const { registerSecretsSetAction } = await import('../../commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY', '--value', 'val'], { from: 'user' });

    expect(output.hint).toHaveBeenCalledWith(expect.stringContaining('Lambda sync failed'));
  });

  test('acquires the value via readSecretInput when no --value flag', async ({ client }) => {
    mockReadSecretInput.mockResolvedValue('acquired-secret');
    client.setSecret.mockResolvedValue({ name: 'MY_KEY', created: true, synced: true });

    const { Command } = await import('commander');
    const { registerSecretsSetAction } = await import('../../commands/secrets/set.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsSetAction(secrets);

    await program.parseAsync(['secrets', 'set', 'MY_KEY'], { from: 'user' });

    expect(mockReadSecretInput).toHaveBeenCalledWith(undefined, { prompt: 'Enter value: ' });
    expect(client.setSecret).toHaveBeenCalledWith('test-app-id', 'MY_KEY', 'acquired-secret');
  });

  test('exits with error when value is empty', async ({ output, processMocks }) => {
    mockReadSecretInput.mockResolvedValue('');

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
    mockReadSecretInput.mockResolvedValue('val');
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
