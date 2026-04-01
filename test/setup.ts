// Common mock registrations shared across all SDK tests.
// Referenced by vitest.config.ts setupFiles.
//
// Only mocks that are IDENTICAL across 3+ test files belong here.
// If a test file needs a custom version of a mock, it should register
// its own vi.mock() which will override the setup file registration.

import { vi } from 'vitest';

// @canva/user is an external Canva SDK dependency that doesn't exist in the
// test environment. Every UI test file needs this mock to prevent import errors.
// Tests that need to control getCanvaUserToken behavior (e.g., jwt-cache.test.ts)
// override this with their own vi.mock('@canva/user', ...) in the test file.
vi.mock('@canva/user', () => ({
  auth: { getCanvaUserToken: vi.fn() },
}));
