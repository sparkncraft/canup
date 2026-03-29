/**
 * Vitest 4.1 fixture-based `test` export for CLI tests.
 *
 * Usage:
 *   import { test, output, client, project, spinner } from '../fixtures/cli.js'
 *   import { describe, expect, vi } from 'vitest'
 *
 *   vi.mock('../../../src/cli/ui/output.js', () => output)
 *   vi.mock('../../../src/cli/api-client.js', () => ({ CanupClient: vi.fn(() => client) }))
 *
 * What fixtures handle:
 * - Auto-clearing mock call history between tests (via vitest clearMocks: true)
 * - Auto-restoring process mocks (console.log, console.error, process.exit)
 * - Resetting project to defaults between tests
 *
 * What tests handle inline:
 * - Mock behavior (mockResolvedValue, mockRejectedValue, mockReturnValue)
 * - Non-core vi.mock blocks (token-store, project-config, node:fs, etc.)
 */
import { test as baseTest, vi } from 'vitest';
import type { Mock } from 'vitest';
import {
  createMockCanupClient,
  createMockOutput,
  createMockProject,
  createMockSpinner,
  type MockCanupClient,
  type MockOutput,
  type MockProject,
  type MockSpinner,
} from './cli-mocks.js';

// -- Module-level singletons --------------------------------------------------
const _client = createMockCanupClient();
const _output = createMockOutput();
const _project = createMockProject();
const _spinner = createMockSpinner();

const _projectConfig = {
  getActionsDir: vi.fn(),
  loadProjectConfig: vi.fn(),
  CANUP_DIR: 'canup',
  DEFAULT_ACTIONS_DIR: 'actions',
};

const _actionsDiscovery = {
  discoverActions: vi.fn(),
  resolveActionByName: vi.fn(),
};

const _tokenStore = {
  loadToken: vi.fn(),
  saveToken: vi.fn(),
  saveApiKey: vi.fn(),
  clearToken: vi.fn(),
};

/** Defaults for resetting _project between tests. */
const PROJECT_DEFAULTS: MockProject = {
  config: { appId: 'test-app-id' },
  apiKey: 'cnup_test_key',
  canupDir: '/project/canup',
  projectRoot: '/project',
};

// -- Process mocks type -------------------------------------------------------
export interface ProcessMocks {
  log: Mock;
  error: Mock;
  exit: Mock;
}

// -- Timers mock type ---------------------------------------------------------
export interface TimersMocks {
  advance: (ms: number) => Promise<void>;
}

// -- Fixture-extended test ----------------------------------------------------
export const test = baseTest
  .extend('client', () => _client)
  .extend('output', () => _output)
  .extend('project', async () => {
    // Reset to defaults — tests that need custom values mutate inline
    Object.assign(_project, PROJECT_DEFAULTS);
    _project.config = { ...PROJECT_DEFAULTS.config };
    return _project;
  })
  .extend('spinner', () => _spinner)
  .extend('processMocks', async ({}, { onCleanup }) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never);
    onCleanup(() => {
      log.mockRestore();
      error.mockRestore();
      exit.mockRestore();
    });
    return { log, error, exit };
  })
  .extend('timers', async ({}, { onCleanup }) => {
    vi.useFakeTimers();
    onCleanup(() => {
      vi.useRealTimers();
    });
    return {
      advance: async (ms: number) => {
        await vi.advanceTimersByTimeAsync(ms);
      },
    };
  })
  .extend('projectConfig', () => _projectConfig)
  .extend('actionsDiscovery', () => _actionsDiscovery)
  .extend('tokenStore', () => _tokenStore);

// -- Re-export singletons for vi.mock() usage ---------------------------------
export {
  _client as client,
  _output as output,
  _project as project,
  _spinner as spinner,
  _projectConfig as projectConfig,
  _actionsDiscovery as actionsDiscovery,
  _tokenStore as tokenStore,
};

// Re-export types for consumer convenience
export type { MockCanupClient, MockOutput, MockProject, MockSpinner };
