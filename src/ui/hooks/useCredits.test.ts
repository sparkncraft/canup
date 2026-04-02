import { describe, expect, vi } from 'vitest';
import { test as baseTest } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useCredits } from '../hooks/useCredits.js';
import { fetchCredits } from '../internal/api-client.js';
import { queryClient, creditKey } from '../internal/query.js';
import type { CreditBalance } from '../internal/types.js';

vi.mock('../internal/api-client.js', () => ({
  fetchCredits: vi.fn(),
}));
vi.mock('../internal/jwt-cache.js', () => ({
  getJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));
const mockFetchCredits = vi.mocked(fetchCredits);

const mockBalance: CreditBalance = {
  subscribed: false,
  quota: 100,
  used: 10,
  remaining: 90,
  resetAt: '2026-04-01T00:00:00Z',
  interval: 'monthly',
  email: null,
  subscribeUrl: 'https://canup.link/subscribe/V1StGXR8_Z5j',
};

const test = baseTest.extend('_rtl', [
  async ({}, use) => {
    queryClient.clear();
    mockFetchCredits.mockResolvedValue(mockBalance);
    await use();
    cleanup();
  },
  { auto: true },
]);

describe('useCredits', () => {
  test('returns { data: null, loading: true, exhausted: false } initially', () => {
    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.exhausted).toBe(false);
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

  test('returns subscribeUrl from fetched data', async () => {
    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.subscribeUrl).toBeNull();

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });

    expect(result.current.subscribeUrl).toBe('https://canup.link/subscribe/V1StGXR8_Z5j');
  });

  test('data updates when queryClient.setQueryData is called externally (cross-component sync)', async () => {
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

  test('returns { data: null, loading: false } when fetch fails after retries', async () => {
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
});
