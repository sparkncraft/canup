import { getJwt } from './jwt-cache.js';
import { CanupError, toCanupError } from '../errors.js';
import type { CreditBalance, ActionResult } from '../types.js';
import { DEFAULT_API_URL, API_VERSION } from '../../constants.js';

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error?: { type: string; message: string; details?: Record<string, unknown> } };

declare global {
  var __canup_url: string | undefined;
}

const getBaseUrl = (): string => globalThis.__canup_url ?? DEFAULT_API_URL;

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
    throw new CanupError(
      json.error?.type ?? 'HTTP_ERROR',
      json.error?.message ?? `Request failed with status ${res.status}`,
      json.error?.details,
    );
  }

  return json.data;
}

export const fetchCredits = (action: string) =>
  request<CreditBalance>(`/${API_VERSION}/run/${action}/credits`);

export const runAction = (action: string, params?: Record<string, unknown>) =>
  request<ActionResult>(`/${API_VERSION}/run/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params: params ?? {} }),
  });
