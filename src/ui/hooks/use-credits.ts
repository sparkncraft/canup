import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
 *  - Initial paint: one `GET /run/:slug/credits`.
 *  - Live updates: the shared SSE stream writes every `credits` balance into
 *    this same cache key (see `realtime.ts`), so the balance reflects spends and
 *    quota refreshes without a reload. (Account-level fields — subscription,
 *    email, the billing CTA flag — live on `useCustomer`, not here.)
 *  - Safety nets (in `query.ts`): focus refetch + a 5-min visible-tab poll for
 *    the rare case where SSE dies silently.
 */
export function useCredits(action: string): UseCreditsResult {
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({ queryKey: creditKey(action), queryFn: () => fetchCredits(action) }, queryClient);

  // Keep the shared SSE connection open while this counter is mounted; the
  // returned release closes it when the last counter unmounts.
  useEffect(acquire, []);

  const error = queryError ? toCanupError(queryError) : null;

  return {
    data: data ?? null,
    loading: isLoading,
    exhausted: data != null && data.quota !== null && data.remaining <= 0,
    error,
    refresh: () => void refetch(),
  };
}
