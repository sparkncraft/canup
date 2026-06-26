/**
 * HTTP client for the CanUp API.
 *
 * Uses native fetch (Node.js 18+). Wire shapes come from `@canup/contracts`, the
 * published contract every endpoint serializes — the client casts responses to
 * those types rather than re-declaring them. All app-scoped methods take an
 * appId and build app-scoped URLs. The API returns camelCase natively, so there
 * is no client-side key mapping.
 */

import type {
  Action,
  ApiKeyCreateResult,
  ApiResponse,
  App,
  AppListItem,
  Build,
  CursorPage,
  DeleteActionResult,
  DeployActionResult,
  DepsClearResult,
  InvocationDetail,
  InvocationSummary,
  PackageList,
  PackageRemoveResult,
  PackageSpec,
  PackagesAddResult,
  RegisterAppResult,
  RevokeApiKeyResult,
  SecretDeleteResult,
  SecretEntry,
  SecretSetResult,
  StripeConnectResult,
  StripeDisconnectResult,
  StripeStatusResult,
  TestResult,
  User,
} from '@canup/contracts';
import { DEFAULT_API_URL, API_VERSION } from './constants.js';
import { CLI_USER_AGENT } from './version.js';
import { ApiError } from './errors.js';

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
  async getMe(): Promise<User> {
    return this.request<User>(`/${API_VERSION}/me`);
  }

  /**
   * Revoke a user-level API key by id. Used by `canup logout` to remove the
   * exact key stored on this machine without touching keys on other devices.
   *
   * The optional `signal` lets callers bound the request (logout swallows
   * errors after a short timeout — see commands/logout.ts).
   */
  async revokeUserKey(keyId: string, init?: { signal?: AbortSignal }): Promise<void> {
    await this.request<RevokeApiKeyResult>(
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
  async registerApp(canvaAppId: string, name: string): Promise<RegisterAppResult> {
    return this.request<RegisterAppResult>(`/${API_VERSION}/apps`, {
      method: 'POST',
      body: JSON.stringify({ canvaAppId, name }),
    });
  }

  /**
   * List all apps for the current user.
   * Requires session auth (used by init picker before API key exists).
   */
  async listApps(): Promise<AppListItem[]> {
    return this.request<AppListItem[]>(`/${API_VERSION}/apps`);
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
  async createApiKey(appId: string, name?: string): Promise<ApiKeyCreateResult> {
    return this.request<ApiKeyCreateResult>(
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
  ): Promise<DeployActionResult> {
    return this.request<DeployActionResult>(
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
  async listActions(appId: string): Promise<Action[]> {
    return this.request<Action[]>(`/${API_VERSION}/apps/${encodeURIComponent(appId)}/actions`);
  }

  /**
   * List all actions with their script content included.
   * Used by the pull command to download action scripts.
   */
  async listActionsWithScript(appId: string): Promise<Action[]> {
    return this.request<Action[]>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/actions?include=script`,
    );
  }

  /**
   * Delete an action by slug.
   */
  async deleteAction(appId: string, slug: string): Promise<DeleteActionResult> {
    return this.request<DeleteActionResult>(
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
   * the error envelope. Any other non-2xx status is a real API error.
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
      return (await res.json()) as TestResult;
    }

    if (!res.ok) {
      // Real HTTP-level error (401, 404, 500, etc.)
      let body: { error?: { code?: string; message?: string } } | undefined;
      try {
        body = (await res.json()) as { error?: { code?: string; message?: string } };
      } catch {
        // non-JSON error response
      }
      throw new ApiError(
        res.status,
        body?.error?.code ?? 'HttpError',
        body?.error?.message ?? res.statusText,
      );
    }

    return (await res.json()) as TestResult;
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
  ): Promise<CursorPage<InvocationSummary>> {
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
  async setSecret(appId: string, name: string, value: string): Promise<SecretSetResult> {
    return this.request<SecretSetResult>(
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
  async listSecrets(appId: string): Promise<SecretEntry[]> {
    return this.request(`/${API_VERSION}/apps/${encodeURIComponent(appId)}/secrets`);
  }

  /**
   * Delete a secret by name.
   */
  async deleteSecret(appId: string, name: string): Promise<SecretDeleteResult> {
    return this.request<SecretDeleteResult>(
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
    packages: PackageSpec[],
  ): Promise<PackagesAddResult> {
    return this.request<PackagesAddResult>(
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
  async listDeps(appId: string, language: string): Promise<PackageList> {
    return this.request<PackageList>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/deps/${encodeURIComponent(language)}`,
    );
  }

  /**
   * Remove a single package by name.
   * May trigger a rebuild if packages remain.
   */
  async removeDep(
    appId: string,
    language: string,
    packageName: string,
  ): Promise<PackageRemoveResult> {
    return this.request<PackageRemoveResult>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/deps/${encodeURIComponent(language)}/${encodeURIComponent(packageName)}`,
      { method: 'DELETE' },
    );
  }

  /**
   * Clear all packages for an app+language and detach the layer.
   */
  async clearDeps(appId: string, language: string): Promise<DepsClearResult> {
    return this.request<DepsClearResult>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/deps/${encodeURIComponent(language)}`,
      { method: 'DELETE' },
    );
  }

  /**
   * Poll build status for a specific build.
   */
  async getBuildStatus(appId: string, language: string, buildId: string): Promise<Build> {
    return this.request<Build>(
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
  async connectStripe(appId: string, apiKey: string): Promise<StripeConnectResult> {
    return this.request<StripeConnectResult>(
      `/${API_VERSION}/apps/${encodeURIComponent(appId)}/stripe/api-key`,
      { method: 'PUT', body: JSON.stringify({ apiKey }) },
    );
  }

  /**
   * Get Stripe connection status for an app.
   */
  async stripeStatus(appId: string): Promise<StripeStatusResult> {
    return this.request(`/${API_VERSION}/apps/${encodeURIComponent(appId)}/stripe`);
  }

  /**
   * Disconnect Stripe from an app.
   * Removes webhook endpoint and clears stored key.
   */
  async disconnectStripe(appId: string): Promise<StripeDisconnectResult> {
    return this.request<StripeDisconnectResult>(
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
      throw new ApiError(res.status, body.error.code, body.error.message);
    }

    return body.data;
  }
}
