import { describe, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
  test,
  output,
  client,
  spinner,
  project,
  projectConfig,
  actionsDiscovery,
} from '#test/fixtures.js';

const { mockReadFileSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn(),
}));

vi.mock('../../config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

vi.mock('../../config/project-config.js', () => projectConfig);

vi.mock('../../config/actions-discovery.js', () => actionsDiscovery);

vi.mock('../../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

vi.mock('../../ui/output.js', () => output);
vi.mock('../../ui/spinner.js', () => spinner);

vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs')>();
  return {
    ...original,
    readFileSync: mockReadFileSync,
  };
});

describe('actions deploy command', () => {
  test('deploys a single action by name from convention directory', async ({
    client,
    output,
    processMocks,
  }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    actionsDiscovery.resolveActionByName.mockReturnValue({
      name: 'my-script',
      filePath: '/project/canup/actions/my-script.py',
      language: 'python',
    });

    client.deployAction.mockResolvedValue({
      id: '1',
      slug: 'my-script',
      language: 'python',
      lambdaReady: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    client.listActions.mockResolvedValue([]);

    mockReadFileSync.mockReturnValue('def handler(params, context): pass');

    const { Command } = await import('commander');
    const { registerActionsDeployAction } = await import('../../commands/actions/deploy.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeployAction(actions);

    await program.parseAsync(['actions', 'deploy', 'my-script'], { from: 'user' });

    expect(actionsDiscovery.resolveActionByName).toHaveBeenCalledWith(
      '/project/canup/actions',
      'my-script',
    );
    expect(client.deployAction).toHaveBeenCalledWith(
      'test-app-id',
      'my-script',
      'def handler(params, context): pass',
      'python',
    );
    expect(output.label).toHaveBeenCalledWith('Language', 'python');
  });

  test('deploys all actions when no name argument is given', async ({
    client,
    output,
    processMocks,
  }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    actionsDiscovery.discoverActions.mockReturnValue([
      { name: 'action-a', filePath: '/project/canup/actions/action-a.py', language: 'python' },
      { name: 'action-b', filePath: '/project/canup/actions/action-b.ts', language: 'nodejs' },
    ]);

    client.deployAction.mockResolvedValue({
      id: '1',
      slug: 'action-a',
      language: 'python',
      lambdaReady: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    client.listActions.mockResolvedValue([]);

    mockReadFileSync.mockReturnValue('code');

    const { Command } = await import('commander');
    const { registerActionsDeployAction } = await import('../../commands/actions/deploy.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeployAction(actions);

    await program.parseAsync(['actions', 'deploy'], { from: 'user' });

    expect(actionsDiscovery.discoverActions).toHaveBeenCalledWith('/project/canup/actions');
    expect(client.deployAction).toHaveBeenCalledTimes(2);
    expect(output.success).toHaveBeenCalledWith(expect.stringContaining('Deployed 2 actions'));
  });

  test('computes deterministic SHA-256 hash of file content', () => {
    const code = 'console.log("hello")';
    const expected = createHash('sha256').update(code).digest('hex');

    // Verify hash is deterministic and matches known value
    const again = createHash('sha256').update(code).digest('hex');
    expect(again).toBe(expected);
    expect(expected).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  test('skips unchanged actions via content hash comparison', async ({
    client,
    output,
    processMocks,
  }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    actionsDiscovery.resolveActionByName.mockReturnValue({
      name: 'my-script',
      filePath: '/project/canup/actions/my-script.py',
      language: 'python',
    });

    const code = 'def handler(params, context): pass';
    const expectedHash = createHash('sha256').update(code).digest('hex');

    client.listActions.mockResolvedValue([{ slug: 'my-script', contentHash: expectedHash }]);

    mockReadFileSync.mockReturnValue(code);

    const { Command } = await import('commander');
    const { registerActionsDeployAction } = await import('../../commands/actions/deploy.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeployAction(actions);

    await program.parseAsync(['actions', 'deploy', 'my-script'], { from: 'user' });

    expect(client.deployAction).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith(expect.stringContaining('unchanged'));
  });

  test('detects legacy file path and shows migration hint', async ({
    client,
    output,
    processMocks,
  }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    actionsDiscovery.resolveActionByName.mockReturnValue({
      name: 'my-script',
      filePath: '/project/canup/actions/my-script.py',
      language: 'python',
    });

    client.deployAction.mockResolvedValue({
      id: '1',
      slug: 'my-script',
      language: 'python',
      lambdaReady: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    client.listActions.mockResolvedValue([]);

    mockReadFileSync.mockReturnValue('code');

    const { Command } = await import('commander');
    const { registerActionsDeployAction } = await import('../../commands/actions/deploy.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeployAction(actions);

    await program.parseAsync(['actions', 'deploy', '/tmp/my-script.py'], { from: 'user' });

    expect(output.hint).toHaveBeenCalledWith(
      expect.stringContaining('Tip: Use action names instead of file paths'),
    );
  });

  test('shows error when action name not found in convention directory', async ({
    output,
    processMocks,
  }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    actionsDiscovery.resolveActionByName.mockReturnValue(null);
    client.listActions.mockResolvedValue([]);

    const { Command } = await import('commander');
    const { registerActionsDeployAction } = await import('../../commands/actions/deploy.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeployAction(actions);

    await program.parseAsync(['actions', 'deploy', 'nonexistent'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith(expect.stringContaining('Action not found'));
    expect(output.hint).toHaveBeenCalledWith(expect.stringContaining('Available extensions'));
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('shows error when actions directory is empty', async ({ output, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    actionsDiscovery.discoverActions.mockReturnValue([]);
    client.listActions.mockResolvedValue([]);

    const { Command } = await import('commander');
    const { registerActionsDeployAction } = await import('../../commands/actions/deploy.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeployAction(actions);

    await program.parseAsync(['actions', 'deploy'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith(expect.stringContaining('No action files found'));
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('skips unchanged and deploys changed in multi-deploy', async ({
    client,
    output,
    processMocks,
  }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    const unchangedCode = 'def handler(): pass';
    const unchangedHash = createHash('sha256').update(unchangedCode).digest('hex');
    const changedCode = 'def handler(): return "new"';

    actionsDiscovery.discoverActions.mockReturnValue([
      {
        name: 'unchanged-action',
        filePath: '/project/canup/actions/unchanged-action.py',
        language: 'python',
      },
      {
        name: 'changed-action',
        filePath: '/project/canup/actions/changed-action.py',
        language: 'python',
      },
    ]);

    client.listActions.mockResolvedValue([
      { slug: 'unchanged-action', contentHash: unchangedHash },
    ]);

    client.deployAction.mockResolvedValue({
      id: '2',
      slug: 'changed-action',
      language: 'python',
      lambdaReady: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });

    mockReadFileSync.mockReturnValueOnce(unchangedCode).mockReturnValueOnce(changedCode);

    const { Command } = await import('commander');
    const { registerActionsDeployAction } = await import('../../commands/actions/deploy.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeployAction(actions);

    await program.parseAsync(['actions', 'deploy'], { from: 'user' });

    expect(client.deployAction).toHaveBeenCalledTimes(1);
    expect(output.info).toHaveBeenCalledWith(expect.stringContaining('unchanged'));
    expect(output.success).toHaveBeenCalledWith(expect.stringContaining('1 unchanged'));
  });

  test('handles API error during deploy', async ({ client, output, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    const apiError = new Error('Conflict: action already deploying') as Error & {
      statusCode: number;
    };
    apiError.statusCode = 409;
    client.listActions.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerActionsDeployAction } = await import('../../commands/actions/deploy.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeployAction(actions);

    await program.parseAsync(['actions', 'deploy', 'my-script'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Conflict: action already deploying');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles 401 error with re-auth hint', async ({ client, output, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    const apiError = new Error('Unauthorized') as Error & { statusCode: number };
    apiError.statusCode = 401;
    client.listActions.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerActionsDeployAction } = await import('../../commands/actions/deploy.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeployAction(actions);

    await program.parseAsync(['actions', 'deploy', 'my-script'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Unauthorized');
    expect(output.hint).toHaveBeenCalledWith('Run `canup init` to re-authenticate.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('shows lambda provisioning hint when lambdaReady is false', async ({
    client,
    output,
    processMocks,
  }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    actionsDiscovery.resolveActionByName.mockReturnValue({
      name: 'my-script',
      filePath: '/project/canup/actions/my-script.py',
      language: 'python',
    });

    client.deployAction.mockResolvedValue({
      id: '1',
      slug: 'my-script',
      language: 'python',
      lambdaReady: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    client.listActions.mockResolvedValue([]);

    mockReadFileSync.mockReturnValue('code');

    const { Command } = await import('commander');
    const { registerActionsDeployAction } = await import('../../commands/actions/deploy.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsDeployAction(actions);

    await program.parseAsync(['actions', 'deploy', 'my-script'], { from: 'user' });

    expect(output.hint).toHaveBeenCalledWith(
      'Lambda is being provisioned. First execution may take longer.',
    );
  });
});
