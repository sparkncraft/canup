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

describe('secrets list command', () => {
  test('displays secrets in a table when secrets exist', async ({
    client,
    output,
    processMocks,
  }) => {
    client.listSecrets.mockResolvedValue([
      { name: 'DB_URL', maskedValue: 'pg://****', updatedAt: '2026-01-15' },
      { name: 'API_TOKEN', maskedValue: 'sk-****', updatedAt: '2026-01-16' },
    ]);

    const { Command } = await import('commander');
    const { registerSecretsListAction } =
      await import('../../../../src/cli/commands/secrets/list.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsListAction(secrets);

    await program.parseAsync(['secrets', 'list'], { from: 'user' });

    expect(client.listSecrets).toHaveBeenCalledWith('test-app-id');

    expect(output.formatTable).toHaveBeenCalledWith(
      ['Name', 'Value'],
      expect.arrayContaining([
        ['DB_URL', 'pg://****'],
        ['API_TOKEN', 'sk-****'],
      ]),
    );
    expect(processMocks.log).toHaveBeenCalledWith('');
  });

  test('shows empty state message when no secrets', async ({ client, output }) => {
    client.listSecrets.mockResolvedValue([]);

    const { Command } = await import('commander');
    const { registerSecretsListAction } =
      await import('../../../../src/cli/commands/secrets/list.js');

    const program = new Command();
    const secrets = program.command('secrets');
    registerSecretsListAction(secrets);

    await program.parseAsync(['secrets', 'list'], { from: 'user' });

    expect(output.info).toHaveBeenCalledWith('No secrets found.');
    expect(output.hint).toHaveBeenCalledWith(expect.stringContaining('canup secrets set'));
  });
});
