import { describe, expect, test as baseTest, vi } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import { renderWithCanva } from '#test/setup/ui.js';
import { ActionCredits } from './ActionCredits.js';
import { useCredits } from '../hooks/use-credits.js';
import { useCustomer } from '../hooks/use-customer.js';
import { canAcceptPayments } from '../internal/can-accept-payments.js';

vi.mock('../hooks/use-credits.js', () => ({ useCredits: vi.fn() }));
vi.mock('../hooks/use-customer.js', () => ({ useCustomer: vi.fn() }));
vi.mock('../internal/can-accept-payments.js', () => ({ canAcceptPayments: vi.fn() }));

const mockUseCredits = vi.mocked(useCredits);
const mockUseCustomer = vi.mocked(useCustomer);
const mockCanAccept = vi.mocked(canAcceptPayments);

function credits(over: Partial<ReturnType<typeof useCredits>['data'] & object> = {}) {
  return {
    data: { quota: 100, used: 10, remaining: 90, resetAt: null, interval: 'monthly', ...over },
    loading: false,
    exhausted: false,
    error: null,
    refresh: vi.fn(),
  } as ReturnType<typeof useCredits>;
}

function customer(over: Partial<ReturnType<typeof useCustomer>> = {}) {
  return {
    appName: 'Acme',
    subscriptionStatus: 'active',
    cancelAt: null,
    trialEnd: null,
    email: null,
    billingAvailable: true,
    loading: false,
    error: null,
    refresh: vi.fn(),
    ...over,
  } as ReturnType<typeof useCustomer>;
}

const test = baseTest.extend('_rtl', [
  async ({}, use) => {
    mockUseCredits.mockReturnValue(credits());
    mockUseCustomer.mockReturnValue(customer());
    mockCanAccept.mockReturnValue(true);
    await use();
    cleanup();
  },
  { auto: true },
]);

describe('ActionCredits', () => {
  test('shows attributed usage with the app name', () => {
    renderWithCanva(<ActionCredits action="generate" />);
    expect(screen.getByText(/Used 10 of 100 Acme credits/)).toBeTruthy();
  });

  test('appends the refresh interval when not lifetime', () => {
    renderWithCanva(<ActionCredits action="generate" />);
    expect(screen.getByText(/refreshes monthly/)).toBeTruthy();
  });

  test('omits the refresh interval for lifetime credits', () => {
    mockUseCredits.mockReturnValue(credits({ interval: 'lifetime' }));
    renderWithCanva(<ActionCredits action="generate" />);
    expect(screen.getByText(/Used 10 of 100 Acme credits/)).toBeTruthy();
    expect(screen.queryByText(/refreshes/)).toBeNull();
  });

  test('renders a critical alert with a buy CTA when exhausted', () => {
    mockUseCredits.mockReturnValue(
      credits({ used: 100, remaining: 0, resetAt: '2026-06-15T00:00:00.000Z' }),
    );
    renderWithCanva(<ActionCredits action="generate" />);

    expect(screen.getByText("You're out of Acme credits")).toBeTruthy();
    expect(screen.getByText('Buy Acme credits')).toBeTruthy();
    expect(screen.getByText(/Credits refresh .*2026/)).toBeTruthy();
  });

  test('withholds the buy CTA when payments are not accepted, but still shows status', () => {
    mockCanAccept.mockReturnValue(false);
    mockUseCredits.mockReturnValue(credits({ used: 100, remaining: 0 }));
    renderWithCanva(<ActionCredits action="generate" />);

    expect(screen.getByText("You're out of Acme credits")).toBeTruthy();
    expect(screen.queryByText('Buy Acme credits')).toBeNull();
  });

  test('falls back to unattributed copy when the app name has not resolved', () => {
    mockUseCustomer.mockReturnValue(customer({ appName: null }));
    mockUseCredits.mockReturnValue(credits({ used: 100, remaining: 0 }));
    renderWithCanva(<ActionCredits action="generate" />);

    expect(screen.getByText("You're out of credits")).toBeTruthy();
    expect(screen.getByText('Buy more credits')).toBeTruthy();
  });

  test('renders nothing for a pure-subscription action (quota null)', () => {
    mockUseCredits.mockReturnValue(credits({ quota: null }));
    renderWithCanva(<ActionCredits action="generate" />);
    expect(screen.queryByText(/Used/)).toBeNull();
    expect(screen.queryByText(/out of/)).toBeNull();
  });

  test('shows a placeholder (no usage text) while loading', () => {
    mockUseCredits.mockReturnValue({ ...credits(), data: null, loading: true });
    renderWithCanva(<ActionCredits action="generate" />);
    expect(screen.queryByText(/Used/)).toBeNull();
  });
});
