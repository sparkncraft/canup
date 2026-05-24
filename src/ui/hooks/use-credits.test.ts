import { describe, expect, test as baseTest, vi } from 'vitest';
import { renderHook, waitFor, cleanup, act } from '@testing-library/react';
import { useCredits } from './use-credits.js';
import { fetchCredits } from '../internal/api-client.js';
import { queryClient, creditKey } from '../internal/query.js';
import { acquire, type SdkEvent } from '../internal/realtime.js';
import type { CreditBalance } from '../types.js';

vi.mock('../internal/api-client.js', () => ({
  fetchCredits: vi.fn(),
}));
vi.mock('../internal/jwt-cache.js', () => ({
  getJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));

// Stub the realtime singleton so tests can dispatch synthetic events
// without opening a real EventSource.
const sseHandlers = new Set<(event: SdkEvent) => void>();
vi.mock('../internal/realtime.js', async () => {
  const actual =
    await vi.importActual<typeof import('../internal/realtime.js')>('../internal/realtime.js');
  return {
    ...actual,
    acquire: vi.fn((handler: (event: SdkEvent) => void) => {
      sseHandlers.add(handler);
      return () => {
        sseHandlers.delete(handler);
      };
    }),
  };
});
function emitTestEvent(event: SdkEvent): void {
  for (const h of sseHandlers) h(event);
}

const mockFetchCredits = vi.mocked(fetchCredits);
const mockAcquire = vi.mocked(acquire);

const mockBalance: CreditBalance = {
  subscribed: false,
  quota: 100,
  used: 10,
  remaining: 90,
  resetAt: '2026-04-01T00:00:00Z',
  interval: 'monthly',
  email: null,
  billingUrl: 'https://canup.link/subscribe/V1StGXR8_Z5j',
};

const test = baseTest.extend('_rtl', [
  async ({}, use) => {
    queryClient.clear();
    mockFetchCredits.mockResolvedValue(mockBalance);
    sseHandlers.clear();
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

  test('billingUrl is available via data.billingUrl', async () => {
    const { result } = renderHook(() => useCredits('my-action'));

    expect(result.current.data).toBeNull();

    await waitFor(() => {
      expect(result.current.data).toBeTruthy();
    });

    expect(result.current.data!.billingUrl).toBe('https://canup.link/subscribe/V1StGXR8_Z5j');
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
    expect(result.current.error!.type).toBe('NETWORK_ERROR');
    expect(result.current.error!.message).toBe('Network error');
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

  test('subscribes to the SSE singleton on mount', () => {
    renderHook(() => useCredits('my-action'));
    expect(mockAcquire).toHaveBeenCalled();
    expect(sseHandlers.size).toBeGreaterThan(0);
  });

  test('SSE credits.update event merges new balance into cache (preserves identity fields)', async () => {
    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockBalance);
    });

    act(() => {
      emitTestEvent({
        type: 'credits.update',
        action: 'my-action',
        balance: {
          subscribed: true,
          quota: 500,
          used: 50,
          remaining: 450,
          resetAt: '2026-05-01T00:00:00.000Z',
          interval: 'monthly',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.data!.remaining).toBe(450);
    });

    // Identity fields from the initial fetch are preserved through the merge.
    expect(result.current.data!.billingUrl).toBe(mockBalance.billingUrl);
  });

  test('SSE event for a different action does NOT touch this hook cache', async () => {
    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockBalance);
    });

    act(() => {
      emitTestEvent({
        type: 'credits.update',
        action: 'other-action',
        balance: {
          subscribed: false,
          quota: 100,
          used: 99,
          remaining: 1,
          resetAt: null,
          interval: 'monthly',
        },
      });
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(result.current.data!.remaining).toBe(90); // unchanged
  });

  test('unknown event types in the hook dispatcher are silently ignored', async () => {
    const { result } = renderHook(() => useCredits('my-action'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockBalance);
    });

    // Cast: simulate a future event type that the hook doesn't recognize.
    // Wire-level unknown events are dropped in realtime.ts via Zod;
    // this asserts the second line of defense in the hook itself.
    act(() => {
      emitTestEvent({ type: 'some.future.event' } as unknown as SdkEvent);
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(result.current.data).toEqual(mockBalance);
  });

  test('release function unsubscribes the handler on unmount', () => {
    const { unmount } = renderHook(() => useCredits('my-action'));
    expect(sseHandlers.size).toBeGreaterThan(0);
    unmount();
    expect(sseHandlers.size).toBe(0);
  });
});
