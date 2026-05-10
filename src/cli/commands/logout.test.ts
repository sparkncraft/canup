import { describe, expect, vi } from 'vitest';
import { test, output, client, tokenStore } from '#test/fixtures.js';

vi.mock('../auth/token-store.js', () => tokenStore);

vi.mock('../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

vi.mock('../ui/output.js', () => output);

describe('logout command', () => {
  test('happy path: revokes user key then clears credentials', async ({ output: o, client: c }) => {
    tokenStore.loadCredentials.mockReturnValue({ userKey: 'cnup_x', keyId: 'apikey_x' });
    c.revokeUserKey.mockResolvedValue(undefined);

    const { Command } = await import('commander');
    const { registerLogoutCommand } = await import('../commands/logout.js');

    const program = new Command();
    registerLogoutCommand(program);

    await program.parseAsync(['logout'], { from: 'user' });

    expect(c.revokeUserKey).toHaveBeenCalledWith('apikey_x', expect.any(Object));
    expect(tokenStore.clearCredentials).toHaveBeenCalled();
    expect(o.success).toHaveBeenCalledWith('Logged out.');
  });

  test('no credentials: skips revoke, clears, prints, exits 0', async ({
    output: o,
    client: c,
    processMocks,
  }) => {
    tokenStore.loadCredentials.mockReturnValue(null);

    const { Command } = await import('commander');
    const { registerLogoutCommand } = await import('../commands/logout.js');

    const program = new Command();
    registerLogoutCommand(program);

    await program.parseAsync(['logout'], { from: 'user' });

    expect(c.revokeUserKey).not.toHaveBeenCalled();
    expect(tokenStore.clearCredentials).toHaveBeenCalled();
    expect(o.success).toHaveBeenCalledWith('Logged out.');
    expect(processMocks.exit).not.toHaveBeenCalled();
  });

  test('revoke throws: still clears, still prints success', async ({ output: o, client: c }) => {
    tokenStore.loadCredentials.mockReturnValue({ userKey: 'cnup_x', keyId: 'apikey_x' });
    c.revokeUserKey.mockRejectedValue(new Error('Network down'));

    const { Command } = await import('commander');
    const { registerLogoutCommand } = await import('../commands/logout.js');

    const program = new Command();
    registerLogoutCommand(program);

    await program.parseAsync(['logout'], { from: 'user' });

    expect(tokenStore.clearCredentials).toHaveBeenCalled();
    expect(o.success).toHaveBeenCalledWith('Logged out.');
  });

  test('revoke times out (AbortError): still clears, still prints success', async ({
    output: o,
    client: c,
  }) => {
    tokenStore.loadCredentials.mockReturnValue({ userKey: 'cnup_x', keyId: 'apikey_x' });
    const err = new Error('aborted') as Error & { name: string };
    err.name = 'AbortError';
    c.revokeUserKey.mockRejectedValue(err);

    const { Command } = await import('commander');
    const { registerLogoutCommand } = await import('../commands/logout.js');

    const program = new Command();
    registerLogoutCommand(program);

    await program.parseAsync(['logout'], { from: 'user' });

    expect(tokenStore.clearCredentials).toHaveBeenCalled();
    expect(o.success).toHaveBeenCalledWith('Logged out.');
  });
});
