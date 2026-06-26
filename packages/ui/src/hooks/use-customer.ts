import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient, customerKey } from '../internal/query.js';
import { fetchCustomer } from '../internal/api-client.js';
import { acquire } from '../internal/realtime.js';
import { type CanupError, toCanupError } from '@canup/contracts';
import type { Customer, SubscriptionStatus } from '@canup/contracts';

export interface UseCustomerResult {
  /** Canonical app name, for attributing every credit/plan/manage noun. */
  appName: string | null;
  /** Stripe-projected subscription status (`active` | `trialing` | `past_due` | `none`). */
  subscriptionStatus: SubscriptionStatus | null;
  /** Cancel-at-period-end schedule, `null` when renewing normally or unsubscribed. */
  cancelAt: string | null;
  /** When the current trial ends, set only while `subscriptionStatus` is `trialing`. */
  trialEnd: string | null;
  /** Stripe customer email, `null` when there's no subscription. */
  email: string | null;
  /** True when the app has Stripe connected — gates the subscribe/manage CTA. */
  billingAvailable: boolean;
  loading: boolean;
  error: CanupError | null;
  refresh: () => void;
}

/**
 * Live per-brand customer resource: app-name attribution, subscription status,
 * trial/cancel schedule, and the `billingAvailable` CTA flag.
 *
 *  - Initial paint: one `GET /customer`.
 *  - Live updates: the shared SSE stream writes every `customer` event into this
 *    same cache key (see `realtime.ts`), so status / trial / cancel refresh on
 *    subscribe / customer.deleted / Stripe (dis)connect without a reload.
 *  - Safety nets (in `query.ts`): focus refetch + a 5-min visible-tab poll.
 *
 * Action-independent — one customer per brand, shared across every component.
 */
export function useCustomer(): UseCustomerResult {
  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({ queryKey: customerKey(), queryFn: fetchCustomer }, queryClient);

  // Keep the shared SSE connection open while this hook is mounted; the returned
  // release closes it when the last consumer unmounts.
  useEffect(acquire, []);

  const customer: Customer | null = data ?? null;
  const error = queryError ? toCanupError(queryError) : null;

  // The monetization components deliberately render nothing until the customer
  // resolves (no app name → no compliant, attributed surface). That makes a
  // failed fetch invisible, so surface it once for the developer to diagnose.
  const errorMessage = error?.message ?? null;
  useEffect(() => {
    if (errorMessage) {
      console.warn(
        `[canup] couldn't load the customer billing status — monetization components will render nothing until it loads: ${errorMessage}`,
      );
    }
  }, [errorMessage]);

  return {
    appName: customer?.appName ?? null,
    subscriptionStatus: customer?.subscriptionStatus ?? null,
    cancelAt: customer?.cancelAt ?? null,
    trialEnd: customer?.trialEnd ?? null,
    email: customer?.email ?? null,
    billingAvailable: customer?.billingAvailable ?? false,
    loading: isLoading,
    error,
    refresh: () => void refetch(),
  };
}
