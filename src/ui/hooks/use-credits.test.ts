import { describe, expect, test as baseTest, vi } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useCredits } from './use-credits.js';
import { fetchCredits } from '../internal/api-client.js';
import { queryClient, creditKey } from '../internal/query.js';
import { acquire } from '../internal/realtime.js';
import type { CreditBalance } from '../types.js';

vi.mock('../internal/api-client.js', () => ({
  fetchCredits: vi.fn(),
}));
vi.mock('../internal/jwt-cache.js', () => ({
  getJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));
// useCredits only ref-counts the shared SSE connection (acquire → release). The
// actual SSE → cache handling lives in realtime.ts and is tested there; here we
// just stub the lifecycle.
vi.mock('../internal/realtime.js', () => ({
  acquire: vi.fn(),
}));

const mockFetchCredits = vi.mocked(fetchCredits);
const mockAcquire = vi.mocked(acquire);
const release = vi.fn();

const mockBalance: CreditBalance = {
  subscribed: false,
  quota: 100,
  used: 10,
  remaining: 90,
  resetAt: '2026-04-01T00:00:00Z',
  interval: 'monthly',
  billingAvailable: true,
};

const test = baseTest.extend('_rtl', [
  async ({}, use) => {
    queryClient.clear();
    mockFetchCredits.mockResolvedValue(mockBalance);
    mockAcquire.mockReturnValue(release); // re-apply impl after global mockReset
    await use();
    cleanup();
  },
  { auto: true },
]);

describe('useCredits', () => {
  test('returns { data: null, loading: true, exhausted: false, error: null } initially', () => {
    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.exhausted).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refresh).toBe('function');
  });

  test('fetches credits from server on mount (TQ automatic fetch)', async () => {
    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockBalance);
    });

    expect(mockFetchCredits).toHaveBeenCalledWith('my-action');
    expect(result.current.loading).toBe(false);
  });

  test('exhausted is true when remaining <= 0 and quota !== null', async () => {
    const exhausted: CreditBalance = { ...mockBalance, remaining: 0, used: 100 };
    mockFetchCredits.mockResolvedValue(exhausted);

    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });

    expect(result.current.exhausted).toBe(true);
  });

  test('exhausted is false when quota is null (free/unlimited action)', async () => {
    const freeAction: CreditBalance = { ...mockBalance, quota: null, remaining: 0 };
    mockFetchCredits.mockResolvedValue(freeAction);

    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });

    expect(result.current.exhausted).toBe(false);
  });

  test('exhausted is true when remaining is negative (race condition safety)', async () => {
    const negative: CreditBalance = { ...mockBalance, remaining: -1, used: 101 };
    mockFetchCredits.mockResolvedValue(negative);

    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });

    expect(result.current.exhausted).toBe(true);
  });

  test('refresh() triggers a refetch from server', async () => {
    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockBalance);
    });

    const callsBefore = mockFetchCredits.mock.calls.length;

    const refreshed: CreditBalance = { ...mockBalance, used: 20, remaining: 80 };
    mockFetchCredits.mockResolvedValue(refreshed);

    result.current.refresh();

    await waitFor(() => {
      expect(mockFetchCredits.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    await waitFor(() => {
      expect(result.current.data!.remaining).toBe(80);
    });
  });

  test('billingAvailable is exposed via data.billingAvailable', async () => {
    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });

    expect(result.current.data!.billingAvailable).toBe(true);
  });

  test('exposes error as CanupError when fetch fails after retries', async () => {
    mockFetchCredits.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeNull();
    expect(result.current.exhausted).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error!.code).toBe('NETWORK_ERROR');
    expect(result.current.error!.message).toBe('Network error');
  });

  test('live updates land via the credit cache (realtime.ts writes it, the hook reads it)', async () => {
    // SSE `credits.update` events are applied in realtime.ts by writing
    // creditKey(action); useCredits re-renders off that same cache. This is the
    // consumer side of the live flow — the dispatch itself is tested in
    // realtime.test.ts.
    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockBalance);
    });
    expect(result.current.data!.remaining).toBe(90);

    const updated: CreditBalance = { ...mockBalance, used: 50, remaining: 50 };
    queryClient.setQueryData(creditKey('my-action'), updated);

    await waitFor(() => {
      expect(result.current.data!.remaining).toBe(50);
    });
  });

  test('acquires the shared SSE connection on mount', () => {
    renderHook(() => useCredits('my-action'));
    expect(mockAcquire).toHaveBeenCalledOnce();
  });

  test('releases the SSE connection on unmount', () => {
    const { unmount } = renderHook(() => useCredits('my-action'));
    expect(mockAcquire).toHaveBeenCalledOnce();

    unmount();
    expect(release).toHaveBeenCalledOnce();
  });
});
