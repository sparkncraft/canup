import { describe, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  test,
  output,
  client,
  spinner,
  project,
  projectConfig,
  actionsDiscovery,
} from '#test/fixtures.js';

const { mockReadFileSync, mockWriteFileSync, mockUnlinkSync, mockExistsSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
  mockUnlinkSync: vi.fn(),
  mockExistsSync: vi.fn(),
}));

const { mockSpawn } = vi.hoisted(() => ({ mockSpawn: vi.fn() }));

const { mockCreateRequire } = vi.hoisted(() => ({ mockCreateRequire: vi.fn() }));

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
    writeFileSync: mockWriteFileSync,
    unlinkSync: mockUnlinkSync,
    existsSync: mockExistsSync,
  };
});

vi.mock('node:child_process', () => ({
  spawn: mockSpawn,
}));

vi.mock('node:module', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:module')>();
  return {
    ...original,
    createRequire: mockCreateRequire,
  };
});

function createMockProcess(stdoutData: string, stderrData: string) {
  const proc = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  setTimeout(() => {
    if (stdoutData) proc.stdout.emit('data', Buffer.from(stdoutData));
    if (stderrData) proc.stderr.emit('data', Buffer.from(stderrData));
    proc.emit('close', 0);
  }, 5);
  return proc;
}

beforeEach(() => {
  mockCreateRequire.mockReturnValue({
    resolve: vi.fn().mockReturnValue('/fake/node_modules/tsx/dist/cli.mjs'),
  });
});

async function runTest(...extraArgs: string[]) {
  const { Command } = await import('commander');
  const { registerActionsTestAction } =
    await import('../../commands/actions/test.js');

  const program = new Command();
  const actions = program.command('actions');
  registerActionsTestAction(actions);

  await program.parseAsync(['actions', 'test', ...extraArgs], { from: 'user' });
}

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

      await runTest('my-script.py', '--remote');

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

      await runTest('my-script.py', '--remote', '--params', '{"key":"val"}');

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

      await runTest('handler.ts', '--remote');

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

      await runTest('handler.ts', '--remote');

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

      await runTest('my-action', '--remote');

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

  describe('local test (default)', () => {
    test('spawns python3 for .py files', async ({ output, processMocks }) => {
      mockExistsSync.mockReturnValue(true);

      const resultJson = JSON.stringify({ ok: true, data: { answer: 42 }, duration_ms: 50 });
      mockSpawn.mockReturnValue(createMockProcess(`\n__CANUP_RESULT__${resultJson}`, ''));

      await runTest('my-script.py');

      expect(mockSpawn).toHaveBeenCalledWith(
        'python3',
        expect.arrayContaining([expect.stringContaining('.py')]),
        expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'] }),
      );
      expect(output.success).toHaveBeenCalledWith('Test passed');
    });

    test('spawns node with tsx for .ts files', async ({ output, processMocks }) => {
      mockExistsSync.mockReturnValue(true);

      const resultJson = JSON.stringify({ ok: true, data: null, duration_ms: 30 });
      mockSpawn.mockReturnValue(createMockProcess(`\n__CANUP_RESULT__${resultJson}`, ''));

      await runTest('handler.ts');

      expect(mockSpawn).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining(['/fake/node_modules/tsx/dist/cli.mjs']),
        expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'] }),
      );
    });

    test('spawns node with tsx for .mjs files', async ({ output, processMocks }) => {
      mockExistsSync.mockReturnValue(true);

      const resultJson = JSON.stringify({ ok: true, data: null, duration_ms: 10 });
      mockSpawn.mockReturnValue(createMockProcess(`\n__CANUP_RESULT__${resultJson}`, ''));

      await runTest('handler.mjs');

      expect(mockSpawn).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining([expect.stringContaining('.mjs')]),
        expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'] }),
      );
    });

    test('displays local test error result', async ({ output, processMocks }) => {
      mockExistsSync.mockReturnValue(true);

      const resultJson = JSON.stringify({
        ok: false,
        error: { type: 'ValueError', message: 'bad input', stack_trace: 'line 5' },
        duration_ms: 20,
      });
      mockSpawn.mockReturnValue(createMockProcess('', `\n__CANUP_RESULT__${resultJson}`));

      await runTest('my-script.py');

      expect(output.error).toHaveBeenCalledWith(
        expect.stringContaining('ValueError: bad input'),
      );
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('passes params from --params to local test context', async ({ output, processMocks }) => {
      mockExistsSync.mockReturnValue(true);

      const resultJson = JSON.stringify({ ok: true, data: 'ok', duration_ms: 5 });
      mockSpawn.mockReturnValue(createMockProcess(`\n__CANUP_RESULT__${resultJson}`, ''));

      await runTest('my-script.py', '--params', '{"key":"val"}');

      expect(mockWriteFileSync).toHaveBeenCalled();
      const [wrapperPath, wrapperContent] = mockWriteFileSync.mock.calls[0] as [string, string];
      expect(wrapperPath).toContain('.py');
      expect(wrapperContent).toContain('key');
      expect(wrapperContent).toContain('val');
    });

    test('cleans up temp wrapper file after local test', async ({ output, processMocks }) => {
      mockExistsSync.mockReturnValue(true);

      const resultJson = JSON.stringify({ ok: true, data: null, duration_ms: 5 });
      mockSpawn.mockReturnValue(createMockProcess(`\n__CANUP_RESULT__${resultJson}`, ''));

      await runTest('my-script.py');

      expect(mockUnlinkSync).toHaveBeenCalled();
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

      await runTest('my-script.py', '--remote');

      expect(output.error).toHaveBeenCalledWith('Action not found on server.');
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('handles 401 authentication error', async ({
      client,
      output,
      processMocks,
    }) => {
      mockExistsSync.mockReturnValue(true);

      const apiError = new Error('Unauthorized') as Error & { statusCode: number };
      apiError.statusCode = 401;
      client.testAction.mockRejectedValue(apiError);

      mockReadFileSync.mockReturnValue('code');

      await runTest('my-script.py', '--remote');

      expect(output.error).toHaveBeenCalledWith('Not authenticated.');
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('exits on unsupported file extension', async ({ output, processMocks }) => {
      mockExistsSync.mockReturnValue(true);

      const resultJson = JSON.stringify({ ok: true, data: null, duration_ms: 0 });
      mockSpawn.mockReturnValue(createMockProcess(`\n__CANUP_RESULT__${resultJson}`, ''));

      await runTest('./scripts/handler.rb');

      expect(output.error).toHaveBeenCalledWith(expect.stringContaining('Unsupported file extension'));
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('exits when --params contains invalid JSON', async ({ output, processMocks }) => {
      mockExistsSync.mockReturnValue(false);

      await runTest('my-script.py', '--params', '{not json');

      expect(output.error).toHaveBeenCalledWith(expect.stringContaining('Invalid --params'));
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('exits when action file is not found', async ({ output, processMocks }) => {
      mockExistsSync.mockReturnValue(false);
      actionsDiscovery.resolveActionByName.mockReturnValue(null);

      await runTest('nonexistent');

      expect(output.error).toHaveBeenCalledWith(expect.stringContaining('Action not found'));
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

      await runTest('handler.js', '--remote');

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

      await runTest('my-script.py', '--remote');

      expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('500ms'));
    });

    test('formats second duration for result over 1000ms', async ({ client, processMocks }) => {
      mockExistsSync.mockReturnValue(true);

      client.testAction.mockResolvedValue({
        ok: true,
        data: { result: 'value', durationMs: 1500, printOutput: '' },
      });

      mockReadFileSync.mockReturnValue('code');

      await runTest('my-script.py', '--remote');

      expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('1.5s'));
    });
  });
});
