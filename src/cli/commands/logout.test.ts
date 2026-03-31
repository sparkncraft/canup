import { describe, expect, vi } from 'vitest';
import { test, output, tokenStore } from '#test/fixtures.js';

vi.mock('../auth/token-store.js', () => tokenStore);

vi.mock('../ui/output.js', () => output);

describe('logout command', () => {
  test('calls clearToken and shows success message', async ({ output }) => {
    const { Command } = await import('commander');
    const { registerLogoutCommand } = await import('../commands/logout.js');

    const program = new Command();
    registerLogoutCommand(program);

    await program.parseAsync(['logout'], { from: 'user' });

    expect(tokenStore.clearToken).toHaveBeenCalled();
    expect(output.success).toHaveBeenCalledWith('Logged out.');
  });

  test('calls clearToken before success message (order matters)', async ({ output }) => {
    const callOrder: string[] = [];

    tokenStore.clearToken.mockImplementation(() => {
      callOrder.push('clearToken');
    });
    output.success.mockImplementation(() => {
      callOrder.push('success');
    });

    const { Command } = await import('commander');
    const { registerLogoutCommand } = await import('../commands/logout.js');

    const program = new Command();
    registerLogoutCommand(program);

    await program.parseAsync(['logout'], { from: 'user' });

    expect(callOrder).toEqual(['clearToken', 'success']);
  });
});
