import { describe, expect, test as baseTest, vi } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import { renderWithCanva } from '#test/setup/ui.js';
import { SubscriptionStatus } from './SubscriptionStatus.js';
import { useCustomer } from '../hooks/use-customer.js';

vi.mock('../hooks/use-customer.js', () => ({ useCustomer: vi.fn() }));
// CTAs (gate + mint) are unit-tested in billing.test; here we only assert which
// one renders per state, with the right app name.
vi.mock('../internal/billing.js', () => ({
  ManageSubscriptionLink: ({ appName }: { appName: string }) => (
    <div data-testid="manage">{appName}</div>
  ),
  SubscribeLink: ({ appName }: { appName: string }) => <div data-testid="subscribe">{appName}</div>,
}));

const mockUseCustomer = vi.mocked(useCustomer);

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
    mockUseCustomer.mockReturnValue(customer());
    await use();
    cleanup();
  },
  { auto: true },
]);

describe('SubscriptionStatus', () => {
  test('active: shows subscribed status and a manage CTA', () => {
    renderWithCanva(<SubscriptionStatus />);
    expect(screen.getByText("You're subscribed to Acme.")).toBeTruthy();
    expect(screen.getByTestId('manage').textContent).toBe('Acme');
  });

  test('active + cancelAt: shows the cancellation date line', () => {
    mockUseCustomer.mockReturnValue(customer({ cancelAt: '2026-08-01T00:00:00.000Z' }));
    renderWithCanva(<SubscriptionStatus />);
    expect(screen.getByText(/Subscription ends .*2026/)).toBeTruthy();
  });

  test('active + email: shows the logged-in-as line', () => {
    mockUseCustomer.mockReturnValue(customer({ email: 'user@example.com' }));
    renderWithCanva(<SubscriptionStatus />);
    expect(screen.getByText("You're logged in as user@example.com.")).toBeTruthy();
  });

  test('trialing: shows trial status, trial-end date, and a manage CTA', () => {
    mockUseCustomer.mockReturnValue(
      customer({ subscriptionStatus: 'trialing', trialEnd: '2026-07-01T00:00:00.000Z' }),
    );
    renderWithCanva(<SubscriptionStatus />);
    expect(screen.getByText("You're on a trial of Acme.")).toBeTruthy();
    expect(screen.getByText(/Trial ends .*2026/)).toBeTruthy();
    expect(screen.getByTestId('manage').textContent).toBe('Acme');
  });

  test('past_due: renders a critical alert with a manage CTA', () => {
    mockUseCustomer.mockReturnValue(customer({ subscriptionStatus: 'past_due' }));
    renderWithCanva(<SubscriptionStatus />);
    expect(screen.getByText("There's a problem with your Acme payment.")).toBeTruthy();
    expect(screen.getByTestId('manage').textContent).toBe('Acme');
  });

  test('none + billingAvailable: shows free-plan status and a subscribe CTA', () => {
    mockUseCustomer.mockReturnValue(
      customer({ subscriptionStatus: 'none', billingAvailable: true }),
    );
    renderWithCanva(<SubscriptionStatus />);
    expect(screen.getByText("You're on the Acme free plan.")).toBeTruthy();
    expect(screen.getByTestId('subscribe').textContent).toBe('Acme');
  });

  test('none + no Stripe connected: renders nothing', () => {
    mockUseCustomer.mockReturnValue(
      customer({ subscriptionStatus: 'none', billingAvailable: false }),
    );
    renderWithCanva(<SubscriptionStatus />);
    expect(screen.queryByText(/free plan/)).toBeNull();
    expect(screen.queryByTestId('subscribe')).toBeNull();
  });

  test('renders nothing until the app name resolves', () => {
    mockUseCustomer.mockReturnValue(customer({ appName: null }));
    renderWithCanva(<SubscriptionStatus />);
    expect(screen.queryByText(/subscribed/)).toBeNull();
  });

  test('shows a placeholder (no status text) while loading', () => {
    mockUseCustomer.mockReturnValue(customer({ loading: true, subscriptionStatus: null }));
    renderWithCanva(<SubscriptionStatus />);
    expect(screen.queryByText(/subscribed/)).toBeNull();
  });
});
