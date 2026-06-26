import { describe, expect, vi } from 'vitest';
import { test, client, tokenStore } from '#test/fixtures.js';

vi.mock('../auth/token-store.js', () => tokenStore);

vi.mock('../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

describe('whoami command', () => {
  test('prints "Not logged in" when no credentials are stored', async ({ processMocks }) => {
    tokenStore.loadCredentials.mockReturnValue(null);

    const { Command } = await import('commander');
    const { registerWhoamiCommand } = await import('../commands/whoami.js');

    const program = new Command();
    registerWhoamiCommand(program);

    await program.parseAsync(['whoami'], { from: 'user' });

    expect(processMocks.error).toHaveBeenCalledWith('Not logged in. Run `canup login` first.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('displays user info when logged in', async ({ client: c, processMocks }) => {
    tokenStore.loadCredentials.mockReturnValue({ userKey: 'cnup_x', keyId: 'apikey_x' });

    c.getMe.mockResolvedValue({
      id: '123',
      email: 'dev@example.com',
      name: 'Test User',
      image: null,
      createdAt: '2026-01-15T00:00:00.000Z',
    });

    const { Command } = await import('commander');
    const { registerWhoamiCommand } = await import('../commands/whoami.js');

    const program = new Command();
    program.exitOverride();
    registerWhoamiCommand(program);

    await program.parseAsync(['whoami'], { from: 'user' });

    expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('Test User'));
    expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('dev@example.com'));
  });

  test('displays "(not set)" when user name is null', async ({ client: c, processMocks }) => {
    tokenStore.loadCredentials.mockReturnValue({ userKey: 'cnup_x', keyId: 'apikey_x' });
    c.getMe.mockResolvedValue({
      id: '123',
      email: 'dev@example.com',
      name: null,
      image: null,
      createdAt: '2026-01-15T00:00:00.000Z',
    });

    const { Command } = await import('commander');
    const { registerWhoamiCommand } = await import('../commands/whoami.js');

    const program = new Command();
    registerWhoamiCommand(program);

    await program.parseAsync(['whoami'], { from: 'user' });

    expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('(not set)'));
  });

  test('handles non-Error thrown value', async ({ client: c, processMocks }) => {
    tokenStore.loadCredentials.mockReturnValue({ userKey: 'cnup_x', keyId: 'apikey_x' });
    c.getMe.mockRejectedValue('raw error string');

    const { Command } = await import('commander');
    const { registerWhoamiCommand } = await import('../commands/whoami.js');

    const program = new Command();
    registerWhoamiCommand(program);

    await program.parseAsync(['whoami'], { from: 'user' });

    expect(processMocks.error).toHaveBeenCalledWith('Failed to get user info: raw error string');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('prints session expired on 401 error', async ({ client: c, processMocks }) => {
    tokenStore.loadCredentials.mockReturnValue({ userKey: 'cnup_x', keyId: 'apikey_x' });

    const error = new Error('Invalid or expired session') as Error & { httpStatus: number };
    error.httpStatus = 401;
    c.getMe.mockRejectedValue(error);

    const { Command } = await import('commander');
    const { registerWhoamiCommand } = await import('../commands/whoami.js');

    const program = new Command();
    registerWhoamiCommand(program);

    await program.parseAsync(['whoami'], { from: 'user' });

    expect(processMocks.error).toHaveBeenCalledWith(
      'Session expired. Run `canup login` to re-authenticate.',
    );
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
