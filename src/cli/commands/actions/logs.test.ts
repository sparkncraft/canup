import { describe, expect, vi } from 'vitest';
import { test, output, client, project } from '#test/fixtures.js';

vi.mock('../../config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

vi.mock('../../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

vi.mock('../../ui/output.js', () => output);

describe('actions logs command', () => {
  test('displays execution list in table format', async ({ client, output, processMocks }) => {
    output.formatTable.mockReturnValue('table-output');

    client.listHistory.mockResolvedValue([
      {
        id: 'exec-uuid-1234-5678',
        actionSlug: 'my-action',
        status: 'success',
        durationMs: 150,
        executedAt: new Date().toISOString(),
        source: 'api',
      },
    ]);

    const { formatTable } = await import('../../ui/output.js');

    const { Command } = await import('commander');
    const { registerActionsLogsAction } =
      await import('../../commands/actions/logs.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsLogsAction(actions);

    await program.parseAsync(['actions', 'logs'], { from: 'user' });

    expect(formatTable).toHaveBeenCalledWith(
      ['ID', 'Action', 'Status', 'Duration', 'Source', 'Time'],
      expect.arrayContaining([expect.arrayContaining(['exec-uui', 'my-action'])]),
    );
    expect(processMocks.log).toHaveBeenCalledWith('table-output');
  });

  test('shows detail view with --id flag', async ({ client, output, processMocks }) => {
    client.getHistoryDetail.mockResolvedValue({
      id: 'exec-uuid-1234-5678',
      actionSlug: 'my-action',
      status: 'error',
      durationMs: 250,
      errorType: 'TypeError',
      errorMessage: 'x is not a function',
      stackTrace: 'Traceback...',
      printOutput: 'debug output here',
      executedAt: '2026-01-15T12:00:00Z',
      source: 'test',
    });

    const { Command } = await import('commander');
    const { registerActionsLogsAction } =
      await import('../../commands/actions/logs.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsLogsAction(actions);

    await program.parseAsync(['actions', 'logs', '--id', 'exec-uuid-1234-5678'], { from: 'user' });

    expect(output.label).toHaveBeenCalledWith('Execution', 'exec-uuid-1234-5678');
    expect(output.label).toHaveBeenCalledWith('Action', 'my-action');
    expect(output.label).toHaveBeenCalledWith('Duration', '250ms');
    expect(output.label).toHaveBeenCalledWith('Error Type', 'TypeError');
    expect(output.label).toHaveBeenCalledWith('Error', 'x is not a function');
    expect(processMocks.log).toHaveBeenCalledWith('Traceback...');
    expect(processMocks.log).toHaveBeenCalledWith('debug output here');
  });

  test('shows info message for empty execution list', async ({ client, output, processMocks }) => {
    client.listHistory.mockResolvedValue([]);

    const { Command } = await import('commander');
    const { registerActionsLogsAction } =
      await import('../../commands/actions/logs.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsLogsAction(actions);

    await program.parseAsync(['actions', 'logs'], { from: 'user' });

    expect(output.info).toHaveBeenCalledWith('No executions found.');
  });

  test('handles 404 error on detail view', async ({ client, output, processMocks }) => {
    const apiError = new Error('Not found') as Error & { statusCode: number };
    apiError.statusCode = 404;
    client.getHistoryDetail.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerActionsLogsAction } =
      await import('../../commands/actions/logs.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsLogsAction(actions);

    await program.parseAsync(['actions', 'logs', '--id', 'nonexistent-id'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Execution not found.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles 401 auth error', async ({ client, output, processMocks }) => {
    const apiError = new Error('Unauthorized') as Error & { statusCode: number };
    apiError.statusCode = 401;
    client.listHistory.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerActionsLogsAction } =
      await import('../../commands/actions/logs.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsLogsAction(actions);

    await program.parseAsync(['actions', 'logs'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Not authenticated.');
    expect(output.hint).toHaveBeenCalledWith('Run `canup init` to re-authenticate.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
