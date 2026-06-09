/**
 * HTTP client for the CanUp API.
 *
 * Uses native fetch (Node.js 18+). Handles structured API response envelopes.
 * All methods for action/secret management take appId and use app-scoped URLs.
 * The API returns camelCase natively -- no client-side mapping needed.
 */

import { DEFAULT_API_URL, API_VERSION } from '../constants.js';
import { CLI_USER_AGENT } from './version.js';

export interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: string;
}

/** An app as returned by the API. */
export interface App {
  id: string;
  name: string;
  createdAt: string;
}

/** A deployed action's metadata (no script content). */
export interface ActionSummary {
  id: string;
  slug: string;
  language: string;
  deployed: boolean;
  contentHash: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An action including its stored script content (`null` for track-only actions). */
export interface ActionWithScript extends ActionSummary {
  script: string | null;
}

/**
 * A single invocation row. `actionSlug` is `null` for invocations not tied to a
 * named action; `status` and `source` are open strings (their vocabularies are
 * owned by the server, so the CLI doesn't re-enumerate them).
 */
export interface InvocationSummary {
  id: string;
  actionSlug: string | null;
  status: string;
  durationMs: number | null;
  errorType: string | null;
  createdAt: string;
  source: string;
}

/** A single invocation plus its structured detail payload (`null` when nothing ran). */
export interface InvocationDetail extends InvocationSummary {
  detail: {
    errorMessage: string | null;
    stackTrace: string | null;
    printOutput: string | null;
  } | null;
}

interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
}

interface ApiErrorResponse {
  ok: false;
  error: {
    type: string;
    message: string;
  };
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Test endpoint success envelope */
interface TestSuccess {
  ok: true;
  data: {
    result: unknown;
    durationMs: number;
    printOutput: string;
  };
}

/** Test endpoint error envelope */
interface TestError {
  ok: false;
  error: {
    type: string;
    message: string;
    stackTrace?: string;
    durationMs: number;
    printOutput?: string;
  };
}

export type TestResult = TestSuccess | TestError;

// ──────────────────────────────────────────────
// Deps types
// ──────────────────────────────────────────────

export interface DepInfo {
  name: string;
  version: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddDepsResult {
  cached: boolean;
  buildId?: string;
  status?: string;
  packages: DepInfo[];
  layerSize?: number | null;
}

export interface ListDepsResult {
  packages: DepInfo[];
  layerSize: number | null;
  layerArn: string | null;
}

export interface RemoveDepResult {
  deleted: string;
  buildId?: string;
  status?: string;
}

export interface BuildStatus {
  id: string;
  status: 'building' | 'success' | 'failed';
  layerVersionArn: string | null;
  sizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────
// Package spec parser
// ──────────────────────────────────────────────

/**
 * Parse package specs like "express@4.18.2", "@types/node@20", "requests==2.31.0"
 * into { name, version } objects.
 *
 * npm: split on last @ (handles scoped packages like @types/node@20)
 * pip: split on ==
 */
export function parsePackageSpecs(
  specs: string[],
  language: string,
): { name: string; version?: string }[] {
  return specs.map((spec) => {
    if (language === 'nodejs') {
      // npm: split on last @ (handles scoped packages like @types/node@20)
      const lastAt = spec.lastIndexOf('@');
      if (lastAt > 0) {
        return { name: spec.slice(0, lastAt), version: spec.slice(lastAt + 1) };
      }
      return { name: spec };
    }
    // pip: split on ==
    const eqIdx = spec.indexOf('==');
    if (eqIdx > 0) {
      return { name: spec.slice(0, eqIdx), version: spec.slice(eqIdx + 2) };
    }
    return { name: spec };
  });
}

// ──────────────────────────────────────────────
// Formatting utilities
// ──────────────────────────────────────────────

/**
 * Format a byte count into a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export class CanupClient {
  private apiUrl: string;
  private token?: string;

  constructor(options?: { apiUrl?: string; token?: string }) {
    this.apiUrl = options?.apiUrl ?? process.env.CANUP_URL ?? DEFAULT_API_URL;
    this.token = options?.token;
  }

  /**
   * Get the current user's info.
   * Requires a valid session cookie or user-level api key.
   */
  async getMe(): Promise<UserInfo> {
    return this.request<UserInfo>(`/${API_VERSION}/me`);
  }

  /**
   * Revoke a user-level API key by id. Used by `canup logout` to remove the
   * exact key stored on this machine without touching keys on other devices.
   *
   * The optional `signal` lets callers bound the request (logout swallows
   * errors after a short timeout — see commands/logout.ts).
   */
  async revokeUserKey(keyId: string, init?: { signal?: AbortSignal }): Promise<void> {
    await this.request<{ revoked: string }>(
      `/${API_VERSION}/me/api-keys/${encodeURIComponent(keyId)}`,
      { method: 'DELETE', signal: init?.signal },
    );
  }

  // ──────────────────────────────────────────────
  // App management (session auth)
  // ──────────────────────────────────────────────

  /**
   * Register or upsert an app by Canva App ID.
   * Requires session auth.
   */
  async registerApp(canvaAppId: string, name: string): Promise<Pick<App, 'id' | 'name'>> {
    return this.request<Pick<App, 'id' | 'name'>>(`/${API_VERSION}/apps`, {
      method: 'POST',
      body: JSON.stringify({ canvaAppId, name }),
    });
  }

  /**
   * List all apps for the current user.
   * Requires session auth (used by init picker before API key exists).
   */
  async listApps(): Promise<App[]> {
    return this.request<App[]>(`/${API_VERSION}/apps`);
  }

  /**
   * Get app info by ID.
   * Requires API key auth.
   */
  async getAppInfo(appId: string): Promise<App> {
    return this.request<App>(`/${API_VERSION}/apps/${encodeURIComponent(appId)}`);
  }

  /**
   * Create an API key for an app.
   * Requires session auth.
   */
  async createApiKey(appId: string, name?: string): Promise<{ key: string; prefix: string }> {
    return this.request<{ key: string; prefix: string }>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/api-keys`,
      {
        method: 'POST',
        body: JSON.stringify({ name }),
      },
    );
  }

  // ──────────────────────────────────────────────
  // Action management (API key auth, app-scoped)
  // ──────────────────────────────────────────────

  /**
   * Deploy an action (create or update).
   *
   * `lambdaReady: false` is a soft-success — the action row is saved (so
   * the caller can retry deployment), but per-language Lambda provisioning
   * threw. Retrying `deployAction(...)` will re-attempt.
   */
  async deployAction(
    appId: string,
    slug: string,
    code: string,
    language: string,
  ): Promise<{ action: ActionSummary; lambdaReady: boolean }> {
    return this.request(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/actions/${encodeURIComponent(slug)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ code, language }),
      },
    );
  }

  /**
   * List all actions for the app.
   */
  async listActions(appId: string): Promise<ActionSummary[]> {
    return this.request(`/${API_VERSION}/apps/${encodeURIComponent(appId)}/actions`);
  }

  /**
   * List all actions with their script content included.
   * Used by the pull command to download action scripts.
   */
  async listActionsWithScript(appId: string): Promise<ActionWithScript[]> {
    return this.request(`/${API_VERSION}/apps/${encodeURIComponent(appId)}/actions?include=script`);
  }

  /**
   * Delete an action by slug.
   */
  async deleteAction(appId: string, slug: string): Promise<{ deleted: string }> {
    return this.request<{ deleted: string }>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/actions/${encodeURIComponent(slug)}`,
      { method: 'DELETE' },
    );
  }

  /**
   * Execute inline code against an app's Lambda runtime without deploying it.
   *
   * Used by `canup actions test` (sends a local file) and `canup actions run`
   * (fetches the deployed code first, then invokes it through the same endpoint).
   *
   * Script errors return HTTP 422 with { ok: false, error: { ... } } — a
   * valid test result, not an API failure. We read the body on 422 and return
   * the TestError envelope. Any other non-2xx status is a real API error.
   */
  async testCode(
    appId: string,
    code: string,
    language: 'python' | 'nodejs',
    params: unknown,
  ): Promise<TestResult> {
    const url = `${this.apiUrl}/${API_VERSION}/apps/${encodeURIComponent(appId)}/test`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.defaultHeaders(),
      body: JSON.stringify({ code, language, params }),
    });

    // 422 = script error — a valid test result, not an API failure
    if (res.status === 422) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- generic JSON response
      return await res.json();
    }

    if (!res.ok) {
      // Real HTTP-level error (401, 404, 500, etc.)
      let body: { error?: { type?: string; message?: string } } | undefined;
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Fetch .json() returns any
        body = await res.json();
      } catch {
        // non-JSON error response
      }
      const error = new Error(body?.error?.message ?? res.statusText) as Error & {
        statusCode: number;
        errorType: string;
      };
      error.statusCode = res.status;
      error.errorType = body?.error?.type ?? 'HttpError';
      throw error;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- generic JSON response
    return await res.json();
  }

  // ──────────────────────────────────────────────
  // Invocations (API key auth, app-scoped)
  // ──────────────────────────────────────────────

  /**
   * List invocations for an app, optionally filtered by action slug.
   * Uses cursor-based pagination.
   */
  async listInvocations(
    appId: string,
    slug?: string,
    options?: { limit?: number; cursor?: string; search?: string },
  ): Promise<{ items: InvocationSummary[]; nextCursor: string | null }> {
    const params = new URLSearchParams();
    params.set('appId', appId);
    if (slug) params.set('action', slug);
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.search) params.set('search', options.search);

    return this.request(`/${API_VERSION}/invocations?${params.toString()}`);
  }

  /**
   * Get detailed info about a single invocation.
   */
  async getInvocationDetail(id: string): Promise<InvocationDetail> {
    return this.request(`/${API_VERSION}/invocations/${encodeURIComponent(id)}`);
  }

  // ──────────────────────────────────────────────
  // Secrets management (API key auth, app-scoped)
  // ──────────────────────────────────────────────

  /**
   * Set (create or update) a secret.
   */
  async setSecret(
    appId: string,
    name: string,
    value: string,
  ): Promise<{ name: string; created: boolean; synced: boolean }> {
    return this.request<{ name: string; created: boolean; synced: boolean }>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/secrets/${encodeURIComponent(name)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ value }),
      },
    );
  }

  /**
   * List all secrets for the app (values masked).
   * Response is camelCase from server.
   */
  async listSecrets(
    appId: string,
  ): Promise<{ name: string; maskedValue: string; updatedAt: string }[]> {
    return this.request(`/${API_VERSION}/apps/${encodeURIComponent(appId)}/secrets`);
  }

  /**
   * Delete a secret by name.
   */
  async deleteSecret(appId: string, name: string): Promise<{ deleted: string; synced: boolean }> {
    return this.request<{ deleted: string; synced: boolean }>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/secrets/${encodeURIComponent(name)}`,
      { method: 'DELETE' },
    );
  }

  // ──────────────────────────────────────────────
  // Deps management (API key auth, app-scoped)
  // ──────────────────────────────────────────────

  /**
   * Add packages and trigger a layer build.
   * Returns cached: true if content hash matches (no build needed).
   */
  async addDeps(
    appId: string,
    language: string,
    packages: { name: string; version?: string }[],
  ): Promise<AddDepsResult> {
    return this.request<AddDepsResult>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/deps/${encodeURIComponent(language)}`,
      {
        method: 'POST',
        body: JSON.stringify({ packages }),
      },
    );
  }

  /**
   * List installed packages for an app+language.
   */
  async listDeps(appId: string, language: string): Promise<ListDepsResult> {
    return this.request<ListDepsResult>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/deps/${encodeURIComponent(language)}`,
    );
  }

  /**
   * Remove a single package by name.
   * May trigger a rebuild if packages remain.
   */
  async removeDep(appId: string, language: string, packageName: string): Promise<RemoveDepResult> {
    return this.request<RemoveDepResult>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/deps/${encodeURIComponent(language)}/${encodeURIComponent(packageName)}`,
      { method: 'DELETE' },
    );
  }

  /**
   * Clear all packages for an app+language and detach the layer.
   */
  async clearDeps(appId: string, language: string): Promise<{ cleared: boolean }> {
    return this.request<{ cleared: boolean }>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/deps/${encodeURIComponent(language)}`,
      { method: 'DELETE' },
    );
  }

  /**
   * Poll build status for a specific build.
   */
  async getBuildStatus(appId: string, language: string, buildId: string): Promise<BuildStatus> {
    return this.request<BuildStatus>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/deps/${encodeURIComponent(language)}/builds/${encodeURIComponent(buildId)}`,
    );
  }

  // ──────────────────────────────────────────────
  // Stripe management (API key auth, app-scoped)
  // ──────────────────────────────────────────────

  /**
   * Connect a Stripe API key to an app.
   * Validates the key, checks permissions, creates webhook endpoint.
   */
  async connectStripe(appId: string, apiKey: string): Promise<{ connected: boolean }> {
    return this.request<{ connected: boolean }>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/stripe/api-key`,
      { method: 'PUT', body: JSON.stringify({ apiKey }) },
    );
  }

  /**
   * Get Stripe connection status for an app.
   */
  async stripeStatus(appId: string): Promise<{
    connected: boolean;
    maskedKey?: string;
    webhookUrl?: string;
  }> {
    return this.request(`/${API_VERSION}/apps/${encodeURIComponent(appId)}/stripe`);
  }

  /**
   * Disconnect Stripe from an app.
   * Removes webhook endpoint and clears stored key.
   */
  async disconnectStripe(appId: string): Promise<{ disconnected: boolean }> {
    return this.request<{ disconnected: boolean }>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/stripe`,
      {
        method: 'DELETE',
      },
    );
  }

  // ──────────────────────────────────────────────
  // Internal HTTP layer
  // ──────────────────────────────────────────────

  /**
   * Headers attached to every CanUp API request.
   *
   * Every new `fetch` site in this class must build its headers via this
   * helper so the bearer + the `X-Canup-Client` identifier travel together.
   * The server emits `cli.*` analytics events keyed on this header.
   */
  private defaultHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Canup-Client': CLI_USER_AGENT,
      ...extra,
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Make an authenticated request to the CanUp API.
   */
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: this.defaultHeaders(options?.headers as Record<string, string> | undefined),
      signal: options?.signal,
    });

    const body = (await res.json()) as ApiResponse<T>;

    if (!body.ok) {
      const error = new Error(body.error.message) as Error & {
        statusCode: number;
        errorType: string;
      };
      error.statusCode = res.status;
      error.errorType = body.error.type;
      throw error;
    }

    return body.data;
  }
}
