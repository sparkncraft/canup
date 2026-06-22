import { describe, expect, test, vi } from 'vitest';
import { getPlatformInfo } from '@canva/platform';
import { canAcceptPayments } from './can-accept-payments.js';

vi.mock('@canva/platform', () => ({
  getPlatformInfo: vi.fn(),
}));

const mockGetPlatformInfo = vi.mocked(getPlatformInfo);

describe('canAcceptPayments', () => {
  test('returns true when the platform accepts payments', () => {
    mockGetPlatformInfo.mockReturnValue({ canAcceptPayments: true });
    expect(canAcceptPayments()).toBe(true);
  });

  test('returns false when the platform forbids payments (e.g. iOS)', () => {
    mockGetPlatformInfo.mockReturnValue({ canAcceptPayments: false });
    expect(canAcceptPayments()).toBe(false);
  });
});
