import { getJwt } from './jwt-cache.js';
import { toCanupError, unwrapResponse, DEFAULT_CANUP_URL } from '@canup/contracts';
import type { CreditBalance, Customer, RunResult, SubscribeLinkResult } from '@canup/contracts';

declare global {
  var __canup_url: string | undefined;
}

/** API origin; overridable at runtime via `globalThis.__canup_url` (used in tests). */
export const getBaseUrl = (): string => globalThis.__canup_url ?? DEFAULT_CANUP_URL;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    const jwt = await getJwt();
    res = await fetch(`${getBaseUrl()}${path}`, {
      ...options,
      headers: {
        ...options?.headers,
        Authorization: `Bearer ${jwt}`,
      },
    });
  } catch (err) {
    throw toCanupError(err);
  }

  return unwrapResponse<T>(res);
}

export const fetchCredits = (action: string) => request<CreditBalance>(`/run/${action}/credits`);

/**
 * The current end-user's per-brand customer resource (app-name attribution,
 * subscription status, trial/cancel schedule, the `billingAvailable` CTA flag).
 * Action-independent — one fetch serves every component on the page.
 */
export const fetchCustomer = () => request<Customer>(`/customer`);

/**
 * Mint a fresh subscribe link for the current end-user. Called at click time
 * (not on render) so the short-lived token it embeds is always fresh — there's
 * no URL cached in the component to go stale.
 */
export const fetchSubscribeLink = () =>
  request<SubscribeLinkResult>(`/subscribe/link`, { method: 'POST' });

export const runAction = (action: string, params?: Record<string, unknown>) =>
  request<RunResult>(`/run/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params: params ?? {} }),
  });
