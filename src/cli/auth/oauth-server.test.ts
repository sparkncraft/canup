import { describe, expect, vi } from 'vitest';
import { test as baseTest } from 'vitest';
import { startCallbackServer, type CallbackServerResult } from './oauth-server.js';

const test = baseTest.extend('server', async ({}, { onCleanup }) => {
  const ref: { current: CallbackServerResult | null } = { current: null };
  onCleanup(async () => {
    if (ref.current) {
      const res = await fetch(`http://127.0.0.1:${ref.current.port}/callback?error=cleanup`).catch(
        () => null,
      );
      if (res) await res.text().catch(() => {});
      await ref.current.tokenPromise.catch(() => {});
      ref.current.close();
    }
  });
  return ref;
});

describe('OAuth Callback Server', () => {
  test('starts and listens on 127.0.0.1 with an assigned port', async ({ server }) => {
    server.current = await startCallbackServer();
    expect(server.current.port).toBeGreaterThan(0);
    expect(server.current.tokenPromise).toBeInstanceOf(Promise);
    expect(typeof server.current.close).toBe('function');
  });

  test('resolves token when callback is received with token parameter', async ({ server }) => {
    server.current = await startCallbackServer();

    const res = await fetch(
      `http://127.0.0.1:${server.current.port}/callback?token=test-session-token`,
    );

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Login Successful');

    const token = await server.current.tokenPromise;
    expect(token).toBe('test-session-token');
  });

  test('rejects when callback is received with error parameter', async ({ server }) => {
    server.current = await startCallbackServer();

    const res = await fetch(`http://127.0.0.1:${server.current.port}/callback?error=access_denied`);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Login Failed');

    await expect(server.current.tokenPromise).rejects.toThrow('access_denied');
  });

  test('returns 404 for non-callback paths', async ({ server }) => {
    server.current = await startCallbackServer();

    const res = await fetch(`http://127.0.0.1:${server.current.port}/other`);
    expect(res.status).toBe(404);
    await res.text();
  });

  test('rejects with timeout after 120 seconds of no callback', async ({ server }) => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    server.current = await startCallbackServer();

    await vi.advanceTimersByTimeAsync(120_000);

    await expect(server.current.tokenPromise).rejects.toThrow('timed out');

    vi.useRealTimers();
  });

  test('returns 400 for callback without token or error', async ({ server }) => {
    server.current = await startCallbackServer();

    const res = await fetch(`http://127.0.0.1:${server.current.port}/callback`);
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain('Bad Request');
  });
});
