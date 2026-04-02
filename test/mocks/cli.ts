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
  connectStripe: Mock;
  stripeStatus: Mock;
  disconnectStripe: Mock;
}

/**
 * Re-apply default mock implementations on an existing MockCanupClient.
 * Called after vitest's mockReset clears implementations between tests.
 */
export function resetMockCanupClient(client: MockCanupClient): void {
  client.getAuthUrl.mockResolvedValue({ url: 'https://github.com/login/oauth' });
  client.getMe.mockResolvedValue({
    id: 'usr-1',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
  });
  client.registerApp.mockResolvedValue({
    id: 'app-1',
    canvaAppId: 'AAFtest12345',
    name: 'Test App',
  });
  client.getAppInfo.mockResolvedValue({
    id: 'app-1',
    canvaAppId: 'AAFtest12345',
    name: 'Test App',
    createdAt: '2026-01-01T00:00:00Z',
  });
  client.listApps.mockResolvedValue([]);
  client.createApiKey.mockResolvedValue({ key: 'cnup_testkey_secret', prefix: 'cnup_testkey' });
  client.deployAction.mockResolvedValue({
    id: 'act-1',
    slug: 'test-action',
    language: 'python',
    lambdaReady: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });
  client.listActions.mockResolvedValue([]);
  client.listActionsWithScript.mockResolvedValue([]);
  client.deleteAction.mockResolvedValue({ deleted: 'test-action' });
  client.testAction.mockResolvedValue({
    ok: true,
    data: { result: null, durationMs: 50, printOutput: '' },
  });
  client.runAction.mockResolvedValue({
    ok: true,
    data: { result: null, durationMs: 50, printOutput: '' },
  });
  client.listHistory.mockResolvedValue([]);
  client.getHistoryDetail.mockResolvedValue({
    id: 'exec-1',
    actionSlug: 'test-action',
    status: 'success',
    durationMs: 50,
    executedAt: '2026-01-01T00:00:00Z',
    source: 'api',
  });
  client.setSecret.mockResolvedValue({ name: 'MY_SECRET', created: true, synced: true });
  client.listSecrets.mockResolvedValue([]);
  client.deleteSecret.mockResolvedValue({ deleted: 'MY_SECRET', synced: true });
  client.addDeps.mockResolvedValue({
    cached: false,
    buildId: 'build-1',
    status: 'building',
    packages: [],
    layerSize: null,
  });
  client.listDeps.mockResolvedValue({ packages: [], layerSize: null, layerArn: null });
  client.removeDep.mockResolvedValue({
    deleted: 'express',
    buildId: 'build-1',
    status: 'building',
  });
  client.clearDeps.mockResolvedValue({ cleared: true });
  client.getBuildStatus.mockResolvedValue({
    id: 'build-1',
    status: 'success',
    layerVersionArn: null,
    sizeBytes: null,
    errorMessage: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });
  client.connectStripe.mockResolvedValue({ connected: true });
  client.stripeStatus.mockResolvedValue({ connected: false });
  client.disconnectStripe.mockResolvedValue({ disconnected: true });
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
 * Re-apply default mock implementations on an existing MockOutput.
 */
export function resetMockOutput(output: MockOutput): void {
  output.dim.mockImplementation((msg: string) => msg);
  output.formatTable.mockImplementation((_headers: string[], _rows: string[][]) => '');
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
 * Re-apply default mock implementations on an existing MockSpinner.
 */
export function resetMockSpinner(spinner: MockSpinner): void {
  spinner.withSpinner.mockImplementation(
    async <T>(_text: string, fn: () => Promise<T>, _success?: string): Promise<T> => fn(),
  );
  spinner.createSpinner.mockImplementation((_text: string) => ({
    update: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn(),
  }));
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

// =============================================================================
// MockIsTTY — Disposable helper for process.stdin.isTTY
// =============================================================================

/**
 * Create a Disposable that temporarily overrides process.stdin.isTTY.
 *
 * Usage with `using`:
 *   using _tty = mockIsTTY(true);
 *   // process.stdin.isTTY is now true
 *   // auto-restored when _tty goes out of scope
 */
export function mockIsTTY(value: boolean | undefined): Disposable {
  const original = process.stdin.isTTY;
  Object.defineProperty(process.stdin, 'isTTY', { value, configurable: true });
  return {
    [Symbol.dispose]: () =>
      Object.defineProperty(process.stdin, 'isTTY', { value: original, configurable: true }),
  };
}
