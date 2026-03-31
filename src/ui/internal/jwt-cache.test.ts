// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

function createMockJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'RS256' }));
  const payload = btoa(JSON.stringify({ exp, aud: 'test-app', userId: 'u1', brandId: 'b1' }));
  return `${header}.${payload}.signature`;
}

// The @canva/user mock must use vi.hoisted to survive vi.resetModules
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
    vi.resetModules();
    // Re-register the mock after resetModules so dynamic import('@canva/user') works
    vi.doMock('@canva/user', () => ({
      auth: {
        getCanvaUserToken: mockGetCanvaUserToken,
      },
    }));
    mockGetCanvaUserToken.mockReset();
  });

  async function getModule() {
    return import('../internal/jwt-cache.js');
  }

  it('calls @canva/user auth on first call and returns token', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = createMockJwt(futureExp);
    mockGetCanvaUserToken.mockResolvedValue(token);

    const { getJwt } = await getModule();
    const result = await getJwt();

    expect(result).toBe(token);
    expect(mockGetCanvaUserToken).toHaveBeenCalledTimes(1);
  });

  it('returns cached token on second call (no second auth call)', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = createMockJwt(futureExp);
    mockGetCanvaUserToken.mockResolvedValue(token);

    const { getJwt } = await getModule();
    await getJwt();
    const result = await getJwt();

    expect(result).toBe(token);
    expect(mockGetCanvaUserToken).toHaveBeenCalledTimes(1);
  });

  it('refreshes token when within 30s of expiry', async () => {
    const nearExp = Math.floor(Date.now() / 1000) + 20;
    const oldToken = createMockJwt(nearExp);

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const newToken = createMockJwt(futureExp);

    mockGetCanvaUserToken.mockResolvedValueOnce(oldToken).mockResolvedValueOnce(newToken);

    const { getJwt } = await getModule();
    await getJwt();
    const result = await getJwt();

    expect(result).toBe(newToken);
    expect(mockGetCanvaUserToken).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent getJwt() calls (only one auth call)', async () => {
    // Prime with a near-expiry token so the next calls trigger a refresh
    const nearExp = Math.floor(Date.now() / 1000) + 10; // within 30s buffer
    const primingToken = createMockJwt(nearExp);
    mockGetCanvaUserToken.mockResolvedValueOnce(primingToken);

    const { getJwt } = await getModule();
    await getJwt(); // Prime the lazy import
    mockGetCanvaUserToken.mockClear();

    // Now concurrent calls should all refresh (token near expiry)
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const refreshToken = createMockJwt(futureExp);
    mockGetCanvaUserToken.mockResolvedValue(refreshToken);

    const [r1, r2, r3] = await Promise.all([getJwt(), getJwt(), getJwt()]);

    expect(r1).toBe(refreshToken);
    expect(r2).toBe(refreshToken);
    expect(r3).toBe(refreshToken);
    // Should only call auth once (dedup via pendingRequest)
    expect(mockGetCanvaUserToken).toHaveBeenCalledTimes(1);
  });

  it('throws when auth function rejects', async () => {
    mockGetCanvaUserToken.mockRejectedValue(new Error('Not authenticated'));

    const { getJwt } = await getModule();
    await expect(getJwt()).rejects.toThrow('Not authenticated');
  });

  it('fresh module state after vi.resetModules (no cached token)', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token1 = createMockJwt(futureExp);
    const token2 = createMockJwt(futureExp);

    mockGetCanvaUserToken.mockResolvedValueOnce(token1);

    const { getJwt: getJwt1 } = await getModule();
    await getJwt1();

    // Reset modules to clear cached state
    vi.resetModules();
    vi.doMock('@canva/user', () => ({
      auth: { getCanvaUserToken: mockGetCanvaUserToken },
    }));
    mockGetCanvaUserToken.mockResolvedValueOnce(token2);

    const { getJwt: getJwt2 } = await getModule();
    const result = await getJwt2();

    expect(result).toBe(token2);
  });
});
