import { getJwt } from './jwt-cache.js';
import { CanupError, toCanupError } from '../errors.js';
import type { ApiResponse, CreditBalance, RunResult, SubscribeLinkResult } from '@canup/types';
import { DEFAULT_API_URL } from '../../constants.js';

declare global {
  var __canup_url: string | undefined;
}

export const getBaseUrl = (): string => globalThis.__canup_url ?? DEFAULT_API_URL;

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

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new CanupError('HTTP_ERROR', `Server returned ${res.status}`, {
      status: res.status,
    });
  }

  if (!json.ok) {
    throw new CanupError(json.error.type, json.error.message);
  }

  return json.data;
}

export const fetchCredits = (action: string) => request<CreditBalance>(`/run/${action}/credits`);

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
