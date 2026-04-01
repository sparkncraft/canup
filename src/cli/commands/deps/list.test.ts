import { describe, expect, vi } from 'vitest';
import { test, client, output, project } from '#test/fixtures.js';

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

describe('deps list command', () => {
  test('displays packages in a table when deps exist', async ({ client, output, processMocks }) => {
    client.listDeps.mockResolvedValue({
      packages: [
        { name: 'express', version: '4.18.2', createdAt: '2026-01-15' },
        { name: 'lodash', version: null, createdAt: '2026-01-16' },
      ],
      layerSize: 5000,
    });

    const { Command } = await import('commander');
    const { registerDepsListAction } = await import('../../commands/deps/list.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsListAction(deps);

    await program.parseAsync(['deps', 'list', '--language', 'nodejs'], { from: 'user' });

    expect(client.listDeps).toHaveBeenCalledWith('test-app-id', 'nodejs');

    expect(output.formatTable).toHaveBeenCalledWith(
      ['Package', 'Version', 'Added'],
      expect.arrayContaining([expect.arrayContaining(['express', '4.18.2'])]),
    );
    expect(processMocks.log).toHaveBeenCalledWith('');
    expect(output.label).toHaveBeenCalledWith('Layer', expect.stringContaining('5000'));
  });

  test('shows empty state message when no deps', async ({ client, output }) => {
    client.listDeps.mockResolvedValue({
      packages: [],
      layerSize: null,
    });

    const { Command } = await import('commander');
    const { registerDepsListAction } = await import('../../commands/deps/list.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsListAction(deps);

    await program.parseAsync(['deps', 'list', '--language', 'python'], { from: 'user' });

    expect(output.info).toHaveBeenCalledWith('No packages installed for python');
  });

  test('exits with error for invalid language', async ({ client, output, processMocks }) => {
    const { Command } = await import('commander');
    const { registerDepsListAction } = await import('../../commands/deps/list.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsListAction(deps);

    await program.parseAsync(['deps', 'list', '--language', 'ruby'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith(expect.stringContaining('Invalid language'));
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
