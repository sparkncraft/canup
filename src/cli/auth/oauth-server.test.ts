import { describe, expect, vi } from 'vitest';
import { test as baseTest } from 'vitest';
import { startCallbackServer, type CallbackServerResult } from './oauth-server.js';

const test = baseTest
  .extend('server', async ({}, { onCleanup }) => {
    const ref: { current: CallbackServerResult | null } = { current: null };
    onCleanup(async () => {
      if (ref.current) {
        const res = await fetch(
          `http://127.0.0.1:${ref.current.port}/callback?error=cleanup`,
        ).catch(() => null);
        if (res) await res.text().catch(() => {});
        await ref.current.credentialsPromise.catch(() => {});
        ref.current.close();
      }
    });
    return ref;
  })
  .extend('timers', async ({}, { onCleanup }) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    onCleanup(() => vi.useRealTimers());
  });

describe('OAuth Callback Server', () => {
  test('starts and listens on 127.0.0.1 with an assigned port', async ({ server }) => {
    server.current = await startCallbackServer();
    expect(server.current.port).toBeGreaterThan(0);
    expect(server.current.credentialsPromise).toBeInstanceOf(Promise);
    expect(typeof server.current.close).toBe('function');
  });

  test('resolves credentials when callback has token + keyId + state', async ({ server }) => {
    server.current = await startCallbackServer();

    const res = await fetch(
      `http://127.0.0.1:${server.current.port}/callback?token=cnup_userkey&keyId=apikey_xyz&state=nonce123`,
    );

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Login Successful');

    const result = await server.current.credentialsPromise;
    expect(result).toEqual({ userKey: 'cnup_userkey', keyId: 'apikey_xyz', state: 'nonce123' });
  });

  test('resolves credentials with state=undefined when callback omits state', async ({
    server,
  }) => {
    server.current = await startCallbackServer();

    await fetch(`http://127.0.0.1:${server.current.port}/callback?token=cnup_x&keyId=apikey_y`);

    const result = await server.current.credentialsPromise;
    expect(result).toEqual({ userKey: 'cnup_x', keyId: 'apikey_y', state: undefined });
  });

  test('rejects when callback is missing keyId', async ({ server }) => {
    server.current = await startCallbackServer();

    const res = await fetch(`http://127.0.0.1:${server.current.port}/callback?token=cnup_only`);
    expect(res.status).toBe(400);
    await res.text();
  });

  test('rejects when callback is missing token', async ({ server }) => {
    server.current = await startCallbackServer();

    const res = await fetch(`http://127.0.0.1:${server.current.port}/callback?keyId=apikey_only`);
    expect(res.status).toBe(400);
    await res.text();
  });

  test('rejects when callback is received with error parameter', async ({ server }) => {
    server.current = await startCallbackServer();

    const res = await fetch(`http://127.0.0.1:${server.current.port}/callback?error=access_denied`);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Login Failed');

    await expect(server.current.credentialsPromise).rejects.toThrow('access_denied');
  });

  test('returns 404 for non-callback paths', async ({ server }) => {
    server.current = await startCallbackServer();

    const res = await fetch(`http://127.0.0.1:${server.current.port}/other`);
    expect(res.status).toBe(404);
    await res.text();
  });

  test('rejects with timeout after 120 seconds of no callback', async ({ server, timers: _ }) => {
    server.current = await startCallbackServer();

    await vi.advanceTimersByTimeAsync(120_000);

    await expect(server.current.credentialsPromise).rejects.toThrow('timed out');
  });
});
