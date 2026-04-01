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
    const { registerActionsLogsAction } = await import('../../commands/actions/logs.js');

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
    const { registerActionsLogsAction } = await import('../../commands/actions/logs.js');

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
    const { registerActionsLogsAction } = await import('../../commands/actions/logs.js');

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
    const { registerActionsLogsAction } = await import('../../commands/actions/logs.js');

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
    const { registerActionsLogsAction } = await import('../../commands/actions/logs.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsLogsAction(actions);

    await program.parseAsync(['actions', 'logs'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Not authenticated.');
    expect(output.hint).toHaveBeenCalledWith('Run `canup init` to re-authenticate.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('timeAgo formats seconds, minutes, hours, and days correctly', async ({
    client,
    output,
    processMocks,
  }) => {
    output.formatTable.mockReturnValue('table-output');

    const now = Date.now();
    client.listHistory.mockResolvedValue([
      {
        id: 'aaaaaaaa-0000-0000-0000-000000000001',
        actionSlug: 'recent',
        status: 'success',
        durationMs: 10,
        executedAt: new Date(now - 30 * 1000).toISOString(), // 30s ago
        source: 'api',
      },
      {
        id: 'aaaaaaaa-0000-0000-0000-000000000002',
        actionSlug: 'minutes',
        status: 'error',
        durationMs: 20,
        executedAt: new Date(now - 5 * 60 * 1000).toISOString(), // 5m ago
        source: 'api',
      },
      {
        id: 'aaaaaaaa-0000-0000-0000-000000000003',
        actionSlug: 'hours',
        status: 'success',
        durationMs: 30,
        executedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(), // 3h ago
        source: 'canva',
      },
      {
        id: 'aaaaaaaa-0000-0000-0000-000000000004',
        actionSlug: 'days',
        status: 'success',
        durationMs: 40,
        executedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2d ago
        source: 'test',
      },
    ]);

    const { formatTable } = await import('../../ui/output.js');
    const { Command } = await import('commander');
    const { registerActionsLogsAction } = await import('../../commands/actions/logs.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsLogsAction(actions);

    await program.parseAsync(['actions', 'logs'], { from: 'user' });

    const tableCall = vi.mocked(formatTable).mock.calls[0];
    const rows = tableCall[1];

    expect(rows[0][5]).toMatch(/^\d+s ago$/);
    expect(rows[1][5]).toMatch(/^\d+m ago$/);
    expect(rows[2][5]).toMatch(/^\d+h ago$/);
    expect(rows[3][5]).toMatch(/^\d+d ago$/);
  });

  test('passes slug filter and limit option to API', async ({ client, output, processMocks }) => {
    output.formatTable.mockReturnValue('table-output');
    client.listHistory.mockResolvedValue([]);

    const { Command } = await import('commander');
    const { registerActionsLogsAction } = await import('../../commands/actions/logs.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsLogsAction(actions);

    await program.parseAsync(['actions', 'logs', 'my-action', '--limit', '5'], { from: 'user' });

    expect(client.listHistory).toHaveBeenCalledWith('test-app-id', 'my-action', { limit: 5 });
  });

  test('shows hint when empty list with slug filter', async ({ client, output, processMocks }) => {
    client.listHistory.mockResolvedValue([]);

    const { Command } = await import('commander');
    const { registerActionsLogsAction } = await import('../../commands/actions/logs.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsLogsAction(actions);

    await program.parseAsync(['actions', 'logs', 'my-action'], { from: 'user' });

    expect(output.info).toHaveBeenCalledWith('No executions found.');
    expect(output.hint).toHaveBeenCalledWith('Try without a slug filter to see all executions.');
  });
});
