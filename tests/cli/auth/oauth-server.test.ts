import { describe, it, expect, afterEach } from 'vitest';
import {
  startCallbackServer,
  type CallbackServerResult,
} from '../../../src/cli/auth/oauth-server.js';

describe('OAuth Callback Server', () => {
  let server: CallbackServerResult | null = null;

  afterEach(async () => {
    if (server) {
      const res = await fetch(`http://127.0.0.1:${server.port}/callback?error=cleanup`).catch(
        () => null,
      );
      if (res) await res.text().catch(() => {});
      await server.tokenPromise.catch(() => {});
      server.close();
      server = null;
    }
  });

  it('starts and listens on 127.0.0.1 with an assigned port', async () => {
    server = await startCallbackServer();
    expect(server.port).toBeGreaterThan(0);
    expect(server.tokenPromise).toBeInstanceOf(Promise);
    expect(typeof server.close).toBe('function');
  });

  it('resolves token when callback is received with token parameter', async () => {
    server = await startCallbackServer();

    // Simulate the OAuth redirect hitting the callback
    const res = await fetch(`http://127.0.0.1:${server.port}/callback?token=test-session-token`);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Login Successful');

    const token = await server.tokenPromise;
    expect(token).toBe('test-session-token');
  });

  it('rejects when callback is received with error parameter', async () => {
    server = await startCallbackServer();

    const res = await fetch(`http://127.0.0.1:${server.port}/callback?error=access_denied`);

    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Login Failed');

    await expect(server.tokenPromise).rejects.toThrow('access_denied');
  });

  it('returns 404 for non-callback paths', async () => {
    server = await startCallbackServer();

    const res = await fetch(`http://127.0.0.1:${server.port}/other`);
    expect(res.status).toBe(404);
    await res.text();
  });

  it('returns 400 for callback without token or error', async () => {
    server = await startCallbackServer();

    const res = await fetch(`http://127.0.0.1:${server.port}/callback`);
    expect(res.status).toBe(400);
    const html = await res.text();
    expect(html).toContain('Bad Request');
  });
});
