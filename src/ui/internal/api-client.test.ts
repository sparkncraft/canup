// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { CanupError } from '../internal/errors.js';

function createMockJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'RS256' }));
  const payload = btoa(JSON.stringify({ exp, aud: 'test-app', userId: 'u1', brandId: 'b1' }));
  return `${header}.${payload}.signature`;
}

const TEST_TOKEN = createMockJwt(Math.floor(Date.now() / 1000) + 3600);
const BASE_URL = 'http://test-canup.local';

const { mockGetJwt } = vi.hoisted(() => ({
  mockGetJwt: vi.fn(),
}));
vi.mock('../internal/jwt-cache.js', () => ({
  getJwt: mockGetJwt,
}));
vi.mock('@canva/user', () => ({
  auth: { getCanvaUserToken: vi.fn() },
}));

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  delete (globalThis as Record<string, unknown>).__canup_url;
});
afterAll(() => server.close());

describe('api-client', () => {
  beforeEach(() => {
    mockGetJwt.mockResolvedValue(TEST_TOKEN);
    (globalThis as Record<string, unknown>).__canup_url = BASE_URL;
  });

  const getModule = async () => import('../internal/api-client.js');

  describe('runAction', () => {
    it('sends POST with params and Authorization header', async () => {
      let capturedHeaders: Headers | null = null;
      let capturedBody: unknown = null;

      server.use(
        http.post(`${BASE_URL}/run/my-action`, async ({ request }) => {
          capturedHeaders = request.headers;
          capturedBody = await request.json();
          return HttpResponse.json({ ok: true, data: { result: 'done', durationMs: 42 } });
        }),
      );

      const { runAction } = await getModule();
      await runAction('my-action', { prompt: 'hello' });

      expect(capturedHeaders!.get('Authorization')).toBe(`Bearer ${TEST_TOKEN}`);
      expect(capturedHeaders!.get('Content-Type')).toBe('application/json');
      expect(capturedBody).toEqual({ params: { prompt: 'hello' } });
    });

    it('sends { params: {} } when no params provided', async () => {
      let capturedBody: unknown = null;

      server.use(
        http.post(`${BASE_URL}/run/my-action`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({ ok: true, data: { result: 'ok', durationMs: 1 } });
        }),
      );

      const { runAction } = await getModule();
      await runAction('my-action');

      expect(capturedBody).toEqual({ params: {} });
    });

    it('returns { result, durationMs } on success', async () => {
      server.use(
        http.post(`${BASE_URL}/run/my-action`, () =>
          HttpResponse.json({
            ok: true,
            data: { result: { imageUrl: 'https://example.com/img.png' }, durationMs: 150 },
          }),
        ),
      );

      const { runAction } = await getModule();
      const result = await runAction('my-action');

      expect(result).toEqual({
        result: { imageUrl: 'https://example.com/img.png' },
        durationMs: 150,
      });
    });

    it('throws CanupError with type CREDITS_EXHAUSTED on 403', async () => {
      server.use(
        http.post(`${BASE_URL}/run/my-action`, () =>
          HttpResponse.json(
            {
              ok: false,
              error: {
                type: 'CREDITS_EXHAUSTED',
                message: 'Credits exhausted',
                details: { quota: 10, used: 10, remaining: 0 },
              },
            },
            { status: 403 },
          ),
        ),
      );

      const { runAction } = await getModule();

      try {
        await runAction('my-action');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CanupError);
        expect((err as CanupError).type).toBe('CREDITS_EXHAUSTED');
        expect((err as CanupError).details).toEqual({ quota: 10, used: 10, remaining: 0 });
      }
    });

    it('throws CanupError with type ACTION_NOT_FOUND on 404', async () => {
      server.use(
        http.post(`${BASE_URL}/run/missing`, () =>
          HttpResponse.json(
            { ok: false, error: { type: 'ACTION_NOT_FOUND', message: 'Action not found' } },
            { status: 404 },
          ),
        ),
      );

      const { runAction } = await getModule();

      try {
        await runAction('missing');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CanupError);
        expect((err as CanupError).type).toBe('ACTION_NOT_FOUND');
      }
    });
  });

  describe('fetchCredits', () => {
    it('sends GET with Authorization header', async () => {
      let capturedHeaders: Headers | null = null;

      server.use(
        http.get(`${BASE_URL}/run/my-action/credits`, ({ request }) => {
          capturedHeaders = request.headers;
          return HttpResponse.json({
            ok: true,
            data: {
              quota: 100,
              used: 5,
              remaining: 95,
              resetAt: null,
              interval: 'monthly',
              email: null,
            },
          });
        }),
      );

      const { fetchCredits } = await getModule();
      await fetchCredits('my-action');

      expect(capturedHeaders!.get('Authorization')).toBe(`Bearer ${TEST_TOKEN}`);
    });

    it('returns CreditBalance on success', async () => {
      server.use(
        http.get(`${BASE_URL}/run/my-action/credits`, () =>
          HttpResponse.json({
            ok: true,
            data: {
              quota: 100,
              used: 5,
              remaining: 95,
              resetAt: '2026-04-01T00:00:00Z',
              interval: 'monthly',
              email: 'user@example.com',
            },
          }),
        ),
      );

      const { fetchCredits } = await getModule();
      const result = await fetchCredits('my-action');

      expect(result).toEqual({
        quota: 100,
        used: 5,
        remaining: 95,
        resetAt: '2026-04-01T00:00:00Z',
        interval: 'monthly',
        email: 'user@example.com',
      });
    });

    it('throws CanupError on error', async () => {
      server.use(
        http.get(`${BASE_URL}/run/my-action/credits`, () =>
          HttpResponse.json(
            { ok: false, error: { type: 'HTTP_ERROR', message: 'Unauthorized' } },
            { status: 401 },
          ),
        ),
      );

      const { fetchCredits } = await getModule();

      try {
        await fetchCredits('my-action');
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CanupError);
        expect((err as CanupError).type).toBe('HTTP_ERROR');
      }
    });
  });

  describe('base URL', () => {
    it('uses globalThis.__canup_url override when set', async () => {
      (globalThis as Record<string, unknown>).__canup_url = 'http://custom-url.local';

      server.use(
        http.post(`http://custom-url.local/run/my-action`, () =>
          HttpResponse.json({ ok: true, data: { result: 'ok', durationMs: 1 } }),
        ),
      );

      const { runAction } = await getModule();
      const result = await runAction('my-action');

      expect(result).toEqual({ result: 'ok', durationMs: 1 });
    });
  });
});
