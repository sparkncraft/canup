import { describe, expect, vi } from 'vitest';
import { test, client, output, spinner, project } from '#test/fixtures.js';

// Mock require-project
vi.mock('../../config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

// Mock api-client
vi.mock('../../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
  formatBytes: vi.fn((b: number) => `${b}B`),
}));

// Mock output
vi.mock('../../ui/output.js', () => output);

// Mock spinner
vi.mock('../../ui/spinner.js', () => spinner);

describe('deps remove command', () => {
  test('removes a single package successfully', async ({ client, output }) => {
    client.removeDep.mockResolvedValue({ deleted: 'express' });

    const { Command } = await import('commander');
    const { registerDepsRemoveAction } = await import('../../commands/deps/remove.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsRemoveAction(deps);

    await program.parseAsync(['deps', 'remove', 'express', '--language', 'nodejs'], {
      from: 'user',
    });

    expect(client.removeDep).toHaveBeenCalledWith('test-app-id', 'nodejs', 'express');
    expect(output.success).toHaveBeenCalledWith('Removed: express');
  });

  test('removes multiple packages in a loop', async ({ client, timers }) => {
    client.removeDep
      .mockResolvedValueOnce({ deleted: 'express' })
      .mockResolvedValueOnce({ deleted: 'lodash', buildId: 'build-456' });
    client.getBuildStatus.mockResolvedValue({
      status: 'success',
      sizeBytes: 2048,
    });

    const { Command } = await import('commander');
    const { registerDepsRemoveAction } = await import('../../commands/deps/remove.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsRemoveAction(deps);

    const parsePromise = program.parseAsync(
      ['deps', 'remove', 'express', 'lodash', '--language', 'nodejs'],
      { from: 'user' },
    );

    // Advance past the 2-second polling delay
    await timers.advance(3000);

    await parsePromise;

    expect(client.removeDep).toHaveBeenCalledTimes(2);
    expect(client.removeDep).toHaveBeenCalledWith('test-app-id', 'nodejs', 'express');
    expect(client.removeDep).toHaveBeenCalledWith('test-app-id', 'nodejs', 'lodash');
  });

  test('handles package not found (404)', async ({ client, output, processMocks }) => {
    const apiError = new Error('Not found') as Error & { statusCode: number };
    apiError.statusCode = 404;
    client.removeDep.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerDepsRemoveAction } = await import('../../commands/deps/remove.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsRemoveAction(deps);

    await program.parseAsync(['deps', 'remove', 'nonexistent', '--language', 'nodejs'], {
      from: 'user',
    });

    expect(output.error).toHaveBeenCalledWith('Package not found.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('exits with error for invalid language', async ({ output, processMocks }) => {
    const { Command } = await import('commander');
    const { registerDepsRemoveAction } = await import('../../commands/deps/remove.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsRemoveAction(deps);

    await program.parseAsync(['deps', 'remove', 'express', '--language', 'ruby'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith(expect.stringContaining('Invalid language'));
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles build failure during layer rebuild', async ({ client, processMocks, timers }) => {
    client.removeDep.mockResolvedValue({ deleted: 'express', buildId: 'build-fail' });
    client.getBuildStatus
      .mockResolvedValueOnce({ status: 'failed', errorMessage: 'Out of space' })
      .mockResolvedValue({ status: 'success', sizeBytes: 1024 });

    const { Command } = await import('commander');
    const { registerDepsRemoveAction } = await import('../../commands/deps/remove.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsRemoveAction(deps);

    const parsePromise = program.parseAsync(['deps', 'remove', 'express', '--language', 'nodejs'], {
      from: 'user',
    });

    await timers.advance(3000);
    await timers.advance(3000);
    await parsePromise;

    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('updates spinner text during build polling', async ({ client, spinner, timers }) => {
    client.removeDep.mockResolvedValue({ deleted: 'express', buildId: 'build-poll' });

    let callCount = 0;
    client.getBuildStatus.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ status: 'building' });
      return Promise.resolve({ status: 'success', sizeBytes: 1024 });
    });

    const mockSpin = { update: vi.fn(), succeed: vi.fn(), fail: vi.fn() };
    spinner.createSpinner.mockReturnValue(mockSpin);

    const { Command } = await import('commander');
    const { registerDepsRemoveAction } = await import('../../commands/deps/remove.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsRemoveAction(deps);

    const parsePromise = program.parseAsync(['deps', 'remove', 'express', '--language', 'nodejs'], {
      from: 'user',
    });

    await timers.advance(3000);
    await timers.advance(3000);
    await parsePromise;

    expect(mockSpin.update).toHaveBeenCalledWith(expect.stringContaining('Rebuilding layer'));
    expect(mockSpin.succeed).toHaveBeenCalled();
  });

  test('shows auth hint on 401 error', async ({ client, output, processMocks }) => {
    const apiError = new Error('Unauthorized') as Error & { statusCode: number };
    apiError.statusCode = 401;
    client.removeDep.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerDepsRemoveAction } = await import('../../commands/deps/remove.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsRemoveAction(deps);

    await program.parseAsync(['deps', 'remove', 'express', '--language', 'nodejs'], {
      from: 'user',
    });

    expect(output.error).toHaveBeenCalledWith('Unauthorized');
    expect(output.info).toHaveBeenCalledWith('Run `canup init` to re-authenticate.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
