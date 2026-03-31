import { describe, expect, vi } from 'vitest';
import { test, output, client, tokenStore } from '#test/fixtures.js';

const { mockStartCallbackServer, mockOpen } = vi.hoisted(() => ({
  mockStartCallbackServer: vi.fn(),
  mockOpen: vi.fn(),
}));

vi.mock('../auth/oauth-server.js', () => ({
  startCallbackServer: mockStartCallbackServer,
}));

vi.mock('../auth/token-store.js', () => tokenStore);

vi.mock('../api-client.js', () => ({
  CanupClient: vi.fn(function () {
    return client;
  }),
}));

vi.mock('../ui/output.js', () => output);

vi.mock('open', () => ({
  default: mockOpen,
}));

describe('performLogin', () => {
  test('completes happy path: saves token, closes server, returns token', async ({ client }) => {
    const closeFn = vi.fn();

    mockStartCallbackServer.mockResolvedValue({
      port: 3456,
      tokenPromise: Promise.resolve('test-token'),
      close: closeFn,
    });

    client.getAuthUrl.mockResolvedValue({ url: 'https://github.com/login/oauth/authorize?...' });

    const { performLogin } = await import('../auth/perform-login.js');

    const result = await performLogin();

    expect(tokenStore.saveToken).toHaveBeenCalledWith('test-token');
    expect(closeFn).toHaveBeenCalled();
    expect(result).toBe('test-token');
  });

  test('handles browser open failure gracefully', async ({ client, output, processMocks }) => {
    const closeFn = vi.fn();
    const authUrl = 'https://github.com/login/oauth/authorize?client_id=abc';

    mockStartCallbackServer.mockResolvedValue({
      port: 3456,
      tokenPromise: Promise.resolve('test-token'),
      close: closeFn,
    });

    client.getAuthUrl.mockResolvedValue({ url: authUrl });

    mockOpen.mockRejectedValue(new Error('No browser found'));

    const { performLogin } = await import('../auth/perform-login.js');

    const result = await performLogin();

    expect(output.info).toHaveBeenCalledWith('Could not open browser automatically.');
    expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining(authUrl));
    expect(result).toBe('test-token');
  });

  test('saves the token received from the callback server', async ({ client }) => {
    const closeFn = vi.fn();

    mockStartCallbackServer.mockResolvedValue({
      port: 4000,
      tokenPromise: Promise.resolve('callback-token-xyz'),
      close: closeFn,
    });

    client.getAuthUrl.mockResolvedValue({ url: 'https://github.com/login' });

    const { performLogin } = await import('../auth/perform-login.js');

    await performLogin();

    expect(tokenStore.saveToken).toHaveBeenCalledWith('callback-token-xyz');
  });

  test('closes the server after receiving the token', async ({ client }) => {
    const closeFn = vi.fn();

    mockStartCallbackServer.mockResolvedValue({
      port: 5000,
      tokenPromise: Promise.resolve('another-token'),
      close: closeFn,
    });

    client.getAuthUrl.mockResolvedValue({ url: 'https://github.com/login' });

    const { performLogin } = await import('../auth/perform-login.js');

    await performLogin();

    expect(closeFn).toHaveBeenCalled();
  });
});
