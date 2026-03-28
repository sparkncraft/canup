import { getJwt } from './jwt-cache.js';
import { CanupError } from './errors.js';
import type { CreditBalance, ActionResult, ApiResponse } from './types.js';

const getBaseUrl = (): string =>
  ((globalThis as Record<string, unknown>).__canup_url as string) ?? 'https://canup.link';

export async function runAction(
  action: string,
  params?: Record<string, unknown>,
): Promise<ActionResult> {
  const jwt = await getJwt();
  const res = await fetch(`${getBaseUrl()}/run/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ params: params ?? {} }),
  });

  const json = (await res.json()) as ApiResponse<ActionResult>;

  if (!json.ok) {
    throw new CanupError(
      json.error.type as CanupError['type'],
      json.error.message,
      json.error.details,
    );
  }

  return json.data;
}

export async function fetchCredits(action: string): Promise<CreditBalance> {
  const jwt = await getJwt();
  const res = await fetch(`${getBaseUrl()}/run/${action}/credits`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });

  const json = (await res.json()) as ApiResponse<CreditBalance>;

  if (!json.ok) {
    throw new CanupError(
      json.error.type as CanupError['type'],
      json.error.message,
      json.error.details,
    );
  }

  return json.data;
}
