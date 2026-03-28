import { vi } from 'vitest';
import type { Mock } from 'vitest';

// =============================================================================
// MockCanupClient
// =============================================================================

/**
 * Shape of the mock CanupClient returned by createMockCanupClient.
 * Each method is a vi.fn() mock.
 */
export interface MockCanupClient {
  getAuthUrl: Mock;
  getMe: Mock;
  registerApp: Mock;
  getAppInfo: Mock;
  listApps: Mock;
  createApiKey: Mock;
  deployAction: Mock;
  listActions: Mock;
  listActionsWithScript: Mock;
  deleteAction: Mock;
  testAction: Mock;
  runAction: Mock;
  listHistory: Mock;
  getHistoryDetail: Mock;
  setSecret: Mock;
  listSecrets: Mock;
  deleteSecret: Mock;
  addDeps: Mock;
  listDeps: Mock;
  removeDep: Mock;
  clearDeps: Mock;
  getBuildStatus: Mock;
  setCreditConfig: Mock;
  getCreditConfig: Mock;
  deleteCreditConfig: Mock;
  connectStripe: Mock;
  stripeStatus: Mock;
  disconnectStripe: Mock;
}

/**
 * Mock factory for CanupClient.
 *
 * Returns an object matching all CanupClient public methods as vi.fn() instances.
 * Each method resolves to a sensible default (empty arrays, generic objects).
 * Pass overrides to customize any method's mock implementation.
 */
export function createMockCanupClient(overrides?: Partial<MockCanupClient>): MockCanupClient {
  return {
    // Auth / user
    getAuthUrl: vi.fn().mockResolvedValue({ url: 'https://github.com/login/oauth' }),
    getMe: vi.fn().mockResolvedValue({
      id: 'usr-1',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    }),

    // App management
    registerApp: vi
      .fn()
      .mockResolvedValue({ id: 'app-1', canvaAppId: 'AAFtest12345', name: 'Test App' }),
    getAppInfo: vi.fn().mockResolvedValue({
      id: 'app-1',
      canvaAppId: 'AAFtest12345',
      name: 'Test App',
      createdAt: '2026-01-01T00:00:00Z',
    }),
    listApps: vi.fn().mockResolvedValue([]),
    createApiKey: vi.fn().mockResolvedValue({ key: 'cnup_testkey_secret', prefix: 'cnup_testkey' }),

    // Actions
    deployAction: vi.fn().mockResolvedValue({
      id: 'act-1',
      slug: 'test-action',
      language: 'python',
      lambdaReady: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }),
    listActions: vi.fn().mockResolvedValue([]),
    listActionsWithScript: vi.fn().mockResolvedValue([]),
    deleteAction: vi.fn().mockResolvedValue({ deleted: 'test-action' }),
    testAction: vi
      .fn()
      .mockResolvedValue({ ok: true, data: { result: null, durationMs: 50, printOutput: '' } }),
    runAction: vi
      .fn()
      .mockResolvedValue({ ok: true, data: { result: null, durationMs: 50, printOutput: '' } }),

    // History
    listHistory: vi.fn().mockResolvedValue([]),
    getHistoryDetail: vi.fn().mockResolvedValue({
      id: 'exec-1',
      actionSlug: 'test-action',
      status: 'success',
      durationMs: 50,
      executedAt: '2026-01-01T00:00:00Z',
      source: 'api',
    }),

    // Secrets
    setSecret: vi.fn().mockResolvedValue({ name: 'MY_SECRET', created: true, synced: true }),
    listSecrets: vi.fn().mockResolvedValue([]),
    deleteSecret: vi.fn().mockResolvedValue({ deleted: 'MY_SECRET', synced: true }),

    // Deps
    addDeps: vi.fn().mockResolvedValue({
      cached: false,
      buildId: 'build-1',
      status: 'building',
      packages: [],
      layerSize: null,
    }),
    listDeps: vi.fn().mockResolvedValue({ packages: [], layerSize: null, layerArn: null }),
    removeDep: vi
      .fn()
      .mockResolvedValue({ deleted: 'express', buildId: 'build-1', status: 'building' }),
    clearDeps: vi.fn().mockResolvedValue({ cleared: true }),
    getBuildStatus: vi.fn().mockResolvedValue({
      id: 'build-1',
      status: 'success',
      layerVersionArn: null,
      sizeBytes: null,
      errorMessage: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }),

    // Credits
    setCreditConfig: vi.fn().mockResolvedValue({
      id: 'cc-1',
      actionSlug: 'test-action',
      quota: 50,
      interval: 'monthly',
      plan: 'free',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }),
    getCreditConfig: vi.fn().mockResolvedValue(null),
    deleteCreditConfig: vi.fn().mockResolvedValue({ deleted: 'test-action' }),

    // Stripe
    connectStripe: vi.fn().mockResolvedValue({ connected: true }),
    stripeStatus: vi.fn().mockResolvedValue({ connected: false }),
    disconnectStripe: vi.fn().mockResolvedValue({ disconnected: true }),

    ...overrides,
  };
}

// =============================================================================
// MockOutput
// =============================================================================

/**
 * Shape of the mock output returned by createMockOutput.
 */
export interface MockOutput {
  success: Mock;
  error: Mock;
  warn: Mock;
  hint: Mock;
  info: Mock;
  label: Mock;
  dim: Mock;
  formatTable: Mock;
}

/**
 * Mock factory for CLI output helpers (ui/output.ts).
 *
 * Returns all styled output functions as vi.fn() instances.
 * `dim` defaults to a pass-through so string formatting still works in tests.
 */
export function createMockOutput(): MockOutput {
  return {
    success: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    hint: vi.fn(),
    info: vi.fn(),
    label: vi.fn(),
    dim: vi.fn((msg: string) => msg),
    formatTable: vi.fn((_headers: string[], _rows: string[][]) => ''),
  };
}

// =============================================================================
// MockProject
// =============================================================================

/**
 * Shape of the mock project returned by createMockProject.
 */
export interface MockProject {
  config: { appId: string };
  apiKey: string;
  canupDir: string;
  projectRoot: string;
}

/**
 * Mock factory for requireProject() / LoadedProject.
 *
 * Returns a LoadedProject-shaped object with sensible defaults.
 * Pass overrides to customize any field.
 */
export function createMockProject(overrides?: Partial<MockProject>): MockProject {
  return {
    config: { appId: 'test-app-id' },
    apiKey: 'cnup_test_key',
    canupDir: '/project/canup',
    projectRoot: '/project',
    ...overrides,
  };
}

// =============================================================================
// MockSpinner
// =============================================================================

/**
 * Shape of the mock spinner returned by createMockSpinner.
 */
export interface MockSpinner {
  withSpinner: Mock;
  createSpinner: Mock;
}

/**
 * Mock factory for withSpinner.
 *
 * The default implementation executes the wrapped function immediately
 * (no spinner UI) and returns its result. This solves the withSpinner
 * re-mock problem -- tests no longer need to individually
 * mock withSpinner in beforeEach after vi.clearAllMocks() clears call counts.
 */
export function createMockSpinner(): MockSpinner {
  return {
    withSpinner: vi.fn(
      async <T>(_text: string, fn: () => Promise<T>, _success?: string): Promise<T> => fn(),
    ),
    createSpinner: vi.fn((_text: string) => ({
      update: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
    })),
  };
}
