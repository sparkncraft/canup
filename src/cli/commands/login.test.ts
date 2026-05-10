import { describe, expect, vi } from 'vitest';
import { test } from '#test/fixtures.js';

const { mockPerformLogin } = vi.hoisted(() => ({
  mockPerformLogin: vi.fn(),
}));

vi.mock('../auth/perform-login.js', () => ({
  performLogin: mockPerformLogin,
}));

describe('login command', () => {
  test('invokes performLogin and emits no extra success message', async ({ processMocks }) => {
    mockPerformLogin.mockResolvedValue({ userKey: 'cnup_x', keyId: 'apikey_x' });

    const { Command } = await import('commander');
    const { registerLoginCommand } = await import('../commands/login.js');

    const program = new Command();
    registerLoginCommand(program);

    await program.parseAsync(['login'], { from: 'user' });

    expect(mockPerformLogin).toHaveBeenCalled();
    // The success line is now printed by performLogin itself; the command
    // wrapper must NOT add a second "Logged in successfully!"
    expect(processMocks.log).not.toHaveBeenCalledWith('Logged in successfully!');
  });

  test('handles login timeout', async ({ processMocks }) => {
    mockPerformLogin.mockRejectedValue(
      new Error('Login timed out. No callback received within 120 seconds.'),
    );

    const { Command } = await import('commander');
    const { registerLoginCommand } = await import('../commands/login.js');

    const program = new Command();
    registerLoginCommand(program);

    await program.parseAsync(['login'], { from: 'user' });

    expect(processMocks.error).toHaveBeenCalledWith('Login timed out. Please try again.');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles non-Error thrown value', async ({ processMocks }) => {
    mockPerformLogin.mockRejectedValue('raw string error');

    const { Command } = await import('commander');
    const { registerLoginCommand } = await import('../commands/login.js');

    const program = new Command();
    registerLoginCommand(program);

    await program.parseAsync(['login'], { from: 'user' });

    expect(processMocks.error).toHaveBeenCalledWith('Login failed: raw string error');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });

  test('handles general login error', async ({ processMocks }) => {
    mockPerformLogin.mockRejectedValue(new Error('Port in use'));

    const { Command } = await import('commander');
    const { registerLoginCommand } = await import('../commands/login.js');

    const program = new Command();
    registerLoginCommand(program);

    await program.parseAsync(['login'], { from: 'user' });

    expect(processMocks.error).toHaveBeenCalledWith('Login failed: Port in use');
    expect(processMocks.exit).toHaveBeenCalledWith(1);
  });
});
