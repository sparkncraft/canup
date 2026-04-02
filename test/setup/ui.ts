// Setup for UI tests (jsdom environment).
// Initializes Canva SDK test environment and registers shared mocks.

import { vi } from 'vitest';
import { initTestEnvironment as initUser } from '@canva/user/test';
import { initTestEnvironment as initPlatform } from '@canva/platform/test';

// Inject Canva fake clients into window.canva_sdk.
// Acts as a safety net for tests that import @canva/* without explicit vi.mock() overrides.
initUser();
initPlatform();

// @canva/user is an external Canva SDK dependency. Every UI test file needs this mock
// to prevent import errors. Tests that need to control getCanvaUserToken behavior
// (e.g., jwt-cache.test.ts) override with their own vi.mock('@canva/user', ...).
vi.mock('@canva/user', () => ({
  auth: { getCanvaUserToken: vi.fn() },
}));
