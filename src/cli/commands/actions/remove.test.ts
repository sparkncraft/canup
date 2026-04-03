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

describe('actions remove command', () => {
  test('removes action and shows success message', async ({ client, output, processMocks }) => {
    client.deleteAction.mockResolvedValue({ deleted: 'my-action' });

    const { Command } = await import('commander');
    const { registerActionsRemoveAction } = await import('../../commands/actions/remove.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsRemoveAction(actions);

    await program.parseAsync(['actions', 'remove', 'my-action'], { from: 'user' });

    expect(client.deleteAction).toHaveBeenCalledWith('test-app-id', 'my-action');
    expect(output.success).toHaveBeenCalledWith('Removed my-action');
  });

  test('handles 404 error with specific message', async ({ client, output, processMocks }) => {
    const apiError = new Error('Not found') as Error & { statusCode: number };
    apiError.statusCode = 404;
    client.deleteAction.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerActionsRemoveAction } = await import('../../commands/actions/remove.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsRemoveAction(actions);

    await program.parseAsync(['actions', 'remove', 'nonexistent'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Action not found: nonexistent');
    expect(output.hint).toHaveBeenCalledWith('Run `canup actions list` to see deployed actions.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles generic error', async ({ client, output, processMocks }) => {
    const apiError = new Error('Internal server error') as Error & { statusCode: number };
    apiError.statusCode = 500;
    client.deleteAction.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerActionsRemoveAction } = await import('../../commands/actions/remove.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsRemoveAction(actions);

    await program.parseAsync(['actions', 'remove', 'my-action'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Internal server error');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
