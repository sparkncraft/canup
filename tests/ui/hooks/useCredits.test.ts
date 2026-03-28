// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useCredits } from '../../../src/ui/hooks/useCredits.js';
import { fetchCredits } from '../../../src/ui/internal/api-client.js';
import { creditStore } from '../../../src/ui/internal/credit-store.js';
import type { CreditBalance } from '../../../src/ui/internal/types.js';

// Mock credit store with a resettable Map for test isolation
const { mockStoreMap } = vi.hoisted(() => {
  const mockStoreMap = { current: new Map<string, CreditBalance>() };
  return { mockStoreMap };
});

vi.mock('../../../src/ui/internal/credit-store.js', () => {
  let listeners: (() => void)[] = [];
  const emitChange = () => listeners.forEach((l) => l());
  return {
    creditStore: {
      subscribe: (listener: () => void) => {
        listeners = [...listeners, listener];
        return () => {
          listeners = listeners.filter((l) => l !== listener);
        };
      },
      getSnapshot: () => mockStoreMap.current,
      setCredits: (action: string, data: CreditBalance) => {
        mockStoreMap.current = new Map(mockStoreMap.current);
        mockStoreMap.current.set(action, data);
        emitChange();
      },
    },
  };
});

vi.mock('../../../src/ui/internal/api-client.js', () => ({
  fetchCredits: vi.fn(),
}));
vi.mock('../../../src/ui/internal/jwt-cache.js', () => ({
  getJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));
vi.mock('@canva/user', () => ({
  auth: { getCanvaUserToken: vi.fn() },
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

describe('useCredits', () => {
  afterEach(cleanup);

  beforeEach(() => {
    mockStoreMap.current = new Map();
    mockFetchCredits.mockResolvedValue(mockBalance);
  });

  it('returns { data: null, loading: true, exhausted: false } initially (no cached data)', () => {
    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.exhausted).toBe(false);
    expect(typeof result.current.refresh).toBe('function');
  });

  it('fetches credits from server on mount when no cached data', async () => {
    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockBalance);
    });

    expect(mockFetchCredits).toHaveBeenCalledWith('my-action');
    expect(result.current.loading).toBe(false);
  });

  it('returns cached data immediately without fetch when store has data', () => {
    creditStore.setCredits('my-action', mockBalance);

    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.data).toEqual(mockBalance);
    expect(result.current.loading).toBe(false);
    expect(mockFetchCredits).not.toHaveBeenCalled();
  });

  it('data updates when creditStore.setCredits is called (useSyncExternalStore subscription)', async () => {
    creditStore.setCredits('my-action', mockBalance);

    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.data!.remaining).toBe(90);

    const updated: CreditBalance = { ...mockBalance, used: 50, remaining: 50 };
    act(() => {
      creditStore.setCredits('my-action', updated);
    });

    expect(result.current.data!.remaining).toBe(50);
  });

  it('exhausted is true when remaining === 0 and quota !== null', () => {
    const exhausted: CreditBalance = { ...mockBalance, remaining: 0, used: 100 };
    creditStore.setCredits('my-action', exhausted);

    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.exhausted).toBe(true);
  });

  it('exhausted is false when remaining === 0 and quota === null (free action)', () => {
    const freeAction: CreditBalance = { ...mockBalance, quota: null, remaining: 0 };
    creditStore.setCredits('my-action', freeAction);

    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.exhausted).toBe(false);
  });

  it('exhausted is false when remaining > 0', () => {
    creditStore.setCredits('my-action', mockBalance);

    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.exhausted).toBe(false);
  });

  it('refresh() re-fetches from server and updates store', async () => {
    creditStore.setCredits('my-action', mockBalance);

    const refreshed: CreditBalance = { ...mockBalance, used: 20, remaining: 80 };
    mockFetchCredits.mockResolvedValue(refreshed);

    const { result } = renderHook(() => useCredits('my-action'));

    await act(async () => {
      result.current.refresh();
      // Wait for the fetch to complete
      await vi.waitFor(() => {
        expect(mockFetchCredits).toHaveBeenCalledWith('my-action');
      });
    });

    await waitFor(() => {
      expect(result.current.data!.remaining).toBe(80);
    });
  });

  it('does NOT re-fetch when action slug changes and new slug has cached data', () => {
    creditStore.setCredits('action-a', mockBalance);
    creditStore.setCredits('action-b', { ...mockBalance, used: 5, remaining: 95 });

    const { result, rerender } = renderHook(({ action }) => useCredits(action), {
      initialProps: { action: 'action-a' },
    });

    expect(result.current.data!.remaining).toBe(90);

    rerender({ action: 'action-b' });

    expect(result.current.data!.remaining).toBe(95);
    expect(mockFetchCredits).not.toHaveBeenCalled();
  });

  it('returns subscribeUrl: null initially (before fetch completes)', () => {
    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.subscribeUrl).toBeNull();
  });

  it('returns subscribeUrl from server response after data loads', async () => {
    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockBalance);
    });

    expect(result.current.subscribeUrl).toBe('https://canup.link/subscribe/V1StGXR8_Z5j');
  });

  it('refresh() updates subscribeUrl from new server response', async () => {
    creditStore.setCredits('my-action', mockBalance);

    const refreshed: CreditBalance = {
      ...mockBalance,
      subscribeUrl: 'https://canup.link/subscribe/NewToken123',
    };
    mockFetchCredits.mockResolvedValue(refreshed);

    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.subscribeUrl).toBe('https://canup.link/subscribe/V1StGXR8_Z5j');

    await act(async () => {
      result.current.refresh();
      await vi.waitFor(() => {
        expect(mockFetchCredits).toHaveBeenCalledWith('my-action');
      });
    });

    await waitFor(() => {
      expect(result.current.subscribeUrl).toBe('https://canup.link/subscribe/NewToken123');
    });
  });

  it('auto-refreshes every 20 minutes', async () => {
    vi.useFakeTimers();
    mockFetchCredits.mockResolvedValue(mockBalance);

    renderHook(() => useCredits('my-action'));

    // Flush microtasks for initial fetch (resolve the promise)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    // Clear call count from initial fetch
    mockFetchCredits.mockClear();

    // Advance 20 minutes to trigger auto-refresh interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20 * 60 * 1000);
    });

    expect(mockFetchCredits).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('cleans up auto-refresh interval on unmount', async () => {
    vi.useFakeTimers();
    mockFetchCredits.mockResolvedValue(mockBalance);

    const { unmount } = renderHook(() => useCredits('my-action'));

    // Flush microtasks for initial fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    mockFetchCredits.mockClear();
    unmount();

    // Advance 20 minutes -- should NOT trigger fetch (interval cleaned up)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20 * 60 * 1000);
    });

    expect(mockFetchCredits).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('exhausted is true when remaining is -1 (negative -- race condition safety)', () => {
    const negative: CreditBalance = { ...mockBalance, remaining: -1, used: 101 };
    creditStore.setCredits('my-action', negative);

    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.exhausted).toBe(true);
  });
});
