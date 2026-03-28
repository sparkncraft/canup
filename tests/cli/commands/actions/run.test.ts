import { describe, expect, vi } from 'vitest';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test, output, client, spinner, project } from '../../../fixtures/cli.js';

vi.mock('../../../../src/cli/config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

vi.mock('../../../../src/cli/api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

vi.mock('../../../../src/cli/ui/output.js', () => output);
vi.mock('../../../../src/cli/ui/spinner.js', () => spinner);

describe('actions run command', () => {
  describe('command handler', () => {
    test('runs action with no params (empty object passed to API)', async ({
      client,
      processMocks,
    }) => {
      client.runAction.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 50, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(client.runAction).toHaveBeenCalledWith('test-app-id', 'my-action', {});
    });

    test('runs action with inline JSON params', async ({ client, processMocks }) => {
      client.runAction.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 50, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action', '--params', '{"key":"val"}'], {
        from: 'user',
      });

      expect(client.runAction).toHaveBeenCalledWith('test-app-id', 'my-action', { key: 'val' });
    });

    test('runs action with JSON file path for params', async ({ client, processMocks }) => {
      const tmpFile = join(tmpdir(), `canup-run-test-${Date.now()}.json`);
      writeFileSync(tmpFile, JSON.stringify({ fromFile: true, count: 3 }));

      try {
        client.runAction.mockResolvedValue({
          ok: true,
          data: { result: null, durationMs: 50, printOutput: '' },
        });

        const { Command } = await import('commander');
        const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

        const program = new Command();
        const actions = program.command('actions');
        registerActionsRunAction(actions);

        await program.parseAsync(['actions', 'run', 'my-action', '--params', tmpFile], {
          from: 'user',
        });

        expect(client.runAction).toHaveBeenCalledWith('test-app-id', 'my-action', {
          fromFile: true,
          count: 3,
        });
      } finally {
        unlinkSync(tmpFile);
      }
    });

    test('displays success result with return value and duration', async ({
      client,
      output,
      processMocks,
    }) => {
      client.runAction.mockResolvedValue({
        ok: true,
        data: { result: { answer: 42 }, durationMs: 120, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(output.success).toHaveBeenCalledWith('Run succeeded');
      expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('"answer": 42'));
      expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('120ms'));
    });

    test('displays success result with printOutput', async ({ client, processMocks }) => {
      client.runAction.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 50, printOutput: 'hello from action' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

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
      client.runAction.mockResolvedValue({
        ok: false,
        error: {
          type: 'TypeError',
          message: 'x is not defined',
          durationMs: 80,
          printOutput: '',
        },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(output.error).toHaveBeenCalledWith('Run failed: TypeError: x is not defined');
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('displays error result with stack trace', async ({ client, processMocks }) => {
      client.runAction.mockResolvedValue({
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
      const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(processMocks.error).toHaveBeenCalledWith('at line 10\n  at handler');
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('handles 401 error with authentication message', async ({
      client,
      output,
      processMocks,
    }) => {
      const apiError = new Error('Unauthorized') as Error & { statusCode: number };
      apiError.statusCode = 401;
      client.runAction.mockRejectedValue(apiError);

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

      const program = new Command();
      const actions = program.command('actions');
      registerActionsRunAction(actions);

      await program.parseAsync(['actions', 'run', 'my-action'], { from: 'user' });

      expect(output.error).toHaveBeenCalledWith('Not authenticated.');
      expect(output.hint).toHaveBeenCalledWith('Run `canup login` to re-authenticate.');
      expect(processMocks.exit).toHaveBeenCalledWith(1);
    });

    test('handles 404 error with action name', async ({ client, output, processMocks }) => {
      const apiError = new Error('Not found') as Error & { statusCode: number };
      apiError.statusCode = 404;
      client.runAction.mockRejectedValue(apiError);

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

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
      client.runAction.mockRejectedValue(new Error('Network timeout'));

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

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
      client.runAction.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 10, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

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
      processMocks,
    }) => {
      const tmpFile = join(tmpdir(), `canup-run-test-bad-${Date.now()}.json`);
      writeFileSync(tmpFile, 'not valid json content');

      try {
        client.runAction.mockResolvedValue({
          ok: true,
          data: { result: null, durationMs: 10, printOutput: '' },
        });

        const { Command } = await import('commander');
        const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

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
      } finally {
        unlinkSync(tmpFile);
      }
    });

    test('exits with error for non-existent file path that does not look like JSON', async ({
      client,
      output,
      processMocks,
    }) => {
      client.runAction.mockResolvedValue({
        ok: true,
        data: { result: null, durationMs: 10, printOutput: '' },
      });

      const { Command } = await import('commander');
      const { registerActionsRunAction } = await import('../../../../src/cli/commands/actions/run.js');

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
