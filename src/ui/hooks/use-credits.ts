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
 * Tracks the publish-time timestamp of the last accepted update per action
 * so we can reject out-of-order SSE deliveries. Network can re-order
 * messages; without this guard a stale snapshot can overwrite a fresh one
 * and the user sees the wrong remaining count until the next interaction.
 *
 * ISO-8601 strings sort lexically the same way as their actual time order,
 * so a string compare is sufficient. Updates without an `at` field (older
 * servers) bypass the guard — degrade gracefully rather than break.
 */
const lastAtByAction = new Map<string, string>();

/**
 * Live credit balance for one action.
 *
 * Reads:
 *  - Initial paint: one `GET /run/:slug/credits` (sets billingUrl + initial
 *    balance shape, including email).
 *  - Live updates: SSE `credits.update` events merge into the same cache key.
 *    The wire carries every field that depends on customer/subscription state
 *    — including `email` — so the iframe's "logged in as ..." line refreshes
 *    on re-subscribe / customer.deleted without an iframe reload. `billingUrl`
 *    is the one identity field NOT on the wire: it's HTTP-scoped (request
 *    origin + per-user token mint) and stable across customer changes, so
 *    the merge preserves the value set on initial fetch.
 *    Out-of-order deliveries are rejected via the event's `at` timestamp.
 *  - Safety nets (in `query.ts`): `refetchOnWindowFocus` plus a 5-min visible-tab
 *    poll catch the rare case where SSE dies silently (proxy buffers the
 *    stream, dropped reconnect window) without emitting an error event.
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

      // Reject out-of-order delivery. If the server didn't include `at`
      // (older deployment), no guard — accept and hope the message order
      // matches the publish order.
      if (event.at) {
        const prevAt = lastAtByAction.get(action);
        if (prevAt && event.at < prevAt) return;
        lastAtByAction.set(action, event.at);
      }

      qc.setQueryData<CreditBalance>(creditKey(action), (old) =>
        // Spread `old` first so `billingUrl` (the one identity field that
        // isn't on the SSE wire) survives. `event.balance` then overwrites
        // every customer-state field — `email` included — so the iframe
        // reflects the new customer immediately after a re-subscribe or
        // customer.deleted. When `old` is undefined (first SSE arrives
        // before the initial fetch resolves), billingUrl is unknown until
        // the fetch lands and we leave it null.
        old ? { ...old, ...event.balance } : { ...event.balance, billingUrl: null },
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

/** Test-only: clear the per-action ordering memo. */
export function _resetCreditOrdering(): void {
  lastAtByAction.clear();
}
