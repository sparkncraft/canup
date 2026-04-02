// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getJwt, _resetCache } from '../internal/jwt-cache.js';

function createMockJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'RS256' }));
  const payload = btoa(JSON.stringify({ exp, aud: 'test-app', userId: 'u1', brandId: 'b1' }));
  return `${header}.${payload}.signature`;
}

const { mockGetCanvaUserToken } = vi.hoisted(() => ({
  mockGetCanvaUserToken: vi.fn(),
}));

vi.mock('@canva/user', () => ({
  auth: {
    getCanvaUserToken: mockGetCanvaUserToken,
  },
}));

describe('jwt-cache', () => {
  beforeEach(() => {
    _resetCache();
  });

  test('calls @canva/user auth on first call and returns token', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = createMockJwt(futureExp);
    mockGetCanvaUserToken.mockResolvedValue(token);

    const result = await getJwt();

    expect(result).toBe(token);
    expect(mockGetCanvaUserToken).toHaveBeenCalledTimes(1);
  });

  test('returns cached token on second call (no second auth call)', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = createMockJwt(futureExp);
    mockGetCanvaUserToken.mockResolvedValue(token);

    await getJwt();
    const result = await getJwt();

    expect(result).toBe(token);
    expect(mockGetCanvaUserToken).toHaveBeenCalledTimes(1);
  });

  test('refreshes token when within 30s of expiry', async () => {
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

  test('deduplicates concurrent getJwt() calls (only one auth call)', async () => {
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

  test('throws when auth function rejects', async () => {
    mockGetCanvaUserToken.mockRejectedValue(new Error('Not authenticated'));

    await expect(getJwt()).rejects.toThrow('Not authenticated');
  });

  test('fresh cache state after _resetCache (no cached token)', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token1 = createMockJwt(futureExp);
    const token2 = createMockJwt(futureExp);

    mockGetCanvaUserToken.mockResolvedValueOnce(token1);
    await getJwt();

    _resetCache();
    mockGetCanvaUserToken.mockResolvedValueOnce(token2);

    const result = await getJwt();
    expect(result).toBe(token2);
  });
});
