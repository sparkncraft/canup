import { describe, expect, vi } from 'vitest';
import {
  test,
  output,
  client,
  spinner,
  project,
  projectConfig,
  actionsDiscovery,
} from '../../../fixtures/cli.js';

const { mockReadFileSync, mockWriteFileSync, mockUnlinkSync, mockExistsSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockUnlinkSync: vi.fn(),
  mockExistsSync: vi.fn(),
}));

vi.mock('../../../../src/cli/config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

vi.mock('../../../../src/cli/config/project-config.js', () => projectConfig);

vi.mock('../../../../src/cli/config/actions-discovery.js', () => actionsDiscovery);

vi.mock('../../../../src/cli/api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

vi.mock('../../../../src/cli/ui/output.js', () => output);
vi.mock('../../../../src/cli/ui/spinner.js', () => spinner);

vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs')>();
  return {
    ...original,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
    unlinkSync: mockUnlinkSync,
    existsSync: mockExistsSync,
  };
});

describe('actions test command', () => {
  describe('remote test (--remote)', () => {
    test('sends code to API and displays success result', async ({
      client,
      output,
      processMocks,
    }) => {
      mockExistsSync.mockReturnValue(true);

      client.testAction.mockResolvedValue({
        ok: true,
        data: { result: { answer: 42 }, durationMs: 120, printOutput: '' },
      });

      mockReadFileSync.mockReturnValue('def handler(p, c): return {"answer": 42}');

      const { Command } = await import('commander');
      const { registerActionsTestAction } =
        await import('../../../../src/cli/commands/actions/test.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsTestAction(actions);

      await program.parseAsync(['actions', 'test', 'my-script.py', '--remote'], { from: 'user' });

      expect(client.testAction).toHaveBeenCalledWith(
        'test-app-id',
        'my-script',
        'def handler(p, c): return {"answer": 42}',
        'python',
        {},
      );
      expect(output.success).toHaveBeenCalledWith('Test passed');
    });

    test('sends JSON params when --params is provided', async ({ client, processMocks }) => {
      mockExistsSync.mockReturnValue(true);

      client.testAction.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 50, printOutput: '' },
      });

      mockReadFileSync.mockReturnValue('def handler(p, c): pass');

      const { Command } = await import('commander');
      const { registerActionsTestAction } =
        await import('../../../../src/cli/commands/actions/test.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsTestAction(actions);

      await program.parseAsync(
        ['actions', 'test', 'my-script.py', '--remote', '--params', '{"key":"val"}'],
        { from: 'user' },
      );

      expect(client.testAction).toHaveBeenCalledWith(
        'test-app-id',
        'my-script',
        'def handler(p, c): pass',
        'python',
        { key: 'val' },
      );
    });

    test('displays error result for failed remote test', async ({
      client,
      output,
      processMocks,
    }) => {
      mockExistsSync.mockReturnValue(true);

      client.testAction.mockResolvedValue({
        ok: false,
        error: {
          type: 'TypeError',
          message: 'x is not defined',
          stackTrace: 'at line 5',
          durationMs: 80,
          printOutput: 'debug info',
        },
      });

      mockReadFileSync.mockReturnValue('export const handler = () => { throw new Error() }');

      const { Command } = await import('commander');
      const { registerActionsTestAction } =
        await import('../../../../src/cli/commands/actions/test.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsTestAction(actions);

      await program.parseAsync(['actions', 'test', 'handler.ts', '--remote'], { from: 'user' });

      expect(output.error).toHaveBeenCalledWith(
        expect.stringContaining('TypeError: x is not defined'),
      );
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('normalizes nodejs-ts language to nodejs for API call', async ({
      client,
      processMocks,
    }) => {
      mockExistsSync.mockReturnValue(true);

      client.testAction.mockResolvedValue({
        ok: true,
        data: { result: 'ok', durationMs: 30, printOutput: '' },
      });

      mockReadFileSync.mockReturnValue('export const handler = () => "ok"');

      const { Command } = await import('commander');
      const { registerActionsTestAction } =
        await import('../../../../src/cli/commands/actions/test.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsTestAction(actions);

      await program.parseAsync(['actions', 'test', 'handler.ts', '--remote'], { from: 'user' });

      expect(client.testAction).toHaveBeenCalledWith(
        'test-app-id',
        'handler',
        expect.any(String),
        'nodejs',
        {},
      );
    });

    test('resolves bare name from convention directory for remote test', async ({
      client,
      processMocks,
    }) => {
      mockExistsSync.mockReturnValue(true);

      projectConfig.getActionsDir.mockReturnValue('/project/canup/actions');

      actionsDiscovery.resolveActionByName.mockReturnValue({
        name: 'my-action',
        filePath: '/project/canup/actions/my-action.py',
        language: 'python',
      });

      client.testAction.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 10, printOutput: '' },
      });

      mockReadFileSync.mockReturnValue('def handler(p, c): pass');

      const { Command } = await import('commander');
      const { registerActionsTestAction } =
        await import('../../../../src/cli/commands/actions/test.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsTestAction(actions);

      await program.parseAsync(['actions', 'test', 'my-action', '--remote'], { from: 'user' });

      expect(actionsDiscovery.resolveActionByName).toHaveBeenCalledWith(
        '/project/canup/actions',
        'my-action',
      );
      expect(client.testAction).toHaveBeenCalledWith(
        'test-app-id',
        'my-action',
        'def handler(p, c): pass',
        'python',
        {},
      );
    });
  });

  describe('error handling', () => {
    test('handles 404 error for missing action on remote test', async ({
      client,
      output,
      processMocks,
    }) => {
      mockExistsSync.mockReturnValue(true);

      const apiError = new Error('Not found') as Error & { statusCode: number };
      apiError.statusCode = 404;
      client.testAction.mockRejectedValue(apiError);

      mockReadFileSync.mockReturnValue('code');

      const { Command } = await import('commander');
      const { registerActionsTestAction } =
        await import('../../../../src/cli/commands/actions/test.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsTestAction(actions);

      await program.parseAsync(['actions', 'test', 'my-script.py', '--remote'], { from: 'user' });

      expect(output.error).toHaveBeenCalledWith('Action not found on server.');
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('detects .js files as nodejs-js (normalizes to nodejs for API)', async ({
      client,
      processMocks,
    }) => {
      mockExistsSync.mockReturnValue(true);

      client.testAction.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 10, printOutput: '' },
      });

      mockReadFileSync.mockReturnValue('exports.handler = () => {}');

      const { Command } = await import('commander');
      const { registerActionsTestAction } =
        await import('../../../../src/cli/commands/actions/test.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsTestAction(actions);

      await program.parseAsync(['actions', 'test', 'handler.js', '--remote'], { from: 'user' });

      expect(client.testAction).toHaveBeenCalledWith(
        'test-app-id',
        'handler',
        expect.any(String),
        'nodejs',
        {},
      );
    });
  });

  describe('formatDuration (indirect via display output)', () => {
    test('formats millisecond duration for successful result', async ({ client, processMocks }) => {
      mockExistsSync.mockReturnValue(true);

      client.testAction.mockResolvedValue({
        ok: true,
        data: { result: 'value', durationMs: 500, printOutput: '' },
      });

      mockReadFileSync.mockReturnValue('code');

      const { Command } = await import('commander');
      const { registerActionsTestAction } =
        await import('../../../../src/cli/commands/actions/test.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsTestAction(actions);

      await program.parseAsync(['actions', 'test', 'my-script.py', '--remote'], { from: 'user' });

      expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('500ms'));
    });

    test('formats second duration for result over 1000ms', async ({ client, processMocks }) => {
      mockExistsSync.mockReturnValue(true);

      client.testAction.mockResolvedValue({
        ok: true,
        data: { result: 'value', durationMs: 1500, printOutput: '' },
      });

      mockReadFileSync.mockReturnValue('code');

      const { Command } = await import('commander');
      const { registerActionsTestAction } =
        await import('../../../../src/cli/commands/actions/test.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsTestAction(actions);

      await program.parseAsync(['actions', 'test', 'my-script.py', '--remote'], { from: 'user' });

      expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('1.5s'));
    });
  });
});
