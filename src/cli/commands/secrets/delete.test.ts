import { describe, expect, vi } from 'vitest';
import { test, client, output, project } from '#test/fixtures.js';

// Mock require-project
vi.mock('../../config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

// Mock api-client
vi.mock('../../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

// Mock output
vi.mock('../../ui/output.js', () => output);

describe('secrets delete command', () => {
  test('deletes a secret successfully', async ({ client, output }) => {
    client.deleteSecret.mockResolvedValue({ deleted: 'MY_KEY', synced: true });

    const { Command } = await import('commander');
    const { registerSecretsDeleteAction } = await import('../../commands/secrets/delete.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsDeleteAction(secrets);

    await program.parseAsync(['secrets', 'delete', 'MY_KEY'], { from: 'user' });

    expect(client.deleteSecret).toHaveBeenCalledWith('test-app-id', 'MY_KEY');
    expect(output.success).toHaveBeenCalledWith('Deleted MY_KEY');
  });

  test('handles 404 not found', async ({ client, output, processMocks }) => {
    const apiError = new Error('Not found') as Error & { statusCode: number };
    apiError.statusCode = 404;
    client.deleteSecret.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerSecretsDeleteAction } = await import('../../commands/secrets/delete.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsDeleteAction(secrets);

    await program.parseAsync(['secrets', 'delete', 'MISSING'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Secret "MISSING" not found.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles non-404 API error', async ({ client, output, processMocks }) => {
    client.deleteSecret.mockRejectedValue(new Error('Connection timeout'));

    const { Command } = await import('commander');
    const { registerSecretsDeleteAction } = await import('../../commands/secrets/delete.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsDeleteAction(secrets);

    await program.parseAsync(['secrets', 'delete', 'MY_KEY'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Connection timeout');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('shows sync failure warning on delete', async ({ client, output }) => {
    client.deleteSecret.mockResolvedValue({ deleted: 'MY_KEY', synced: false });

    const { Command } = await import('commander');
    const { registerSecretsDeleteAction } = await import('../../commands/secrets/delete.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsDeleteAction(secrets);

    await program.parseAsync(['secrets', 'delete', 'MY_KEY'], { from: 'user' });

    expect(output.success).toHaveBeenCalledWith('Deleted MY_KEY');
    expect(output.hint).toHaveBeenCalledWith(expect.stringContaining('Lambda sync failed'));
  });
});
