import { describe, expect, vi } from 'vitest';
import { test, output, client, spinner, project, projectConfig } from '../../fixtures/cli.js';

const { mockExistsSync, mockReadFileSync, mockWriteFileSync, mockMkdirSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
}));

vi.mock('../../../src/cli/config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

vi.mock('../../../src/cli/config/project-config.js', () => projectConfig);

vi.mock('../../../src/cli/api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

vi.mock('../../../src/cli/ui/output.js', () => output);
vi.mock('../../../src/cli/ui/spinner.js', () => spinner);

vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs')>();
  return {
    ...original,
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
  };
});

async function runPull(...args: string[]) {
  const { Command } = await import('commander');
  const { registerPullCommand } = await import('../../../src/cli/commands/pull.js');
  const program = new Command();
  registerPullCommand(program);
  await program.parseAsync(['pull', ...args], { from: 'user' });
}

describe('pull command', () => {
  test('pulls new action when no local file exists', async ({ client, output, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    mockExistsSync.mockReturnValue(false);

    client.listActionsWithScript.mockResolvedValue([
      {
        id: '1',
        slug: 'hello',
        language: 'python',
        deployed: true,
        contentHash: 'abc',
        script: 'print("hi")',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    await runPull();

    expect(mockMkdirSync).toHaveBeenCalledWith('/project/canup/actions', { recursive: true });
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      '/project/canup/actions/hello.py',
      'print("hi")',
    );
    expect(output.info).toHaveBeenCalledWith('Pulled hello.py');
    expect(output.success).toHaveBeenCalledWith('Pulled 1 action');
  });

  test('pulls Node.js action with .ts extension', async ({ client, output }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    mockExistsSync.mockReturnValue(false);

    client.listActionsWithScript.mockResolvedValue([
      {
        id: '1',
        slug: 'greet',
        language: 'nodejs',
        deployed: true,
        contentHash: 'abc',
        script: 'export default () => "hi"',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    await runPull();

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      '/project/canup/actions/greet.ts',
      'export default () => "hi"',
    );
    expect(output.info).toHaveBeenCalledWith('Pulled greet.ts');
  });

  test('skips actions with no deployed script', async ({ client, output }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    client.listActionsWithScript.mockResolvedValue([
      {
        id: '1',
        slug: 'empty',
        language: 'python',
        deployed: false,
        contentHash: null,
        script: null,
        createdAt: '',
        updatedAt: '',
      },
    ]);

    await runPull();

    expect(mockWriteFileSync).not.toHaveBeenCalled();
    expect(output.info).toHaveBeenCalledWith('No deployed actions to pull');
  });

  test('detects up-to-date files via hash comparison', async ({ client, output }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    const code = 'print("hello")';
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(code);

    client.listActionsWithScript.mockResolvedValue([
      {
        id: '1',
        slug: 'hello',
        language: 'python',
        deployed: true,
        contentHash: 'x',
        script: code,
        createdAt: '',
        updatedAt: '',
      },
    ]);

    await runPull();

    expect(mockWriteFileSync).not.toHaveBeenCalled();
    expect(output.success).toHaveBeenCalledWith(expect.stringContaining('1 up to date'));
  });

  test('warns on conflict without --force', async ({ client, output }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('local version');

    client.listActionsWithScript.mockResolvedValue([
      {
        id: '1',
        slug: 'hello',
        language: 'python',
        deployed: true,
        contentHash: 'x',
        script: 'remote version',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    await runPull();

    expect(mockWriteFileSync).not.toHaveBeenCalled();
    expect(output.warn).toHaveBeenCalledWith(expect.stringContaining('hello.py'));
    expect(output.warn).toHaveBeenCalledWith(expect.stringContaining('--force'));
    expect(output.success).toHaveBeenCalledWith(expect.stringContaining('1 skipped'));
  });

  test('overwrites conflicting file with --force', async ({ client, output }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('local version');

    client.listActionsWithScript.mockResolvedValue([
      {
        id: '1',
        slug: 'hello',
        language: 'python',
        deployed: true,
        contentHash: 'x',
        script: 'remote version',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    await runPull('--force');

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      '/project/canup/actions/hello.py',
      'remote version',
    );
    expect(output.info).toHaveBeenCalledWith('Pulled hello.py (overwritten)');
  });

  test('filters to specific slug when provided', async ({ client, output }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    mockExistsSync.mockReturnValue(false);

    client.listActionsWithScript.mockResolvedValue([
      {
        id: '1',
        slug: 'alpha',
        language: 'python',
        deployed: true,
        contentHash: 'a',
        script: 'a()',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        slug: 'beta',
        language: 'python',
        deployed: true,
        contentHash: 'b',
        script: 'b()',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    await runPull('alpha');

    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    expect(mockWriteFileSync).toHaveBeenCalledWith('/project/canup/actions/alpha.py', 'a()');
  });

  test('exits with error when slug not found', async ({ client, output, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    client.listActionsWithScript.mockResolvedValue([
      {
        id: '1',
        slug: 'alpha',
        language: 'python',
        deployed: true,
        contentHash: 'a',
        script: 'a()',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    await runPull('nonexistent');

    expect(output.error).toHaveBeenCalledWith("Action 'nonexistent' not found");
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles 401 API error with re-auth hint', async ({ client, output, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    const apiError = new Error('Unauthorized') as Error & { statusCode: number };
    apiError.statusCode = 401;
    client.listActionsWithScript.mockRejectedValue(apiError);

    await runPull();

    expect(output.error).toHaveBeenCalledWith('Unauthorized');
    expect(output.hint).toHaveBeenCalledWith('Run `canup init` to re-authenticate.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles multiple actions with mixed states', async ({ client, output }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

    const deployedCode = 'deployed()';

    // Action 1: new file (no local)
    // Action 2: up to date (same hash)
    // Action 3: not deployed (null script)
    mockExistsSync.mockImplementation((path: string) => {
      if (typeof path === 'string' && path.includes('existing')) return true;
      return false;
    });
    mockReadFileSync.mockReturnValue(deployedCode);

    client.listActionsWithScript.mockResolvedValue([
      {
        id: '1',
        slug: 'new-action',
        language: 'python',
        deployed: true,
        contentHash: 'a',
        script: 'new()',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '2',
        slug: 'existing',
        language: 'python',
        deployed: true,
        contentHash: 'b',
        script: deployedCode,
        createdAt: '',
        updatedAt: '',
      },
      {
        id: '3',
        slug: 'undeployed',
        language: 'python',
        deployed: false,
        contentHash: null,
        script: null,
        createdAt: '',
        updatedAt: '',
      },
    ]);

    await runPull();

    expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    expect(mockWriteFileSync).toHaveBeenCalledWith('/project/canup/actions/new-action.py', 'new()');
    expect(output.success).toHaveBeenCalledWith(expect.stringContaining('1 up to date'));
  });
});
