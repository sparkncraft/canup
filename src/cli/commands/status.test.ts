import { describe, expect, vi } from 'vitest';
import {
  test,
  output,
  client,
  project,
  projectConfig,
  actionsDiscovery,
} from '#test/fixtures.js';

vi.mock('../config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

vi.mock('../config/project-config.js', () => projectConfig);

vi.mock('../config/actions-discovery.js', () => actionsDiscovery);

vi.mock('../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

vi.mock('../ui/output.js', () => output);

describe('status command', () => {
  function allConsoleOutput(log: ReturnType<typeof vi.spyOn>): string {
    return log.mock.calls.map((c) => c.join(' ')).join('\n');
  }

  test('shows status dashboard with deployed actions', async ({ client, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    actionsDiscovery.discoverActions.mockReturnValue([]);

    client.getAppInfo.mockResolvedValue({ name: 'Test App', canvaAppId: 'AAFtest123' });
    client.listActions.mockResolvedValue([
      {
        id: 'act-1',
        slug: 'resize_image',
        language: 'python',
        deployed: true,
        contentHash: 'abc123',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-02-25T10:00:00.000Z',
      },
    ]);
    client.listSecrets.mockResolvedValue([]);
    client.listDeps.mockResolvedValue({ packages: [], layerSize: null, layerArn: null });

    const { Command } = await import('commander');
    const { registerStatusCommand } = await import('../commands/status.js');
    const program = new Command();
    registerStatusCommand(program);
    await program.parseAsync(['status'], { from: 'user' });

    const consoleOutput = allConsoleOutput(processMocks.log);
    expect(consoleOutput).toContain('resize_image');
    expect(consoleOutput).toContain('deployed');
    expect(consoleOutput).toContain('Test App');
    expect(consoleOutput).toContain('AAFtest123');
  });

  test('shows local-only actions', async ({ client, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    actionsDiscovery.discoverActions.mockReturnValue([
      {
        name: 'my_handler',
        filePath: '/project/canup/actions/my_handler.py',
        language: 'python',
      },
    ]);

    client.getAppInfo.mockResolvedValue({ name: 'Test App', canvaAppId: 'AAFtest123' });
    client.listActions.mockResolvedValue([]);
    client.listSecrets.mockResolvedValue([]);
    client.listDeps.mockResolvedValue({ packages: [], layerSize: null, layerArn: null });

    const { Command } = await import('commander');
    const { registerStatusCommand } = await import('../commands/status.js');
    const program = new Command();
    registerStatusCommand(program);
    await program.parseAsync(['status'], { from: 'user' });

    const consoleOutput = allConsoleOutput(processMocks.log);
    expect(consoleOutput).toContain('my_handler');
    expect(consoleOutput).toContain('local only');
  });

  test('merges remote and local state -- remote takes priority, no duplicates', async ({
    client,
    processMocks,
  }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    actionsDiscovery.discoverActions.mockReturnValue([
      {
        name: 'shared_action',
        filePath: '/project/canup/actions/shared_action.js',
        language: 'nodejs',
      },
    ]);

    client.getAppInfo.mockResolvedValue({ name: 'Test App', canvaAppId: 'AAFtest123' });
    client.listActions.mockResolvedValue([
      {
        id: 'act-1',
        slug: 'shared_action',
        language: 'nodejs',
        deployed: true,
        contentHash: 'hash1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-02-20T00:00:00.000Z',
      },
    ]);
    client.listSecrets.mockResolvedValue([]);
    client.listDeps.mockResolvedValue({ packages: [], layerSize: null, layerArn: null });

    const { Command } = await import('commander');
    const { registerStatusCommand } = await import('../commands/status.js');
    const program = new Command();
    registerStatusCommand(program);
    await program.parseAsync(['status'], { from: 'user' });

    const consoleOutput = allConsoleOutput(processMocks.log);
    expect(consoleOutput).toContain('shared_action');
    expect(consoleOutput).toContain('deployed');
    expect(consoleOutput).not.toContain('local only');
  });

  test('shows empty state when no actions', async ({ client, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    actionsDiscovery.discoverActions.mockReturnValue([]);

    client.getAppInfo.mockResolvedValue({ name: 'Test App', canvaAppId: 'AAFtest123' });
    client.listActions.mockResolvedValue([]);
    client.listSecrets.mockResolvedValue([]);
    client.listDeps.mockResolvedValue({ packages: [], layerSize: null, layerArn: null });

    const { Command } = await import('commander');
    const { registerStatusCommand } = await import('../commands/status.js');
    const program = new Command();
    registerStatusCommand(program);
    await program.parseAsync(['status'], { from: 'user' });

    const consoleOutput = allConsoleOutput(processMocks.log);
    expect(consoleOutput).toContain('Actions: none');
  });

  test('shows secrets count', async ({ client, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    actionsDiscovery.discoverActions.mockReturnValue([]);

    client.getAppInfo.mockResolvedValue({ name: 'Test App', canvaAppId: 'AAFtest123' });
    client.listActions.mockResolvedValue([]);
    client.listSecrets.mockResolvedValue([
      { name: 'API_KEY', maskedValue: 'cnup_***', updatedAt: '2026-02-20T00:00:00.000Z' },
      { name: 'DB_URL', maskedValue: 'postgres_***', updatedAt: '2026-02-20T00:00:00.000Z' },
    ]);
    client.listDeps.mockResolvedValue({ packages: [], layerSize: null, layerArn: null });

    const { Command } = await import('commander');
    const { registerStatusCommand } = await import('../commands/status.js');
    const program = new Command();
    registerStatusCommand(program);
    await program.parseAsync(['status'], { from: 'user' });

    const consoleOutput = allConsoleOutput(processMocks.log);
    expect(consoleOutput).toContain('2 configured');
  });

  test('shows deps counts', async ({ client, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    actionsDiscovery.discoverActions.mockReturnValue([]);

    client.getAppInfo.mockResolvedValue({ name: 'Test App', canvaAppId: 'AAFtest123' });
    client.listActions.mockResolvedValue([]);
    client.listSecrets.mockResolvedValue([]);
    client.listDeps.mockImplementation((_appId: string, language: string) => {
      if (language === 'python') {
        return Promise.resolve({
          packages: [
            { name: 'requests', version: '2.31.0' },
            { name: 'pillow', version: '10.2.0' },
          ],
          layerSize: 1024,
          layerArn: 'arn:aws:lambda:layer',
        });
      }
      if (language === 'nodejs') {
        return Promise.resolve({
          packages: [{ name: 'lodash', version: '4.17.21' }],
          layerSize: 512,
          layerArn: 'arn:aws:lambda:layer2',
        });
      }
      return Promise.resolve({ packages: [], layerSize: null, layerArn: null });
    });

    const { Command } = await import('commander');
    const { registerStatusCommand } = await import('../commands/status.js');
    const program = new Command();
    registerStatusCommand(program);
    await program.parseAsync(['status'], { from: 'user' });

    const consoleOutput = allConsoleOutput(processMocks.log);
    expect(consoleOutput).toContain('python (2 packages)');
    expect(consoleOutput).toContain('nodejs (1 package)');
  });

  test('handles listDeps failure gracefully -- deps show none', async ({
    client,
    processMocks,
  }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    actionsDiscovery.discoverActions.mockReturnValue([]);

    client.getAppInfo.mockResolvedValue({ name: 'Test App', canvaAppId: 'AAFtest123' });
    client.listActions.mockResolvedValue([]);
    client.listSecrets.mockResolvedValue([]);
    client.listDeps.mockRejectedValue(new Error('not found'));

    const { Command } = await import('commander');
    const { registerStatusCommand } = await import('../commands/status.js');
    const program = new Command();
    registerStatusCommand(program);
    await program.parseAsync(['status'], { from: 'user' });

    const consoleOutput = allConsoleOutput(processMocks.log);
    expect(consoleOutput).toContain('Deps:');
    expect(consoleOutput).toContain('none');
    expect(processMocks.exit).not.toHaveBeenCalled();
  });

  test('handles 401 auth error', async ({ client, output, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    const authError = new Error('Unauthorized') as Error & { statusCode: number };
    authError.statusCode = 401;

    client.getAppInfo.mockRejectedValue(authError);
    client.listActions.mockRejectedValue(authError);
    client.listSecrets.mockRejectedValue(authError);
    client.listDeps.mockRejectedValue(authError);

    const { Command } = await import('commander');
    const { registerStatusCommand } = await import('../commands/status.js');
    const program = new Command();
    registerStatusCommand(program);
    await program.parseAsync(['status'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Not authenticated.');
    expect(output.hint).toHaveBeenCalledWith('Run `canup login` to re-authenticate.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles generic error', async ({ client, output, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    client.getAppInfo.mockRejectedValue(new Error('Network timeout'));
    client.listActions.mockResolvedValue([]);
    client.listSecrets.mockResolvedValue([]);
    client.listDeps.mockResolvedValue({ packages: [], layerSize: null, layerArn: null });

    const { Command } = await import('commander');
    const { registerStatusCommand } = await import('../commands/status.js');
    const program = new Command();
    registerStatusCommand(program);
    await program.parseAsync(['status'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Status failed: Network timeout');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
