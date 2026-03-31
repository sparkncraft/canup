import { describe, expect, vi } from 'vitest';
import { test, client, output, project } from '#test/fixtures.js';

vi.mock('../../../config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));
vi.mock('../../../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));
vi.mock('../../../ui/output.js', () => output);

describe('credits delete command', () => {
  test('deletes credit config and shows success', async ({ client, output }) => {
    client.deleteCreditConfig.mockResolvedValue({ deleted: 'my-action' });

    const { Command } = await import('commander');
    const { registerCreditsDeleteAction } =
      await import('../../../commands/actions/credits/delete.js');

    const program = new Command();
    const credits = program.command('credits');
    registerCreditsDeleteAction(credits);

    await program.parseAsync(['credits', 'delete', 'my-action'], { from: 'user' });

    expect(client.deleteCreditConfig).toHaveBeenCalledWith('test-app-id', 'my-action');
    expect(output.success).toHaveBeenCalledWith(expect.stringContaining('Credit config removed'));
  });

  test('shows error for 404', async ({ client, output, processMocks }) => {
    const err = new Error('Not found') as Error & { statusCode?: number };
    err.statusCode = 404;
    client.deleteCreditConfig.mockRejectedValue(err);

    const { Command } = await import('commander');
    const { registerCreditsDeleteAction } =
      await import('../../../commands/actions/credits/delete.js');

    const program = new Command();
    const credits = program.command('credits');
    registerCreditsDeleteAction(credits);

    await program.parseAsync(['credits', 'delete', 'my-action'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('No credit config found for "my-action"');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles generic API error', async ({ client, output, processMocks }) => {
    client.deleteCreditConfig.mockRejectedValue(new Error('Server error'));

    const { Command } = await import('commander');
    const { registerCreditsDeleteAction } =
      await import('../../../commands/actions/credits/delete.js');

    const program = new Command();
    const credits = program.command('credits');
    registerCreditsDeleteAction(credits);

    await program.parseAsync(['credits', 'delete', 'my-action'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Server error');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
