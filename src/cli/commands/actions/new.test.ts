import { describe, expect, vi } from 'vitest';
import { test, output, project, projectConfig } from '#test/fixtures.js';

const { mockExistsSync, mockWriteFileSync, mockMkdirSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockMkdirSync: vi.fn(),
}));

vi.mock('../../config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

vi.mock('../../config/project-config.js', () => projectConfig);

vi.mock('../../ui/output.js', () => output);

vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs')>();
  return {
    ...original,
    existsSync: mockExistsSync,
    writeFileSync: mockWriteFileSync,
    mkdirSync: mockMkdirSync,
  };
});

describe('actions new command', () => {
  test('creates python action with .py extension and python template', async ({
    output,
    processMocks,
  }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    mockExistsSync.mockReturnValue(false);

    const { Command } = await import('commander');
    const { registerActionsNewAction } =
      await import('../../commands/actions/new.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsNewAction(actions);

    await program.parseAsync(['actions', 'new', 'my-action', '--lang', 'python'], { from: 'user' });

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      '/project/canup/actions/my-action.py',
      expect.stringContaining('def handler'),
    );
    expect(output.success).toHaveBeenCalledWith('Created my-action');
    expect(output.label).toHaveBeenCalledWith('File', '/project/canup/actions/my-action.py');
  });

  test('creates nodejs action (default lang) with .js extension and nodejs template', async ({
    output,
    processMocks,
  }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    mockExistsSync.mockReturnValue(false);

    const { Command } = await import('commander');
    const { registerActionsNewAction } =
      await import('../../commands/actions/new.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsNewAction(actions);

    await program.parseAsync(['actions', 'new', 'my-action'], { from: 'user' });

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      '/project/canup/actions/my-action.js',
      expect.stringContaining('export async function handler'),
    );
    expect(output.success).toHaveBeenCalledWith('Created my-action');
    expect(output.label).toHaveBeenCalledWith('File', '/project/canup/actions/my-action.js');
  });

  test('rejects invalid action name', async ({ output, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    mockExistsSync.mockReturnValue(true);

    const { Command } = await import('commander');
    const { registerActionsNewAction } =
      await import('../../commands/actions/new.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsNewAction(actions);

    await program.parseAsync(['actions', 'new', 'A'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Invalid action name: A');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('rejects invalid language', async ({ output, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    mockExistsSync.mockReturnValue(true);

    const { Command } = await import('commander');
    const { registerActionsNewAction } =
      await import('../../commands/actions/new.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsNewAction(actions);

    await program.parseAsync(['actions', 'new', 'my-action', '--lang', 'ruby'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Invalid language: ruby');
    expect(output.hint).toHaveBeenCalledWith('Supported languages: python, nodejs');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('rejects when file already exists', async ({ output, processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    mockExistsSync.mockReturnValue(true);

    const { Command } = await import('commander');
    const { registerActionsNewAction } =
      await import('../../commands/actions/new.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsNewAction(actions);

    await program.parseAsync(['actions', 'new', 'my-action'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith(
      'Action file already exists: /project/canup/actions/my-action.js',
    );
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('creates actions directory via mkdirSync', async ({ processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    mockExistsSync.mockReturnValue(false);

    const { Command } = await import('commander');
    const { registerActionsNewAction } =
      await import('../../commands/actions/new.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsNewAction(actions);

    await program.parseAsync(['actions', 'new', 'my-action'], { from: 'user' });

    expect(mockMkdirSync).toHaveBeenCalledWith('/project/canup/actions', { recursive: true });
  });

  test('template contains the action name', async ({ processMocks }) => {
    projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');
    mockExistsSync.mockReturnValue(false);

    const { Command } = await import('commander');
    const { registerActionsNewAction } =
      await import('../../commands/actions/new.js');

    const program = new Command();
    const actions = program.command('actions');
    registerActionsNewAction(actions);

    await program.parseAsync(['actions', 'new', 'greeting', '--lang', 'python'], { from: 'user' });

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Hello from greeting!'),
    );
  });
});
