import { useSyncExternalStore, useEffect, useCallback } from 'react';
import { creditStore } from '../internal/credit-store.js';
import { fetchCredits as apiFetchCredits } from '../internal/api-client.js';
import type { CreditBalance } from '../internal/types.js';

export interface UseCreditsResult {
  data: CreditBalance | null;
  loading: boolean;
  exhausted: boolean;
  subscribeUrl: string | null;
  refresh: () => void;
}

export function useCredits(action: string): UseCreditsResult {
  const allCredits = useSyncExternalStore(
    (cb) => creditStore.subscribe(cb),
    () => creditStore.getSnapshot(),
  );

  const data = allCredits.get(action) ?? null;

  const doFetch = useCallback(async () => {
    try {
      const balance = await apiFetchCredits(action);
      creditStore.setCredits(action, balance);
    } catch {
      // Silently fail -- data stays null, loading stays true
      // Consumer can call refresh() to retry
    }
  }, [action]);

  // Fetch on mount if not cached
  useEffect(() => {
    if (!data) {
      void doFetch();
    }
  }, [action, data, doFetch]);

  // Auto-refresh every 20 minutes to keep the subscribe token valid
  useEffect(() => {
    const interval = setInterval(
      () => {
        void doFetch();
      },
      20 * 60 * 1000,
    ); // 20 minutes
    return () => {
      clearInterval(interval);
    };
  }, [doFetch]);

  return {
    data,
    loading: data === null,
    exhausted: data !== null && data.quota !== null && data.remaining <= 0,
    subscribeUrl: data?.subscribeUrl ?? null,
    refresh: () => void doFetch(),
  };
}
