import { describe, expect, vi } from 'vitest';
import { test, output, client, project } from '#test/fixtures.js';

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

describe('actions delete command', () => {
  test('deletes an action and shows success message', async ({ client, output, processMocks }) => {
    client.deleteAction.mockResolvedValue({ deleted: 'my-action' });

    const { Command } = await import('commander');
    const { registerActionsDeleteAction } = await import('../../commands/actions/delete.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeleteAction(actions);

    await program.parseAsync(['actions', 'delete', 'my-action'], { from: 'user' });

    expect(client.deleteAction).toHaveBeenCalledWith('test-app-id', 'my-action');
    expect(output.success).toHaveBeenCalledWith('Deleted my-action');
  });

  test('handles 404 error when action not found', async ({ client, output, processMocks }) => {
    const apiError = new Error('Not found') as Error & { httpStatus: number };
    apiError.httpStatus = 404;
    client.deleteAction.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerActionsDeleteAction } = await import('../../commands/actions/delete.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeleteAction(actions);

    await program.parseAsync(['actions', 'delete', 'nonexistent'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Action not found: nonexistent');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles generic error', async ({ client, output, processMocks }) => {
    const apiError = new Error('Internal server error') as Error & { httpStatus: number };
    apiError.httpStatus = 500;
    client.deleteAction.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerActionsDeleteAction } = await import('../../commands/actions/delete.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeleteAction(actions);

    await program.parseAsync(['actions', 'delete', 'my-action'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Internal server error');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
