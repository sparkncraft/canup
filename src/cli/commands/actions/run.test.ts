import { describe, expect, vi } from 'vitest';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test as baseTest, output, client, spinner, project } from '#test/fixtures.js';

const test = baseTest.extend('tmpFile', async ({}, { onCleanup }) => {
  const file = join(tmpdir(), `canup-run-test-${Date.now()}.json`);
  onCleanup(() => {
    try {
      unlinkSync(file);
    } catch {
      /* file may not exist */
    }
  });
  return file;
});

vi.mock('../../config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

vi.mock('../../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

vi.mock('../../ui/output.js', () => output);
vi.mock('../../ui/spinner.js', () => spinner);

/** A deployed, code-backed action returned by listActionsWithScript. */
function deployedAction(slug: string, code = 'def handler(p, c): return 1', language = 'python') {
  return {
    id: `act-${slug}`,
    slug,
    language,
    deployed: true,
    contentHash: 'hash',
    script: code,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

/** A track-only action (no deployed code, no language). */
function trackOnlyAction(slug: string) {
  return {
    id: `act-${slug}`,
    slug,
    language: null,
    deployed: false,
    contentHash: null,
    script: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('actions run command', () => {
  describe('command handler', () => {
    test('fetches deployed code then invokes the test endpoint with no params', async ({
      client,
      processMocks,
    }) => {
      client.listActionsWithScript.mockResolvedValue([
        deployedAction('my-action', 'def handler(p, c): return 1', 'python'),
      ]);
      client.testCode.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 50, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(client.listActionsWithScript).toHaveBeenCalledWith('test-app-id');
      expect(client.testCode).toHaveBeenCalledWith(
        'test-app-id',
        'def handler(p, c): return 1',
        'python',
        {},
      );
    });

    test('forwards inline JSON params to the test endpoint', async ({ client, processMocks }) => {
      client.listActionsWithScript.mockResolvedValue([deployedAction('my-action')]);
      client.testCode.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 50, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action', '--params', '{"key":"val"}'], {
        from: 'user',
      });

      expect(client.testCode).toHaveBeenCalledWith(
        'test-app-id',
        expect.any(String),
        'python',
        { key: 'val' },
      );
    });

    test('reads params from a JSON file path', async ({ client, tmpFile, processMocks }) => {
      writeFileSync(tmpFile, JSON.stringify({ fromFile: true, count: 3 }));

      client.listActionsWithScript.mockResolvedValue([deployedAction('my-action')]);
      client.testCode.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 50, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action', '--params', tmpFile], {
        from: 'user',
      });

      expect(client.testCode).toHaveBeenCalledWith('test-app-id', expect.any(String), 'python', {
        fromFile: true,
        count: 3,
      });
    });

    test('normalizes nodejs-variant languages to nodejs for the API', async ({
      client,
      processMocks,
    }) => {
      client.listActionsWithScript.mockResolvedValue([
        deployedAction('my-action', 'export const handler = () => 1', 'nodejs'),
      ]);
      client.testCode.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 5, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(client.testCode).toHaveBeenCalledWith(
        'test-app-id',
        'export const handler = () => 1',
        'nodejs',
        {},
      );
    });

    test('displays success result with return value and duration', async ({
      client,
      output,
      processMocks,
    }) => {
      client.listActionsWithScript.mockResolvedValue([deployedAction('my-action')]);
      client.testCode.mockResolvedValue({
        ok: true,
        data: { result: { answer: 42 }, durationMs: 120, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(output.success).toHaveBeenCalledWith('Run succeeded');
      expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('"answer": 42'));
      expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('120ms'));
    });

    test('displays success result with printOutput', async ({ client, processMocks }) => {
      client.listActionsWithScript.mockResolvedValue([deployedAction('my-action')]);
      client.testCode.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 50, printOutput: 'hello from action' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(processMocks.log).toHaveBeenCalledWith('Output:');
      expect(processMocks.log).toHaveBeenCalledWith('hello from action');
    });

    test('displays error result with error type and message', async ({
      client,
      output,
      processMocks,
    }) => {
      client.listActionsWithScript.mockResolvedValue([deployedAction('my-action')]);
      client.testCode.mockResolvedValue({
        ok: false,
        error: {
          type: 'TypeError',
          message: 'x is not defined',
          durationMs: 80,
          printOutput: '',
        },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(output.error).toHaveBeenCalledWith('Run failed: TypeError: x is not defined');
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('displays error result with stack trace', async ({ client, processMocks }) => {
      client.listActionsWithScript.mockResolvedValue([deployedAction('my-action')]);
      client.testCode.mockResolvedValue({
        ok: false,
        error: {
          type: 'ReferenceError',
          message: 'foo is not defined',
          stackTrace: 'at line 10\n  at handler',
          durationMs: 60,
          printOutput: '',
        },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(processMocks.error).toHaveBeenCalledWith('at line 10\n  at handler');
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('displays error print output before error message', async ({ client, processMocks }) => {
      client.listActionsWithScript.mockResolvedValue([deployedAction('my-action')]);
      client.testCode.mockResolvedValue({
        ok: false,
        error: { type: 'Error', message: 'fail', durationMs: 10, printOutput: 'debug output here' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(processMocks.log).toHaveBeenCalledWith('Output:');
      expect(processMocks.log).toHaveBeenCalledWith('debug output here');
    });

    test('formats duration in seconds when >= 1000ms', async ({ client, processMocks }) => {
      client.listActionsWithScript.mockResolvedValue([deployedAction('my-action')]);
      client.testCode.mockResolvedValue({
        ok: true,
        data: { result: { value: 1 }, durationMs: 2500, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('2.5s'));
    });

    test('errors when the action has no deployed code (track-only)', async ({
      client,
      output,
      processMocks,
    }) => {
      client.listActionsWithScript.mockResolvedValue([trackOnlyAction('observe')]);

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'observe'], { from: 'user' });

      expect(output.error).toHaveBeenCalledWith(
        "Action 'observe' has no deployed code to run.",
      );
      expect(processMocks.exit).toHaveBeenCalledWith(1);
      expect(client.testCode).not.toHaveBeenCalled();
    });

    test('errors when the action name is not in the app', async ({
      client,
      output,
      processMocks,
    }) => {
      client.listActionsWithScript.mockResolvedValue([]);

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'missing'], { from: 'user' });

      expect(output.error).toHaveBeenCalledWith('Action not found: missing');
      expect(processMocks.exit).toHaveBeenCalledWith(1);
      expect(client.testCode).not.toHaveBeenCalled();
    });

    test('handles 401 error with authentication message', async ({
      client,
      output,
      processMocks,
    }) => {
      const apiError = new Error('Unauthorized') as Error & { statusCode: number };
      apiError.statusCode = 401;
      client.listActionsWithScript.mockRejectedValue(apiError);

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(output.error).toHaveBeenCalledWith('Not authenticated.');
      expect(output.hint).toHaveBeenCalledWith('Run `canup login` to re-authenticate.');
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('handles 404 error from the server with action name', async ({
      client,
      output,
      processMocks,
    }) => {
      const apiError = new Error('Not found') as Error & { statusCode: number };
      apiError.statusCode = 404;
      client.listActionsWithScript.mockRejectedValue(apiError);

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'nonexistent-action'], { from: 'user' });

      expect(output.error).toHaveBeenCalledWith('Action not found: nonexistent-action');
      expect(output.hint).toHaveBeenCalledWith(
        'Deploy the action first with `canup actions deploy`.',
      );
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('handles generic API error', async ({ client, output, processMocks }) => {
      client.listActionsWithScript.mockRejectedValue(new Error('Network timeout'));

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(output.error).toHaveBeenCalledWith('Run failed: Network timeout');
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('parseParams (tested indirectly through command)', () => {
    test('exits with error for invalid inline JSON', async ({ client, output, processMocks }) => {
      client.listActionsWithScript.mockResolvedValue([deployedAction('my-action')]);
      client.testCode.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 10, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action', '--params', '{invalid json}'], {
        from: 'user',
      });

      expect(output.error).toHaveBeenCalledWith('Invalid --params: failed to parse JSON string.');
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('exits with error for file containing invalid JSON', async ({
      client,
      output,
      tmpFile,
      processMocks,
    }) => {
      writeFileSync(tmpFile, 'not valid json content');

      client.listActionsWithScript.mockResolvedValue([deployedAction('my-action')]);
      client.testCode.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 10, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action', '--params', tmpFile], {
        from: 'user',
      });

      expect(output.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid --params: failed to parse JSON from file'),
      );
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('exits with error for non-existent file path that does not look like JSON', async ({
      client,
      output,
      processMocks,
    }) => {
      client.listActionsWithScript.mockResolvedValue([deployedAction('my-action')]);
      client.testCode.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 10, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(
        [
          'actions',
          'run',
          'my-action',
          '--params',
          '/tmp/nonexistent-file-that-does-not-exist.json',
        ],
        { from: 'user' },
      );

      expect(output.error).toHaveBeenCalledWith(
        'Invalid --params: must be a JSON string or path to a JSON file.',
      );
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });
  });
});
