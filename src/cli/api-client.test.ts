import { describe, test as baseTest, expect, vi } from 'vitest';
import { parsePackageSpecs, formatBytes, CanupClient } from './api-client.js';

// ──────────────────────────────────────────────
// Fetch mock setup
// ──────────────────────────────────────────────

const mockFetch = vi.fn();

const test = baseTest.extend<{ _fetch: void }>({
  _fetch: [
    async ({}, use) => {
      vi.stubGlobal('fetch', mockFetch);
      await use();
    },
    { auto: true },
  ],
});

/** Wrap data in the standard API success envelope and return a fetch Response-like object. */
function okResponse<T>(data: T) {
  return { ok: true, status: 200, json: () => Promise.resolve({ ok: true, data }) };
}

/** Return an API error envelope wrapped in a fetch Response-like object. */
function errorResponse(type: string, message: string, status = 400) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ ok: false, error: { type, message } }),
  };
}

/** For testAction/runAction which return raw TestResult (not unwrapped). */
function rawResponse(body: unknown, httpOk = true, status = 200) {
  return { ok: httpOk, status, json: () => Promise.resolve(body) };
}

// ──────────────────────────────────────────────
// Existing tests — parsePackageSpecs
// ──────────────────────────────────────────────

describe('parsePackageSpecs', () => {
  test('parses npm package with version', () => {
    const result = parsePackageSpecs(['express@4.18.2'], 'nodejs');
    expect(result).toEqual([{ name: 'express', version: '4.18.2' }]);
  });

  test('parses npm scoped package with version', () => {
    const result = parsePackageSpecs(['@types/node@20'], 'nodejs');
    expect(result).toEqual([{ name: '@types/node', version: '20' }]);
  });

  test('parses pip package with == version', () => {
    const result = parsePackageSpecs(['requests==2.31.0'], 'python');
    expect(result).toEqual([{ name: 'requests', version: '2.31.0' }]);
  });

  test('parses package without version', () => {
    const result = parsePackageSpecs(['flask'], 'python');
    expect(result).toEqual([{ name: 'flask' }]);
  });

  test('parses npm package without version', () => {
    const result = parsePackageSpecs(['lodash'], 'nodejs');
    expect(result).toEqual([{ name: 'lodash' }]);
  });

  test('parses multiple packages at once', () => {
    const result = parsePackageSpecs(['express@4.18.2', 'cors@2.8.5', 'dotenv'], 'nodejs');
    expect(result).toEqual([
      { name: 'express', version: '4.18.2' },
      { name: 'cors', version: '2.8.5' },
      { name: 'dotenv' },
    ]);
  });

  test('parses multiple pip packages', () => {
    const result = parsePackageSpecs(['requests==2.31.0', 'flask'], 'python');
    expect(result).toEqual([{ name: 'requests', version: '2.31.0' }, { name: 'flask' }]);
  });
});

// ──────────────────────────────────────────────
// Existing tests — formatBytes
// ──────────────────────────────────────────────

describe('formatBytes', () => {
  test('formats bytes (< 1024)', () => {
    expect(formatBytes(500)).toBe('500B');
  });

  test('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0B');
  });

  test('formats kilobytes', () => {
    const result = formatBytes(2048);
    expect(result).toContain('KB');
    expect(result).toBe('2.0KB');
  });

  test('formats megabytes', () => {
    const result = formatBytes(5 * 1024 * 1024);
    expect(result).toContain('MB');
    expect(result).toBe('5.0MB');
  });

  test('formats boundary at exactly 1024 bytes', () => {
    expect(formatBytes(1024)).toBe('1.0KB');
  });
});

// ──────────────────────────────────────────────
// CanupClient tests
// ──────────────────────────────────────────────

describe('CanupClient', () => {
  // Helper: create a client with defaults for most tests
  function createClient(opts?: { apiUrl?: string; token?: string }) {
    return new CanupClient({ apiUrl: 'https://test.api', token: 'test-token', ...opts });
  }

  // Helper: extract the URL string passed to fetch
  function fetchUrl(): string {
    return mockFetch.mock.calls[0][0] as string;
  }

  // Helper: extract the RequestInit options passed to fetch
  function fetchOpts(): RequestInit & { headers: Record<string, string> } {
    return mockFetch.mock.calls[0][1] as RequestInit & { headers: Record<string, string> };
  }

  // ──── Constructor ────

  describe('constructor', () => {
    test('uses apiUrl from options when provided', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ id: '1', email: 'a@b.c', name: null, avatarUrl: null, createdAt: '' }),
      );
      const client = new CanupClient({ apiUrl: 'https://custom.test', token: 'tok' });
      await client.getMe();
      expect(fetchUrl()).toMatch(/^https:\/\/custom\.test/);
    });

    test('falls back to CANUP_API_URL env var', async () => {
      vi.stubEnv('CANUP_API_URL', 'https://env.test');
      mockFetch.mockResolvedValueOnce(
        okResponse({ id: '1', email: 'a@b.c', name: null, avatarUrl: null, createdAt: '' }),
      );
      const client = new CanupClient({ token: 'tok' });
      await client.getMe();
      expect(fetchUrl()).toMatch(/^https:\/\/env\.test/);
    });

    test('defaults to https://canup.link when neither option nor env set', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ id: '1', email: 'a@b.c', name: null, avatarUrl: null, createdAt: '' }),
      );
      const client = new CanupClient({ token: 'tok' });
      await client.getMe();
      expect(fetchUrl()).toMatch(/^https:\/\/canup\.link/);
    });
  });

  // ──── Auth header ────

  describe('auth header', () => {
    test('sends Authorization: Bearer when token is set', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ id: '1', email: 'a@b.c', name: null, avatarUrl: null, createdAt: '' }),
      );
      const client = createClient();
      await client.getMe();
      expect(fetchOpts().headers.Authorization).toBe('Bearer test-token');
    });

    test('omits Authorization header when no token', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ id: '1', email: 'a@b.c', name: null, avatarUrl: null, createdAt: '' }),
      );
      const client = new CanupClient({ apiUrl: 'https://test.api' });
      await client.getMe();
      expect(fetchOpts().headers).not.toHaveProperty('Authorization');
    });
  });

  // ──── Content-Type header ────

  describe('content-type header', () => {
    test('always sends Content-Type: application/json', async () => {
      mockFetch.mockResolvedValueOnce(okResponse([]));
      const client = createClient();
      await client.listApps();
      expect(fetchOpts().headers['Content-Type']).toBe('application/json');
    });
  });

  // ──── Error handling (via request()) ────

  describe('error handling via request()', () => {
    test('throws with statusCode and errorType on API error envelope', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse('NotFoundError', 'App not found', 404));
      const client = createClient();

      const err: Error & { statusCode?: number; errorType?: string } = await client
        .getMe()
        .catch((e: unknown) => e as Error & { statusCode?: number; errorType?: string });

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('App not found');
      expect(err.statusCode).toBe(404);
      expect(err.errorType).toBe('NotFoundError');
    });

    test('error message matches the API error message', async () => {
      mockFetch.mockResolvedValueOnce(errorResponse('ValidationError', 'Invalid input', 422));
      const client = createClient();

      await expect(client.listApps()).rejects.toThrow('Invalid input');
    });

    test('throws when response is not valid JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      });
      const client = createClient();

      await expect(client.getMe()).rejects.toThrow();
    });
  });

  // ──── getAuthUrl ────

  describe('getAuthUrl', () => {
    test('sends GET to /v1/oauth/github with redirect_uri query param', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ url: 'https://github.com/login/oauth' }));
      const client = createClient();
      const result = await client.getAuthUrl('http://localhost:3000/callback');

      expect(fetchUrl()).toBe(
        'https://test.api/v1/oauth/github?redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback',
      );
      expect(result).toEqual({ url: 'https://github.com/login/oauth' });
    });
  });

  // ──── getMe ────

  describe('getMe', () => {
    test('sends GET to /v1/me and returns user info', async () => {
      const user = {
        id: 'u1',
        email: 'a@b.c',
        name: 'Test',
        avatarUrl: null,
        createdAt: '2026-01-01',
      };
      mockFetch.mockResolvedValueOnce(okResponse(user));
      const client = createClient();
      const result = await client.getMe();

      expect(fetchUrl()).toBe('https://test.api/v1/me');
      expect(fetchOpts().method).toBeUndefined(); // defaults to GET
      expect(result).toEqual(user);
    });
  });

  // ──── registerApp ────

  describe('registerApp', () => {
    test('sends POST to /v1/apps with canvaAppId and name', async () => {
      const app = { id: 'a1', canvaAppId: 'canva-123', name: 'My App' };
      mockFetch.mockResolvedValueOnce(okResponse(app));
      const client = createClient();
      const result = await client.registerApp('canva-123', 'My App');

      expect(fetchUrl()).toBe('https://test.api/v1/apps');
      expect(fetchOpts().method).toBe('POST');
      expect(JSON.parse(fetchOpts().body as string)).toEqual({
        canvaAppId: 'canva-123',
        name: 'My App',
      });
      expect(result).toEqual(app);
    });
  });

  // ──── listApps ────

  describe('listApps', () => {
    test('sends GET to /v1/apps and returns array', async () => {
      const apps = [{ id: 'a1', canvaAppId: 'c1', name: 'App1', createdAt: '' }];
      mockFetch.mockResolvedValueOnce(okResponse(apps));
      const client = createClient();
      const result = await client.listApps();

      expect(fetchUrl()).toBe('https://test.api/v1/apps');
      expect(result).toEqual(apps);
    });
  });

  // ──── getAppInfo ────

  describe('getAppInfo', () => {
    test('sends GET to /v1/apps/:appId with URL encoding', async () => {
      const app = { id: 'a1', canvaAppId: 'c1', name: 'App1', createdAt: '' };
      mockFetch.mockResolvedValueOnce(okResponse(app));
      const client = createClient();
      const result = await client.getAppInfo('app/special');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/app%2Fspecial');
      expect(result).toEqual(app);
    });
  });

  // ──── createApiKey ────

  describe('createApiKey', () => {
    test('sends POST to /v1/apps/:appId/api-keys', async () => {
      const key = { key: 'sk_live_xxx', prefix: 'sk_live' };
      mockFetch.mockResolvedValueOnce(okResponse(key));
      const client = createClient();
      const result = await client.createApiKey('a1', 'production');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/api-keys');
      expect(fetchOpts().method).toBe('POST');
      expect(JSON.parse(fetchOpts().body as string)).toEqual({ name: 'production' });
      expect(result).toEqual(key);
    });
  });

  // ──── deployAction ────

  describe('deployAction', () => {
    test('sends PUT to /v1/apps/:appId/actions/:slug with code and language', async () => {
      const deployed = {
        id: 'act1',
        slug: 'greet',
        language: 'nodejs',
        lambdaReady: true,
        createdAt: '',
        updatedAt: '',
      };
      mockFetch.mockResolvedValueOnce(okResponse(deployed));
      const client = createClient();
      const result = await client.deployAction('a1', 'greet', 'console.log("hi")', 'nodejs');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/actions/greet');
      expect(fetchOpts().method).toBe('PUT');
      expect(JSON.parse(fetchOpts().body as string)).toEqual({
        code: 'console.log("hi")',
        language: 'nodejs',
      });
      expect(result).toEqual(deployed);
    });

    test('encodes appId and slug in URL', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          id: '',
          slug: '',
          language: '',
          lambdaReady: false,
          createdAt: '',
          updatedAt: '',
        }),
      );
      const client = createClient();
      await client.deployAction('a/1', 's/lug', 'code', 'python');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a%2F1/actions/s%2Flug');
    });
  });

  // ──── listActions ────

  describe('listActions', () => {
    test('sends GET to /v1/apps/:appId/actions', async () => {
      const actions = [
        {
          id: 'act1',
          slug: 'greet',
          language: 'nodejs',
          deployed: true,
          contentHash: null,
          createdAt: '',
          updatedAt: '',
        },
      ];
      mockFetch.mockResolvedValueOnce(okResponse(actions));
      const client = createClient();
      const result = await client.listActions('a1');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/actions');
      expect(result).toEqual(actions);
    });
  });

  // ──── listActionsWithScript ────

  describe('listActionsWithScript', () => {
    test('sends GET to /v1/apps/:appId/actions?include=script', async () => {
      const actions = [
        {
          id: 'act1',
          slug: 'greet',
          language: 'nodejs',
          deployed: true,
          contentHash: null,
          script: 'code',
          createdAt: '',
          updatedAt: '',
        },
      ];
      mockFetch.mockResolvedValueOnce(okResponse(actions));
      const client = createClient();
      const result = await client.listActionsWithScript('a1');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/actions?include=script');
      expect(result).toEqual(actions);
    });
  });

  // ──── deleteAction ────

  describe('deleteAction', () => {
    test('sends DELETE to /v1/apps/:appId/actions/:slug', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ deleted: 'greet' }));
      const client = createClient();
      const result = await client.deleteAction('a1', 'greet');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/actions/greet');
      expect(fetchOpts().method).toBe('DELETE');
      expect(result).toEqual({ deleted: 'greet' });
    });
  });

  // ──── testAction (custom fetch handling) ────

  describe('testAction', () => {
    test('sends POST to /v1/apps/:appId/actions/:slug/test with code, language, params', async () => {
      const testResult = { ok: true, data: { result: 42, durationMs: 100, printOutput: '' } };
      mockFetch.mockResolvedValueOnce(rawResponse(testResult));
      const client = createClient();
      const result = await client.testAction('a1', 'greet', 'console.log(1)', 'nodejs', { x: 1 });

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/actions/greet/test');
      expect(fetchOpts().method).toBe('POST');
      expect(JSON.parse(fetchOpts().body as string)).toEqual({
        code: 'console.log(1)',
        language: 'nodejs',
        params: { x: 1 },
      });
      expect(result).toEqual(testResult);
    });

    test('returns raw TestResult on success (full envelope, not unwrapped)', async () => {
      const testResult = {
        ok: true,
        data: { result: { greeting: 'hi' }, durationMs: 50, printOutput: 'debug' },
      };
      mockFetch.mockResolvedValueOnce(rawResponse(testResult));
      const client = createClient();
      const result = await client.testAction('a1', 'greet', 'code', 'nodejs', {});

      expect(result).toEqual(testResult);
      expect(result).toHaveProperty('ok', true);
      expect(result).toHaveProperty('data');
    });

    test('returns raw TestError on script failure (full envelope)', async () => {
      const testError = {
        ok: false,
        error: { type: 'RuntimeError', message: 'boom', durationMs: 10 },
      };
      mockFetch.mockResolvedValueOnce(rawResponse(testError));
      const client = createClient();
      const result = await client.testAction('a1', 'greet', 'code', 'nodejs', {});

      expect(result).toEqual(testError);
      expect(result).toHaveProperty('ok', false);
    });

    test('throws on HTTP error with statusCode and errorType', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { type: 'AuthError', message: 'Invalid token' } }),
      });
      const client = createClient();

      const err: Error & { statusCode?: number; errorType?: string } = await client
        .testAction('a1', 'greet', 'code', 'nodejs', {})
        .catch((e: unknown) => e as Error & { statusCode?: number; errorType?: string });

      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('Invalid token');
      expect(err.statusCode).toBe(401);
      expect(err.errorType).toBe('AuthError');
    });

    test('falls back to statusText and HttpError when response is not JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      });
      const client = createClient();

      const err: Error & { statusCode?: number; errorType?: string } = await client
        .testAction('a1', 'greet', 'code', 'nodejs', {})
        .catch((e: unknown) => e as Error & { statusCode?: number; errorType?: string });

      expect(err.message).toBe('Internal Server Error');
      expect(err.statusCode).toBe(500);
      expect(err.errorType).toBe('HttpError');
    });

    test('sends Authorization header when token is set', async () => {
      mockFetch.mockResolvedValueOnce(
        rawResponse({ ok: true, data: { result: null, durationMs: 0, printOutput: '' } }),
      );
      const client = createClient();
      await client.testAction('a1', 'greet', 'code', 'nodejs', {});

      expect(fetchOpts().headers.Authorization).toBe('Bearer test-token');
    });

    test('omits Authorization header when no token', async () => {
      mockFetch.mockResolvedValueOnce(
        rawResponse({ ok: true, data: { result: null, durationMs: 0, printOutput: '' } }),
      );
      const client = new CanupClient({ apiUrl: 'https://test.api' });
      await client.testAction('a1', 'greet', 'code', 'nodejs', {});

      expect(fetchOpts().headers).not.toHaveProperty('Authorization');
    });

    test('encodes appId and slug in URL', async () => {
      mockFetch.mockResolvedValueOnce(
        rawResponse({ ok: true, data: { result: null, durationMs: 0, printOutput: '' } }),
      );
      const client = createClient();
      await client.testAction('a/1', 's/lug', 'code', 'nodejs', {});

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a%2F1/actions/s%2Flug/test');
    });
  });

  // ──── runAction (custom fetch handling) ────

  describe('runAction', () => {
    test('sends POST to /v1/apps/:appId/actions/:slug/run with params', async () => {
      const runResult = { ok: true, data: { result: 'done', durationMs: 200, printOutput: '' } };
      mockFetch.mockResolvedValueOnce(rawResponse(runResult));
      const client = createClient();
      const result = await client.runAction('a1', 'greet', { input: 'test' });

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/actions/greet/run');
      expect(fetchOpts().method).toBe('POST');
      expect(JSON.parse(fetchOpts().body as string)).toEqual({ params: { input: 'test' } });
      expect(result).toEqual(runResult);
    });

    test('defaults params to empty object when not provided', async () => {
      mockFetch.mockResolvedValueOnce(
        rawResponse({ ok: true, data: { result: null, durationMs: 0, printOutput: '' } }),
      );
      const client = createClient();
      await client.runAction('a1', 'greet');

      expect(JSON.parse(fetchOpts().body as string)).toEqual({ params: {} });
    });

    test('returns raw TestError on script failure', async () => {
      const runError = {
        ok: false,
        error: { type: 'RuntimeError', message: 'crash', durationMs: 5 },
      };
      mockFetch.mockResolvedValueOnce(rawResponse(runError));
      const client = createClient();
      const result = await client.runAction('a1', 'greet');

      expect(result).toEqual(runError);
      expect(result).toHaveProperty('ok', false);
    });

    test('throws on HTTP error with statusCode and errorType', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () =>
          Promise.resolve({ error: { type: 'NotFoundError', message: 'Action not found' } }),
      });
      const client = createClient();

      const err: Error & { statusCode?: number; errorType?: string } = await client
        .runAction('a1', 'missing')
        .catch((e: unknown) => e as Error & { statusCode?: number; errorType?: string });

      expect(err.message).toBe('Action not found');
      expect(err.statusCode).toBe(404);
      expect(err.errorType).toBe('NotFoundError');
    });

    test('omits Authorization header when no token', async () => {
      mockFetch.mockResolvedValueOnce(
        rawResponse({ ok: true, data: { result: null, durationMs: 0, printOutput: '' } }),
      );
      const client = new CanupClient({ apiUrl: 'https://test.api' });
      await client.runAction('a1', 'greet');

      expect(fetchOpts().headers).not.toHaveProperty('Authorization');
    });

    test('falls back to statusText when response is not JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      });
      const client = createClient();

      const err: Error & { statusCode?: number; errorType?: string } = await client
        .runAction('a1', 'greet')
        .catch((e: unknown) => e as Error & { statusCode?: number; errorType?: string });

      expect(err.message).toBe('Bad Gateway');
      expect(err.statusCode).toBe(502);
      expect(err.errorType).toBe('HttpError');
    });
  });

  // ──── listHistory ────

  describe('listHistory', () => {
    test('sends GET to /v1/apps/:appId/history without slug', async () => {
      mockFetch.mockResolvedValueOnce(okResponse([]));
      const client = createClient();
      await client.listHistory('a1');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/history');
    });

    test('sends GET to /v1/apps/:appId/actions/:slug/history with slug', async () => {
      mockFetch.mockResolvedValueOnce(okResponse([]));
      const client = createClient();
      await client.listHistory('a1', 'greet');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/actions/greet/history');
    });

    test('appends limit and offset as query params', async () => {
      mockFetch.mockResolvedValueOnce(okResponse([]));
      const client = createClient();
      await client.listHistory('a1', undefined, { limit: 10, offset: 5 });

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/history?limit=10&offset=5');
    });

    test('returns history entries', async () => {
      const entries = [
        {
          id: 'h1',
          actionSlug: 'greet',
          status: 'success',
          durationMs: 100,
          executedAt: '',
          source: 'test',
        },
      ];
      mockFetch.mockResolvedValueOnce(okResponse(entries));
      const client = createClient();
      const result = await client.listHistory('a1');

      expect(result).toEqual(entries);
    });
  });

  // ──── getHistoryDetail ────

  describe('getHistoryDetail', () => {
    test('sends GET to /v1/apps/:appId/history/:id', async () => {
      const detail = {
        id: 'h1',
        actionSlug: 'greet',
        status: 'success',
        durationMs: 50,
        executedAt: '',
        source: 'test',
      };
      mockFetch.mockResolvedValueOnce(okResponse(detail));
      const client = createClient();
      const result = await client.getHistoryDetail('a1', 'h1');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/history/h1');
      expect(result).toEqual(detail);
    });
  });

  // ──── setSecret ────

  describe('setSecret', () => {
    test('sends PUT to /v1/apps/:appId/secrets/:name with value', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ name: 'API_KEY', created: true, synced: true }));
      const client = createClient();
      const result = await client.setSecret('a1', 'API_KEY', 'secret-value');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/secrets/API_KEY');
      expect(fetchOpts().method).toBe('PUT');
      expect(JSON.parse(fetchOpts().body as string)).toEqual({ value: 'secret-value' });
      expect(result).toEqual({ name: 'API_KEY', created: true, synced: true });
    });
  });

  // ──── listSecrets ────

  describe('listSecrets', () => {
    test('sends GET to /v1/apps/:appId/secrets', async () => {
      const secrets = [{ name: 'API_KEY', maskedValue: '****', updatedAt: '' }];
      mockFetch.mockResolvedValueOnce(okResponse(secrets));
      const client = createClient();
      const result = await client.listSecrets('a1');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/secrets');
      expect(result).toEqual(secrets);
    });
  });

  // ──── deleteSecret ────

  describe('deleteSecret', () => {
    test('sends DELETE to /v1/apps/:appId/secrets/:name', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ deleted: 'API_KEY', synced: true }));
      const client = createClient();
      const result = await client.deleteSecret('a1', 'API_KEY');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/secrets/API_KEY');
      expect(fetchOpts().method).toBe('DELETE');
      expect(result).toEqual({ deleted: 'API_KEY', synced: true });
    });
  });

  // ──── addDeps ────

  describe('addDeps', () => {
    test('sends POST to /v1/apps/:appId/deps/:language with packages', async () => {
      const depsResult = {
        cached: false,
        buildId: 'b1',
        status: 'building',
        packages: [],
        layerSize: null,
      };
      mockFetch.mockResolvedValueOnce(okResponse(depsResult));
      const client = createClient();
      const result = await client.addDeps('a1', 'nodejs', [{ name: 'express', version: '4.18.2' }]);

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/deps/nodejs');
      expect(fetchOpts().method).toBe('POST');
      expect(JSON.parse(fetchOpts().body as string)).toEqual({
        packages: [{ name: 'express', version: '4.18.2' }],
      });
      expect(result).toEqual(depsResult);
    });
  });

  // ──── listDeps ────

  describe('listDeps', () => {
    test('sends GET to /v1/apps/:appId/deps/:language', async () => {
      const depsResult = { packages: [], layerSize: null, layerArn: null };
      mockFetch.mockResolvedValueOnce(okResponse(depsResult));
      const client = createClient();
      const result = await client.listDeps('a1', 'nodejs');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/deps/nodejs');
      expect(result).toEqual(depsResult);
    });
  });

  // ──── removeDep ────

  describe('removeDep', () => {
    test('sends DELETE to /v1/apps/:appId/deps/:language/:packageName', async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({ deleted: 'express', buildId: 'b2', status: 'building' }),
      );
      const client = createClient();
      const result = await client.removeDep('a1', 'nodejs', 'express');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/deps/nodejs/express');
      expect(fetchOpts().method).toBe('DELETE');
      expect(result).toEqual({ deleted: 'express', buildId: 'b2', status: 'building' });
    });
  });

  // ──── clearDeps ────

  describe('clearDeps', () => {
    test('sends DELETE to /v1/apps/:appId/deps/:language', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ cleared: true }));
      const client = createClient();
      const result = await client.clearDeps('a1', 'python');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/deps/python');
      expect(fetchOpts().method).toBe('DELETE');
      expect(result).toEqual({ cleared: true });
    });
  });

  // ──── getBuildStatus ────

  describe('getBuildStatus', () => {
    test('sends GET to /v1/apps/:appId/deps/:language/builds/:buildId', async () => {
      const status = {
        id: 'b1',
        status: 'success',
        layerVersionArn: 'arn:aws:...',
        sizeBytes: 1024,
        errorMessage: null,
        createdAt: '',
        updatedAt: '',
      };
      mockFetch.mockResolvedValueOnce(okResponse(status));
      const client = createClient();
      const result = await client.getBuildStatus('a1', 'nodejs', 'b1');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/deps/nodejs/builds/b1');
      expect(result).toEqual(status);
    });
  });

  // ──── connectStripe ────

  describe('connectStripe', () => {
    test('sends PUT to /v1/apps/:appId/stripe/api-key with apiKey', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ connected: true }));
      const client = createClient();
      const result = await client.connectStripe('a1', 'sk_test_xxx');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/stripe/api-key');
      expect(fetchOpts().method).toBe('PUT');
      expect(JSON.parse(fetchOpts().body as string)).toEqual({ apiKey: 'sk_test_xxx' });
      expect(result).toEqual({ connected: true });
    });
  });

  // ──── stripeStatus ────

  describe('stripeStatus', () => {
    test('sends GET to /v1/apps/:appId/stripe', async () => {
      const status = {
        connected: true,
        maskedKey: 'sk_test_****xxx',
        webhookUrl: 'https://canup.link/wh/123',
      };
      mockFetch.mockResolvedValueOnce(okResponse(status));
      const client = createClient();
      const result = await client.stripeStatus('a1');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/stripe');
      expect(result).toEqual(status);
    });
  });

  // ──── disconnectStripe ────

  describe('disconnectStripe', () => {
    test('sends DELETE to /v1/apps/:appId/stripe', async () => {
      mockFetch.mockResolvedValueOnce(okResponse({ disconnected: true }));
      const client = createClient();
      const result = await client.disconnectStripe('a1');

      expect(fetchUrl()).toBe('https://test.api/v1/apps/a1/stripe');
      expect(fetchOpts().method).toBe('DELETE');
      expect(result).toEqual({ disconnected: true });
    });
  });
});
