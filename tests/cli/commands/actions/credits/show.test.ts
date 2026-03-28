import { describe, expect, vi } from 'vitest';
import { test, client, output, project } from '../../../../fixtures/cli.js';

vi.mock('../../../../../src/cli/config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));
vi.mock('../../../../../src/cli/api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));
vi.mock('../../../../../src/cli/ui/output.js', () => output);

describe('credits show command', () => {
  test('shows credit config when it exists', async ({ client, output }) => {
    client.getCreditConfig.mockResolvedValue({
      id: 'cc-1',
      actionSlug: 'my-action',
      quota: 50,
      interval: 'monthly',
      plan: 'free',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    const { Command } = await import('commander');
    const { registerCreditsShowAction } = await import('../../../../../src/cli/commands/actions/credits/show.js');

    const program = new Command();
    const credits = program.command('credits');
    registerCreditsShowAction(credits);

    await program.parseAsync(['credits', 'show', 'my-action'], { from: 'user' });

    expect(client.getCreditConfig).toHaveBeenCalledWith('test-app-id', 'my-action');
    expect(output.label).toHaveBeenCalledWith('Quota', '50');
    expect(output.label).toHaveBeenCalledWith('Interval', 'monthly');
  });

  test('shows free message when no config exists', async ({ client, output }) => {
    client.getCreditConfig.mockResolvedValue(null);

    const { Command } = await import('commander');
    const { registerCreditsShowAction } = await import('../../../../../src/cli/commands/actions/credits/show.js');

    const program = new Command();
    const credits = program.command('credits');
    registerCreditsShowAction(credits);

    await program.parseAsync(['credits', 'show', 'my-action'], { from: 'user' });

    expect(output.info).toHaveBeenCalledWith(expect.stringContaining('free'));
  });

  test('handles API error', async ({ client, output, processMocks }) => {
    client.getCreditConfig.mockRejectedValue(new Error('Not found'));

    const { Command } = await import('commander');
    const { registerCreditsShowAction } = await import('../../../../../src/cli/commands/actions/credits/show.js');

    const program = new Command();
    const credits = program.command('credits');
    registerCreditsShowAction(credits);

    await program.parseAsync(['credits', 'show', 'my-action'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Not found');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
