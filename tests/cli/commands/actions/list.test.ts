import { describe, expect, vi } from 'vitest';
import { test, output, client, project } from '../../../fixtures/cli.js';

vi.mock('../../../../src/cli/config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

vi.mock('../../../../src/cli/api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

vi.mock('../../../../src/cli/ui/output.js', () => output);

describe('actions list command', () => {
  test('displays table when actions exist', async ({ client, output, processMocks }) => {
    output.formatTable.mockReturnValue('table-output');

    client.listActions.mockResolvedValue([
      {
        id: '1',
        slug: 'my-action',
        language: 'python',
        deployed: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      },
    ]);

    const { formatTable } = await import('../../../../src/cli/ui/output.js');

    const { Command } = await import('commander');
    const { registerActionsListAction } = await import('../../../../src/cli/commands/actions/list.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsListAction(actions);

    await program.parseAsync(['actions', 'list'], { from: 'user' });

    expect(formatTable).toHaveBeenCalledWith(
      ['Name', 'Language', 'Deployed', 'Updated'],
      expect.arrayContaining([expect.arrayContaining(['my-action', 'python', 'yes'])]),
    );
    expect(processMocks.log).toHaveBeenCalledWith('table-output');
  });

  test('shows info message when no actions exist', async ({ client, output, processMocks }) => {
    client.listActions.mockResolvedValue([]);

    const { Command } = await import('commander');
    const { registerActionsListAction } = await import('../../../../src/cli/commands/actions/list.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsListAction(actions);

    await program.parseAsync(['actions', 'list'], { from: 'user' });

    expect(output.info).toHaveBeenCalledWith('No actions found.');
  });
});
