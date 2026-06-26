import { describe, expect, test as baseTest, vi } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import { renderWithCanva } from '#test/setup/ui.js';
import { ActionCredits } from './ActionCredits.js';
import { useCredits } from '../hooks/use-credits.js';
import { useCustomer } from '../hooks/use-customer.js';

vi.mock('../hooks/use-credits.js', () => ({ useCredits: vi.fn() }));
vi.mock('../hooks/use-customer.js', () => ({ useCustomer: vi.fn() }));
// The buy CTA (gate + mint) is unit-tested in billing.test; here we only assert
// ActionCredits renders it with the right app name.
vi.mock('../internal/billing.js', () => ({
  BuyCreditsLink: ({ appName }: { appName: string }) => (
    <div data-testid="buy-credits">{appName}</div>
  ),
}));

const mockUseCredits = vi.mocked(useCredits);
const mockUseCustomer = vi.mocked(useCustomer);

function credits(over: Partial<ReturnType<typeof useCredits>['data'] & object> = {}) {
  const data = { quota: 100, used: 88, remaining: 12, resetAt: null, interval: 'monthly', ...over };
  return {
    data,
    loading: false,
    // Mirror the real hook's derivation so the stub stays faithful.
    exhausted: data.quota !== null && data.remaining <= 0,
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
    await use();
    cleanup();
  },
  { auto: true },
]);

describe('ActionCredits', () => {
  test('shows remaining credits, count bolded, attributed with the app name', () => {
    renderWithCanva(<ActionCredits action="generate" />);
    // credits() defaults to a monthly interval — the cadence reads as an adjective.
    // The count lives in its own (bold) spans, so assert the assembled text.
    expect(screen.getByText(/credits left/).textContent).toBe(
      '12 of 100 Acme monthly credits left',
    );
    // Each count value is emphasized in its own span, per Canva's pattern.
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('100')).toBeTruthy();
  });

  test.for([
    ['daily', 'daily'],
    ['weekly', 'weekly'],
    ['monthly', 'monthly'],
  ] as const)('folds the %s cadence into the credit noun', ([interval, word]) => {
    mockUseCredits.mockReturnValue(credits({ interval }));
    renderWithCanva(<ActionCredits action="generate" />);
    expect(screen.getByText(/credits left/).textContent).toBe(
      `12 of 100 Acme ${word} credits left`,
    );
  });

  test.for(['lifetime', null] as const)(
    'omits the cadence word when credits do not refresh (%s)',
    (interval) => {
      mockUseCredits.mockReturnValue(credits({ interval }));
      renderWithCanva(<ActionCredits action="generate" />);
      expect(screen.getByText(/credits left/).textContent).toBe('12 of 100 Acme credits left');
      expect(screen.queryByText(/daily|weekly|monthly|lifetime/)).toBeNull();
    },
  );

  test('renders a critical alert with a buy CTA when exhausted', () => {
    mockUseCredits.mockReturnValue(
      credits({ used: 100, remaining: 0, resetAt: '2026-06-15T00:00:00.000Z' }),
    );
    renderWithCanva(<ActionCredits action="generate" />);

    expect(screen.getByText("You're out of Acme credits.")).toBeTruthy();
    expect(screen.getByText(/Credits refresh .*2026/)).toBeTruthy();
    expect(screen.getByTestId('buy-credits').textContent).toBe('Acme');
  });

  test('renders nothing for a pure-subscription action (quota null)', () => {
    mockUseCredits.mockReturnValue(credits({ quota: null }));
    renderWithCanva(<ActionCredits action="generate" />);
    expect(screen.queryByText(/credits/)).toBeNull();
  });

  test('renders nothing until the app name resolves (no unattributed surface)', () => {
    mockUseCustomer.mockReturnValue(customer({ appName: null }));
    renderWithCanva(<ActionCredits action="generate" />);
    expect(screen.queryByText(/credits/)).toBeNull();
  });

  test('shows a placeholder (no credit text) while loading', () => {
    mockUseCredits.mockReturnValue({ ...credits(), data: null, loading: true });
    renderWithCanva(<ActionCredits action="generate" />);
    expect(screen.queryByText(/credits/)).toBeNull();
  });
});
