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

interface CapturedUrl {
  href: string;
  params: URLSearchParams;
}

function captureOpenedUrl(): CapturedUrl {
  const arg = mockOpen.mock.calls[0]?.[0];
  if (typeof arg !== 'string') throw new Error('open() was not called with a string URL');
  const url = new URL(arg);
  return { href: arg, params: url.searchParams };
}

describe('performLogin', () => {
  test('opens browser at <apiUrl>/cli/login with port, host, and state', async ({ output: o }) => {
    vi.stubEnv('CANUP_URL', 'https://test.api');

    let echoedState = '';
    mockStartCallbackServer.mockImplementation(async () => {
      return {
        port: 4444,
        credentialsPromise: new Promise((resolve) => {
          // Resolve after the open() call so we can capture the state nonce.
          setImmediate(() => {
            echoedState = captureOpenedUrl().params.get('state') ?? '';
            resolve({ userKey: 'cnup_user', keyId: 'apikey_x', state: echoedState });
          });
        }),
        close: vi.fn(),
      };
    });

    const { performLogin } = await import('../auth/perform-login.js');
    await performLogin();

    const captured = captureOpenedUrl();
    expect(captured.href).toMatch(/^https:\/\/test\.api\/cli\/login\?/);
    expect(captured.params.get('port')).toBe('4444');
    expect(captured.params.get('host')).not.toBeNull(); // os.hostname() is best-effort
    expect(captured.params.get('state')).toBeTruthy();
    expect(o.info).toHaveBeenCalledWith('Opening browser for GitHub login...');
  });

  test('saves credentials and prints "Logged in as <email>." on success', async ({
    output: o,
    client: c,
  }) => {
    let echoedState = '';
    mockStartCallbackServer.mockImplementation(async () => ({
      port: 5555,
      credentialsPromise: new Promise<{ userKey: string; keyId: string; state: string }>(
        (resolve) => {
          setImmediate(() => {
            echoedState = captureOpenedUrl().params.get('state') ?? '';
            resolve({ userKey: 'cnup_real', keyId: 'apikey_real', state: echoedState });
          });
        },
      ),
      close: vi.fn(),
    }));

    c.getMe.mockResolvedValue({
      id: 'u1',
      email: 'dev@example.com',
      name: 'Dev',
      image: null,
      createdAt: '2026-01-01T00:00:00Z',
    });

    const { performLogin } = await import('../auth/perform-login.js');
    const result = await performLogin();

    expect(tokenStore.saveCredentials).toHaveBeenCalledWith({
      userKey: 'cnup_real',
      keyId: 'apikey_real',
    });
    expect(result).toEqual({ userKey: 'cnup_real', keyId: 'apikey_real' });
    expect(o.success).toHaveBeenCalledWith('Logged in as dev@example.com.');
  });

  test('throws on state mismatch and does NOT save credentials', async () => {
    mockStartCallbackServer.mockImplementation(async () => ({
      port: 6666,
      credentialsPromise: Promise.resolve({
        userKey: 'cnup_x',
        keyId: 'apikey_x',
        state: 'attacker-state',
      }),
      close: vi.fn(),
    }));

    const { performLogin } = await import('../auth/perform-login.js');

    await expect(performLogin()).rejects.toThrow(/State mismatch/);
    expect(tokenStore.saveCredentials).not.toHaveBeenCalled();
  });

  test('throws on missing state and does NOT save credentials', async () => {
    mockStartCallbackServer.mockImplementation(async () => ({
      port: 7777,
      credentialsPromise: Promise.resolve({
        userKey: 'cnup_x',
        keyId: 'apikey_x',
        state: undefined,
      }),
      close: vi.fn(),
    }));

    const { performLogin } = await import('../auth/perform-login.js');

    await expect(performLogin()).rejects.toThrow(/State mismatch/);
    expect(tokenStore.saveCredentials).not.toHaveBeenCalled();
  });

  test('handles browser open failure gracefully', async ({ output: o, processMocks }) => {
    let echoedState = '';
    mockStartCallbackServer.mockImplementation(async () => ({
      port: 8888,
      credentialsPromise: new Promise<{ userKey: string; keyId: string; state: string }>(
        (resolve) => {
          setImmediate(() => {
            echoedState = captureOpenedUrl().params.get('state') ?? '';
            resolve({ userKey: 'cnup_x', keyId: 'apikey_x', state: echoedState });
          });
        },
      ),
      close: vi.fn(),
    }));

    mockOpen.mockRejectedValue(new Error('No browser found'));

    const { performLogin } = await import('../auth/perform-login.js');
    await performLogin();

    expect(o.info).toHaveBeenCalledWith('Could not open browser automatically.');
    expect(processMocks.log).toHaveBeenCalledWith(expect.stringContaining('/cli/login'));
  });

  test('closes the callback server after receiving the result', async ({ client: c }) => {
    const closeFn = vi.fn();
    let echoedState = '';

    mockStartCallbackServer.mockImplementation(async () => ({
      port: 9999,
      credentialsPromise: new Promise<{ userKey: string; keyId: string; state: string }>(
        (resolve) => {
          setImmediate(() => {
            echoedState = captureOpenedUrl().params.get('state') ?? '';
            resolve({ userKey: 'cnup_x', keyId: 'apikey_x', state: echoedState });
          });
        },
      ),
      close: closeFn,
    }));

    c.getMe.mockResolvedValue({
      id: 'u1',
      email: 'a@b',
      name: null,
      image: null,
      createdAt: '2026-01-01',
    });

    const { performLogin } = await import('../auth/perform-login.js');
    await performLogin();

    expect(closeFn).toHaveBeenCalled();
  });
});
