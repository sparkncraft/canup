import { describe, expect, test as baseTest, vi } from 'vitest';

function createMockJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'RS256' }));
  const payload = btoa(JSON.stringify({ exp, aud: 'test-app', userId: 'u1', brandId: 'b1' }));
  return `${header}.${payload}.signature`;
}

const { mockGetCanvaUserToken } = vi.hoisted(() => ({
  mockGetCanvaUserToken: vi.fn(),
}));

vi.mock('@canva/user', () => ({
  auth: { getCanvaUserToken: mockGetCanvaUserToken },
}));

const test = baseTest.extend<{ getJwt: typeof import('../internal/jwt-cache.js').getJwt }>({
  getJwt: async ({}, use) => {
    vi.resetModules();
    const { getJwt } = await import('../internal/jwt-cache.js');
    await use(getJwt);
  },
});

describe('jwt-cache', () => {
  test('calls @canva/user auth on first call and returns token', async ({ getJwt }) => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = createMockJwt(futureExp);
    mockGetCanvaUserToken.mockResolvedValue(token);

    const result = await getJwt();

    expect(result).toBe(token);
    expect(mockGetCanvaUserToken).toHaveBeenCalledTimes(1);
  });

  test('returns cached token on second call (no second auth call)', async ({ getJwt }) => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = createMockJwt(futureExp);
    mockGetCanvaUserToken.mockResolvedValue(token);

    await getJwt();
    const result = await getJwt();

    expect(result).toBe(token);
    expect(mockGetCanvaUserToken).toHaveBeenCalledTimes(1);
  });

  test('refreshes token when within 30s of expiry', async ({ getJwt }) => {
    const nearExp = Math.floor(Date.now() / 1000) + 20;
    const oldToken = createMockJwt(nearExp);

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const newToken = createMockJwt(futureExp);

    mockGetCanvaUserToken.mockResolvedValueOnce(oldToken).mockResolvedValueOnce(newToken);

    await getJwt();
    const result = await getJwt();

    expect(result).toBe(newToken);
    expect(mockGetCanvaUserToken).toHaveBeenCalledTimes(2);
  });

  test('deduplicates concurrent getJwt() calls (only one auth call)', async ({ getJwt }) => {
    const nearExp = Math.floor(Date.now() / 1000) + 10;
    const primingToken = createMockJwt(nearExp);
    mockGetCanvaUserToken.mockResolvedValueOnce(primingToken);

    await getJwt();
    const callsBefore = mockGetCanvaUserToken.mock.calls.length;

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const refreshToken = createMockJwt(futureExp);
    mockGetCanvaUserToken.mockResolvedValue(refreshToken);

    const [r1, r2, r3] = await Promise.all([getJwt(), getJwt(), getJwt()]);

    expect(r1).toBe(refreshToken);
    expect(r2).toBe(refreshToken);
    expect(r3).toBe(refreshToken);
    expect(mockGetCanvaUserToken.mock.calls.length - callsBefore).toBe(1);
  });

  test('throws when auth function rejects', async ({ getJwt }) => {
    mockGetCanvaUserToken.mockRejectedValue(new Error('Not authenticated'));

    await expect(getJwt()).rejects.toThrow('Not authenticated');
  });

  test('re-fetches token after module re-import (fresh cache)', async ({ getJwt }) => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = createMockJwt(futureExp);
    mockGetCanvaUserToken.mockResolvedValue(token);

    const result = await getJwt();

    expect(result).toBe(token);
    expect(mockGetCanvaUserToken).toHaveBeenCalledTimes(1);
  });
});
