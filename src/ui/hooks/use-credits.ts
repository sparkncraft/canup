import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryClient, creditKey } from '../internal/query.js';
import { fetchCredits } from '../internal/api-client.js';
import { acquire } from '../internal/realtime.js';
import { type CanupError, toCanupError } from '../errors.js';
import type { CreditBalance } from '../types.js';

export interface UseCreditsResult {
  data: CreditBalance | null;
  loading: boolean;
  exhausted: boolean;
  error: CanupError | null;
  refresh: () => void;
}

/**
 * Live credit balance for one action.
 *
 * Reads:
 *  - Initial paint: one `GET /run/:slug/credits` (sets email, subscribeUrl, etc.)
 *  - Live updates: SSE `credits.update` events merge usage/subscription fields
 *    into the same cache key. The merge preserves `email` and `subscribeUrl`,
 *    which don't change with usage and are only populated by the initial fetch.
 *  - Safety net: `refetchOnWindowFocus` (default true) catches anything that
 *    slipped past SSE — e.g. silent connection deaths through corporate proxies.
 */
export function useCredits(action: string): UseCreditsResult {
  const qc = useQueryClient(queryClient);

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery(
    {
      queryKey: creditKey(action),
      queryFn: () => fetchCredits(action),
    },
    queryClient,
  );

  useEffect(() => {
    const release = acquire((event) => {
      if (event.type !== 'credits.update') return;
      if (event.action !== action) return;
      qc.setQueryData<CreditBalance>(creditKey(action), (old) =>
        // Merge so identity fields (email, subscribeUrl) from the initial
        // fetch survive a wire payload that doesn't carry them.
        old ? { ...old, ...event.balance } : { ...event.balance, email: null, subscribeUrl: null },
      );
    });
    return release;
  }, [action, qc]);

  const error = queryError ? toCanupError(queryError) : null;

  return {
    data: data ?? null,
    loading: isLoading,
    exhausted: data != null && data.quota !== null && data.remaining <= 0,
    error,
    refresh: () => void refetch(),
  };
}
