import { describe, expect, test as baseTest, vi } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useCustomer } from './use-customer.js';
import { fetchCustomer } from '../internal/api-client.js';
import { queryClient, customerKey } from '../internal/query.js';
import { acquire } from '../internal/realtime.js';
import type { Customer } from '@canup/contracts';

vi.mock('../internal/api-client.js', () => ({
  fetchCustomer: vi.fn(),
}));
vi.mock('../internal/jwt-cache.js', () => ({
  getJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));
// useCustomer only ref-counts the shared SSE connection (acquire → release). The
// actual SSE → cache handling lives in realtime.ts and is tested there; here we
// just stub the lifecycle.
vi.mock('../internal/realtime.js', () => ({
  acquire: vi.fn(),
}));

const mockFetchCustomer = vi.mocked(fetchCustomer);
const mockAcquire = vi.mocked(acquire);
const release = vi.fn();

const mockCustomer: Customer = {
  appName: 'Acme',
  subscriptionStatus: 'active',
  cancelAt: null,
  trialEnd: null,
  email: 'subscriber@example.com',
  billingAvailable: true,
};

const test = baseTest.extend('_rtl', [
  async ({}, use) => {
    queryClient.clear();
    mockFetchCustomer.mockResolvedValue(mockCustomer);
    mockAcquire.mockReturnValue(release); // re-apply impl after global mockReset
    await use();
    cleanup();
  },
  { auto: true },
]);

describe('useCustomer', () => {
  test('returns null fields, loading: true initially', () => {
    const { result } = renderHook(() => useCustomer());

    expect(result.current.appName).toBeNull();
    expect(result.current.subscriptionStatus).toBeNull();
    expect(result.current.cancelAt).toBeNull();
    expect(result.current.trialEnd).toBeNull();
    expect(result.current.email).toBeNull();
    expect(result.current.billingAvailable).toBe(false);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refresh).toBe('function');
  });

  test('fetches the customer on mount and exposes its fields', async () => {
    const { result } = renderHook(() => useCustomer());

    await waitFor(() => {
      expect(result.current.appName).toBe('Acme');
    });

    expect(mockFetchCustomer).toHaveBeenCalledOnce();
    expect(result.current.subscriptionStatus).toBe('active');
    expect(result.current.email).toBe('subscriber@example.com');
    expect(result.current.billingAvailable).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  test('surfaces trialEnd and cancelAt when present', async () => {
    mockFetchCustomer.mockResolvedValue({
      ...mockCustomer,
      subscriptionStatus: 'trialing',
      trialEnd: '2026-07-01T00:00:00Z',
      cancelAt: '2026-08-01T00:00:00Z',
    });

    const { result } = renderHook(() => useCustomer());

    await waitFor(() => {
      expect(result.current.subscriptionStatus).toBe('trialing');
    });
    expect(result.current.trialEnd).toBe('2026-07-01T00:00:00Z');
    expect(result.current.cancelAt).toBe('2026-08-01T00:00:00Z');
  });

  test('refresh() triggers a refetch from server', async () => {
    const { result } = renderHook(() => useCustomer());

    await waitFor(() => {
      expect(result.current.appName).toBe('Acme');
    });

    const callsBefore = mockFetchCustomer.mock.calls.length;
    mockFetchCustomer.mockResolvedValue({ ...mockCustomer, subscriptionStatus: 'past_due' });

    result.current.refresh();

    await waitFor(() => {
      expect(mockFetchCustomer.mock.calls.length).toBeGreaterThan(callsBefore);
    });
    await waitFor(() => {
      expect(result.current.subscriptionStatus).toBe('past_due');
    });
  });

  test('live updates land via the customer cache (realtime.ts writes it, the hook reads it)', async () => {
    const { result } = renderHook(() => useCustomer());

    await waitFor(() => {
      expect(result.current.subscriptionStatus).toBe('active');
    });

    queryClient.setQueryData<Customer>(customerKey(), {
      ...mockCustomer,
      subscriptionStatus: 'none',
      email: null,
    });

    await waitFor(() => {
      expect(result.current.subscriptionStatus).toBe('none');
    });
    expect(result.current.email).toBeNull();
  });

  test('exposes error as CanupError when fetch fails after retries', async () => {
    using _warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetchCustomer.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCustomer());

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.appName).toBeNull();
    expect(result.current.error).not.toBeNull();
    expect(result.current.error!.code).toBe('NETWORK_ERROR');
  });

  test('warns when the fetch fails, so the silent render-nothing surface is diagnosable', async () => {
    using warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetchCustomer.mockRejectedValue(new Error('Network error'));

    renderHook(() => useCustomer());

    await waitFor(() => expect(warn).toHaveBeenCalled(), { timeout: 5000 });
    expect(String(warn.mock.calls[0]?.[0])).toContain('[canup]');
  });

  test('acquires the shared SSE connection on mount and releases on unmount', () => {
    const { unmount } = renderHook(() => useCustomer());
    expect(mockAcquire).toHaveBeenCalledOnce();

    unmount();
    expect(release).toHaveBeenCalledOnce();
  });
});
