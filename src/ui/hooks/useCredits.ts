import { useQuery } from '@tanstack/react-query';
import { queryClient, creditKey, POLL_INTERVAL, POLL_INTERVAL_BACKGROUND } from '../internal/query.js';
import { fetchCredits } from '../internal/api-client.js';
import type { CreditBalance } from '../internal/types.js';

export interface UseCreditsResult {
  data: CreditBalance | null;
  loading: boolean;
  exhausted: boolean;
  subscribeUrl: string | null;
  refresh: () => void;
}

export function useCredits(action: string): UseCreditsResult {
  const { data, isLoading, refetch } = useQuery(
    {
      queryKey: creditKey(action),
      queryFn: () => fetchCredits(action),
      refetchInterval: () =>
        document.visibilityState === 'visible' ? POLL_INTERVAL : POLL_INTERVAL_BACKGROUND,
    },
    queryClient,
  );

  return {
    data: data ?? null,
    loading: isLoading,
    exhausted: data != null && data.quota !== null && data.remaining <= 0,
    subscribeUrl: data?.subscribeUrl ?? null,
    refresh: () => void refetch(),
  };
}
