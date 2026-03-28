import { describe, expect, vi } from 'vitest';
import { test, client, tokenStore } from '../../fixtures/cli.js';

vi.mock('../../../src/cli/auth/token-store.js', () => tokenStore);

vi.mock('../../../src/cli/api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

describe('whoami command', () => {
  test('prints "Not logged in" when no token is stored', async ({ processMocks }) => {
    tokenStore.loadToken.mockReturnValue(null);

    const { Command } = await import('commander');
    const { registerWhoamiCommand } = await import('../../../src/cli/commands/whoami.js');

    const program = new Command();
    registerWhoamiCommand(program);

    await program.parseAsync(['whoami'], { from: 'user' });

    expect(processMocks.error).toHaveBeenCalledWith('Not logged in. Run `canup login` first.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('displays user info when logged in', async ({ client, processMocks }) => {
    tokenStore.loadToken.mockReturnValue('valid-token');

    client.getMe.mockResolvedValue({
      id: '123',
      email: 'dev@example.com',
      name: 'Test User',
      avatarUrl: null,
      createdAt: '2026-01-15T00:00:00.000Z',
    });

    const { Command } = await import('commander');
    const { registerWhoamiCommand } = await import('../../../src/cli/commands/whoami.js');

    const program = new Command();
    program.exitOverride(); // Prevent commander from calling process.exit
    registerWhoamiCommand(program);

    await program.parseAsync(['whoami'], { from: 'user' });

    expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('Test User'));
    expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('dev@example.com'));
  });

  test('prints session expired on 401 error', async ({ client, processMocks }) => {
    tokenStore.loadToken.mockReturnValue('expired-token');

    const error = new Error('Invalid or expired session') as Error & { statusCode: number };
    error.statusCode = 401;
    client.getMe.mockRejectedValue(error);

    const { Command } = await import('commander');
    const { registerWhoamiCommand } = await import('../../../src/cli/commands/whoami.js');

    const program = new Command();
    registerWhoamiCommand(program);

    await program.parseAsync(['whoami'], { from: 'user' });

    expect(processMocks.error).toHaveBeenCalledWith(
      'Session expired. Run `canup login` to re-authenticate.',
    );
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
