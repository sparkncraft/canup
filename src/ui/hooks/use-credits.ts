import { useQuery } from '@tanstack/react-query';
import {
  queryClient,
  creditKey,
  POLL_INTERVAL,
  POLL_INTERVAL_BACKGROUND,
} from '../internal/query.js';
import { fetchCredits } from '../internal/api-client.js';
import { type CanupError, toCanupError } from '../errors.js';
import type { CreditBalance } from '../types.js';

export interface UseCreditsResult {
  data: CreditBalance | null;
  loading: boolean;
  exhausted: boolean;
  error: CanupError | null;
  refresh: () => void;
}

export function useCredits(action: string): UseCreditsResult {
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery(
    {
      queryKey: creditKey(action),
      queryFn: () => fetchCredits(action),
      refetchInterval: () =>
        document.visibilityState === 'visible' ? POLL_INTERVAL : POLL_INTERVAL_BACKGROUND,
    },
    queryClient,
  );

  const error = queryError ? toCanupError(queryError) : null;

  return {
    data: data ?? null,
    loading: isLoading,
    exhausted: data != null && data.quota !== null && data.remaining <= 0,
    error,
    refresh: () => void refetch(),
  };
}
