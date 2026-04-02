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
  parsePackageSpecs: vi.fn((specs: string[]) => specs.map((s) => ({ name: s }))),
  formatBytes: vi.fn((b: number) => `${b}B`),
}));

// Mock output
vi.mock('../../ui/output.js', () => output);

// Mock spinner
vi.mock('../../ui/spinner.js', () => spinner);

describe('deps add command', () => {
  test('adds packages successfully with build polling', async ({ client, spinner, timers }) => {
    client.addDeps.mockResolvedValue({
      cached: false,
      buildId: 'build-123',
      packages: [{ name: 'express', version: '4.18.2' }],
    });
    client.getBuildStatus.mockResolvedValue({
      status: 'success',
      sizeBytes: 1234,
    });

    const { Command } = await import('commander');
    const { registerDepsAddAction } = await import('../../commands/deps/add.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsAddAction(deps);

    const parsePromise = program.parseAsync(['deps', 'add', 'express', '--language', 'nodejs'], {
      from: 'user',
    });

    // Advance past the 2-second polling delay
    await timers.advance(3000);

    await parsePromise;

    expect(client.addDeps).toHaveBeenCalledWith('test-app-id', 'nodejs', expect.any(Array));
    expect(client.getBuildStatus).toHaveBeenCalledWith('test-app-id', 'nodejs', 'build-123');

    expect(spinner.createSpinner).toHaveBeenCalledWith('Building layer...');
  });

  test('shows cached message when packages already installed', async ({ client, output }) => {
    client.addDeps.mockResolvedValue({
      cached: true,
      packages: [{ name: 'lodash', version: '4.17.21' }],
      layerSize: 5000,
    });

    const { Command } = await import('commander');
    const { registerDepsAddAction } = await import('../../commands/deps/add.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsAddAction(deps);

    await program.parseAsync(['deps', 'add', 'lodash', '--language', 'nodejs'], { from: 'user' });

    expect(output.success).toHaveBeenCalledWith('All packages already installed');
    expect(output.label).toHaveBeenCalledWith('Package', expect.stringContaining('lodash'));
  });

  test('exits with error for invalid language', async ({ output, processMocks }) => {
    const { Command } = await import('commander');
    const { registerDepsAddAction } = await import('../../commands/deps/add.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsAddAction(deps);

    await program.parseAsync(['deps', 'add', 'express', '--language', 'ruby'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith(expect.stringContaining('Invalid language'));
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles API error with 401 status', async ({ client, output, processMocks }) => {
    const apiError = new Error('Unauthorized') as Error & { statusCode: number };
    apiError.statusCode = 401;
    client.addDeps.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerDepsAddAction } = await import('../../commands/deps/add.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsAddAction(deps);

    await program.parseAsync(['deps', 'add', 'express', '--language', 'nodejs'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Unauthorized');
    expect(output.info).toHaveBeenCalledWith('Run `canup init` to re-authenticate.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('shows packages when no build triggered and not cached', async ({ client, output }) => {
    client.addDeps.mockResolvedValue({
      cached: false,
      buildId: undefined,
      packages: [{ name: 'express', version: '4.18.2' }],
    });

    const { Command } = await import('commander');
    const { registerDepsAddAction } = await import('../../commands/deps/add.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsAddAction(deps);

    await program.parseAsync(['deps', 'add', 'express', '--language', 'nodejs'], { from: 'user' });

    expect(output.label).toHaveBeenCalledWith('Package', 'express@4.18.2');
  });

  test('handles build failure', async ({ client, processMocks, timers }) => {
    client.addDeps.mockResolvedValue({
      cached: false,
      buildId: 'build-fail',
      packages: [{ name: 'express' }],
    });
    // Return 'failed' on first poll, then 'success' to break the loop on the next iteration
    client.getBuildStatus
      .mockResolvedValueOnce({ status: 'failed', errorMessage: 'Out of disk space' })
      .mockResolvedValue({ status: 'success', sizeBytes: 0 });

    const { Command } = await import('commander');
    const { registerDepsAddAction } = await import('../../commands/deps/add.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsAddAction(deps);

    const parsePromise = program.parseAsync(['deps', 'add', 'express', '--language', 'nodejs'], {
      from: 'user',
    });

    // Advance past two polling cycles (first returns 'failed', second returns 'success' to break loop)
    await timers.advance(5000);
    await parsePromise;

    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
