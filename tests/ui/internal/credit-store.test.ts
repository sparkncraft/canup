// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CreditBalance } from '../../../src/ui/internal/types.js';

const mockBalance: CreditBalance = {
  subscribed: false,
  quota: 100,
  used: 10,
  remaining: 90,
  resetAt: '2026-04-01T00:00:00Z',
  interval: 'monthly',
  email: null,
  subscribeUrl: null,
};

// Fresh module per test for isolation (credit-store uses module-level state)
async function getStore() {
  const mod = await import('../../../src/ui/internal/credit-store.js');
  return mod.creditStore;
}

describe('credit-store', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getSnapshot() returns empty Map initially', async () => {
    const store = await getStore();
    const snap = store.getSnapshot();
    expect(snap).toBeInstanceOf(Map);
    expect(snap.size).toBe(0);
  });

  it('setCredits() stores data and notifies subscribers', async () => {
    const store = await getStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setCredits('my-action', mockBalance);

    expect(store.getSnapshot().get('my-action')).toEqual(mockBalance);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('getSnapshot() returns same reference when no changes (referential stability)', async () => {
    const store = await getStore();
    const snap1 = store.getSnapshot();
    const snap2 = store.getSnapshot();

    expect(snap1).toBe(snap2);
  });

  it('setCredits() returns new Map reference (triggers useSyncExternalStore re-render)', async () => {
    const store = await getStore();
    const snap1 = store.getSnapshot();

    store.setCredits('my-action', mockBalance);

    const snap2 = store.getSnapshot();
    expect(snap1).not.toBe(snap2);
  });

  it('subscribe() returns unsubscribe function that removes listener', async () => {
    const store = await getStore();
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    store.setCredits('my-action', mockBalance);
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();

    store.setCredits('other-action', mockBalance);
    expect(listener).toHaveBeenCalledTimes(1); // not called again
  });
});
