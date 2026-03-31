import { getJwt } from './jwt-cache.js';
import { CanupError } from './errors.js';
import type { CreditBalance, ActionResult, ApiResponse } from './types.js';

const getBaseUrl = (): string =>
  ((globalThis as Record<string, unknown>).__canup_url as string) ?? 'https://canup.link';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const jwt = await getJwt();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${jwt}`,
    },
  });

  const json = (await res.json()) as ApiResponse<T>;

  if (!json.ok) {
    throw new CanupError(
      json.error.type as CanupError['type'],
      json.error.message,
      json.error.details,
    );
  }

  return json.data;
}

export const fetchCredits = (action: string) =>
  request<CreditBalance>(`/run/${action}/credits`);

export const runAction = (action: string, params?: Record<string, unknown>) =>
  request<ActionResult>(`/run/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params: params ?? {} }),
  });
