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

describe('credits set command', () => {
  test('sets credit config with valid options', async ({ client, output }) => {
    client.setCreditConfig.mockResolvedValue({
      id: 'cc-1',
      actionSlug: 'my-action',
      quota: 50,
      interval: 'monthly',
      plan: 'free',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    const { Command } = await import('commander');
    const { registerCreditsSetAction } =
      await import('../../../../../src/cli/commands/actions/credits/set.js');

    const program = new Command();
    const credits = program.command('credits');
    registerCreditsSetAction(credits);

    await program.parseAsync(
      ['credits', 'set', 'my-action', '--quota', '50', '--interval', 'monthly'],
      { from: 'user' },
    );

    expect(client.setCreditConfig).toHaveBeenCalledWith('test-app-id', 'my-action', 50, 'monthly');
    expect(output.success).toHaveBeenCalledWith('Credits set for my-action: 50 per monthly');
  });

  test('defaults to lifetime interval when --interval is omitted', async ({ client, output }) => {
    client.setCreditConfig.mockResolvedValue({
      id: 'cc-2',
      actionSlug: 'my-action',
      quota: 100,
      interval: 'lifetime',
      plan: 'free',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    const { Command } = await import('commander');
    const { registerCreditsSetAction } =
      await import('../../../../../src/cli/commands/actions/credits/set.js');

    const program = new Command();
    const credits = program.command('credits');
    registerCreditsSetAction(credits);

    await program.parseAsync(['credits', 'set', 'my-action', '--quota', '100'], { from: 'user' });

    expect(client.setCreditConfig).toHaveBeenCalledWith(
      'test-app-id',
      'my-action',
      100,
      'lifetime',
    );
    expect(output.success).toHaveBeenCalledWith('Credits set for my-action: 100 lifetime total');
  });

  test('rejects invalid interval', async ({ output, processMocks }) => {
    const { Command } = await import('commander');
    const { registerCreditsSetAction } =
      await import('../../../../../src/cli/commands/actions/credits/set.js');

    const program = new Command();
    const credits = program.command('credits');
    registerCreditsSetAction(credits);

    await program.parseAsync(
      ['credits', 'set', 'my-action', '--quota', '10', '--interval', 'hourly'],
      { from: 'user' },
    );

    expect(output.error).toHaveBeenCalledWith(expect.stringContaining('Invalid interval'));
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('rejects non-positive quota', async ({ output, processMocks }) => {
    const { Command } = await import('commander');
    const { registerCreditsSetAction } =
      await import('../../../../../src/cli/commands/actions/credits/set.js');

    const program = new Command();
    const credits = program.command('credits');
    registerCreditsSetAction(credits);

    await program.parseAsync(
      ['credits', 'set', 'my-action', '--quota', '0', '--interval', 'daily'],
      { from: 'user' },
    );

    expect(output.error).toHaveBeenCalledWith('Quota must be a positive integer');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles API error', async ({ client, output, processMocks }) => {
    client.setCreditConfig.mockRejectedValue(new Error('Server error'));

    const { Command } = await import('commander');
    const { registerCreditsSetAction } =
      await import('../../../../../src/cli/commands/actions/credits/set.js');

    const program = new Command();
    const credits = program.command('credits');
    registerCreditsSetAction(credits);

    await program.parseAsync(
      ['credits', 'set', 'my-action', '--quota', '10', '--interval', 'daily'],
      { from: 'user' },
    );

    expect(output.error).toHaveBeenCalledWith('Server error');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
