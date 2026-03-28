import { describe, expect, vi } from 'vitest';
import { test, client, output, project } from '../../../fixtures/cli.js';

// Mock require-project
vi.mock('../../../../src/cli/config/require-project.js', () => ({
  requireProject: vi.fn(() => project),
}));

// Mock api-client
vi.mock('../../../../src/cli/api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

// Mock output
vi.mock('../../../../src/cli/ui/output.js', () => output);

describe('deps clear command', () => {
  test('clears all deps successfully', async ({ client, output }) => {
    client.clearDeps.mockResolvedValue({ cleared: true });

    const { Command } = await import('commander');
    const { registerDepsClearAction } = await import('../../../../src/cli/commands/deps/clear.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsClearAction(deps);

    await program.parseAsync(['deps', 'clear', '--language', 'nodejs'], { from: 'user' });

    expect(client.clearDeps).toHaveBeenCalledWith('test-app-id', 'nodejs');
    expect(output.success).toHaveBeenCalledWith('All nodejs packages cleared');
  });

  test('handles API error', async ({ client, output, processMocks }) => {
    const apiError = new Error('Server error') as Error & { statusCode: number };
    apiError.statusCode = 500;
    client.clearDeps.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerDepsClearAction } = await import('../../../../src/cli/commands/deps/clear.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsClearAction(deps);

    await program.parseAsync(['deps', 'clear', '--language', 'python'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Server error');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles 401 error with re-auth hint', async ({ client, output, processMocks }) => {
    const apiError = new Error('Unauthorized') as Error & { statusCode: number };
    apiError.statusCode = 401;
    client.clearDeps.mockRejectedValue(apiError);

    const { Command } = await import('commander');
    const { registerDepsClearAction } = await import('../../../../src/cli/commands/deps/clear.js');

    const program = new Command();
    const deps = program.command('deps');
    registerDepsClearAction(deps);

    await program.parseAsync(['deps', 'clear', '--language', 'nodejs'], { from: 'user' });

    expect(output.error).toHaveBeenCalledWith('Unauthorized');
    expect(output.info).toHaveBeenCalledWith('Run `canup init` to re-authenticate.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
