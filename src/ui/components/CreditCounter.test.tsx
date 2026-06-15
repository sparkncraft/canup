import { describe, expect, test as baseTest, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { IntlProvider } from 'react-intl';
import { TestAppUiProvider } from '@canva/app-ui-kit';
import { renderWithCanva } from '#test/setup/ui.js';
import { CreditCounter } from './CreditCounter.js';
import { useCredits } from '../hooks/use-credits.js';
import type { UseCreditsResult } from '../hooks/use-credits.js';
import { fetchSubscribeLink, getBaseUrl } from '../internal/api-client.js';
import type { CreditBalance } from '../types.js';

vi.mock('../hooks/use-credits.js', () => ({
  useCredits: vi.fn(),
}));
vi.mock('../internal/jwt-cache.js', () => ({
  getJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));
vi.mock('../internal/api-client.js', () => ({
  fetchSubscribeLink: vi.fn(),
  getBaseUrl: vi.fn(),
}));
const mockUseCredits = vi.mocked(useCredits);

const SUBSCRIBE_BASE = 'https://canup.link';
const MINTED_URL = 'https://canup.link/subscribe/minted-tok';

const mockBalance: CreditBalance = {
  subscribed: false,
  quota: 100,
  used: 10,
  remaining: 90,
  resetAt: '2026-04-01T00:00:00Z',
  interval: 'monthly',
  billingAvailable: true,
};

function mockCreditsReturn(overrides: Partial<UseCreditsResult> = {}): UseCreditsResult {
  return {
    data: mockBalance,
    loading: false,
    exhausted: false,
    error: null,
    refresh: vi.fn(),
    ...overrides,
  };
}

const test = baseTest.extend('_rtl', [
  async ({}, use) => {
    mockUseCredits.mockReturnValue(mockCreditsReturn());
    // Re-apply mock impls each test (global mockReset clears them).
    vi.mocked(getBaseUrl).mockReturnValue(SUBSCRIBE_BASE);
    vi.mocked(fetchSubscribeLink).mockResolvedValue({ url: MINTED_URL });
    await use();
    cleanup();
  },
  { auto: true },
]);

describe('CreditCounter', () => {
  test('shows loading skeleton while loading', () => {
    mockUseCredits.mockReturnValue(mockCreditsReturn({ data: null, loading: true }));

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);

    expect(container.textContent).not.toContain('credits');
    expect(container.innerHTML).not.toBe('');
  });

  test('shows usage text with used count', () => {
    const { container } = renderWithCanva(<CreditCounter action="my-action" />);

    const text = container.textContent;
    expect(text).toContain('Used 10 of 100');
    expect(text).toContain('credits');
  });

  test('shows "credits" (plural) when used !== 1', () => {
    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('credits');
  });

  test('pluralizes on quota: "credit" (singular) when quota === 1', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({ data: { ...mockBalance, quota: 1, used: 0, remaining: 1 } }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('Used 0 of 1 credit.');
    expect(container.textContent).not.toContain('credits.');
  });

  test('pluralizes on quota: "credits" (plural) when quota > 1 even if used === 1', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({ data: { ...mockBalance, remaining: 99, used: 1 } }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('Used 1 of 100 credits.');
  });

  test('shows "Credits refresh {interval}." for monthly', () => {
    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('Credits refresh monthly.');
  });

  test('shows "Credits refresh daily." for daily interval', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({ data: { ...mockBalance, interval: 'daily' } }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('Credits refresh daily.');
  });

  test('shows "Credits refresh weekly." for weekly interval', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({ data: { ...mockBalance, interval: 'weekly' } }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('Credits refresh weekly.');
  });

  test('omits refresh text for lifetime interval', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({ data: { ...mockBalance, interval: 'lifetime' } }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.textContent).not.toContain('Credits refresh');
  });

  test('shows exhausted text when remaining === 0 and quota !== null', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, remaining: 0, used: 100 },
        exhausted: true,
      }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain("don't have enough credits left");
    expect(container.textContent).toContain('Credits refresh');
  });

  test('renders nothing (null) when quota === null (free action)', () => {
    mockUseCredits.mockReturnValue(mockCreditsReturn({ data: { ...mockBalance, quota: null } }));

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.innerHTML).toBe('');
  });

  test('shows subscriber email when subscribed with a non-null email', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, subscribed: true, cancelAt: null, email: 'user@example.com' },
      }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('logged in as user@example.com');
  });

  test('renders optional footer prop', () => {
    const footer = React.createElement('a', { href: '/upgrade' }, 'Upgrade');

    const { container } = renderWithCanva(<CreditCounter action="my-action" footer={footer} />);
    expect(container.textContent).toContain('Upgrade');
  });

  test('accepts optional formatText render prop for custom text', () => {
    const formatText = (data: CreditBalance) =>
      React.createElement('span', null, `Custom: ${data.remaining} left`);

    const { container } = renderWithCanva(
      <CreditCounter action="my-action" formatText={formatText} />,
    );
    expect(container.textContent).toContain('Custom: 90 left');
  });

  test('renders "Upgrade for more credits" link when billing is available', () => {
    const { container } = renderWithCanva(<CreditCounter action="my-action" />);

    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link!.textContent).toContain('Upgrade for more credits');
  });

  test('link href points at the subscribe page (real URL is minted on click)', () => {
    const { container } = renderWithCanva(<CreditCounter action="my-action" />);

    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toBe(`${SUBSCRIBE_BASE}/subscribe`);
  });

  test('no link renders while loading (no data yet)', () => {
    mockUseCredits.mockReturnValue(mockCreditsReturn({ data: null, loading: true }));

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);

    const link = container.querySelector('a');
    expect(link).toBeNull();
  });

  test('link renders in exhausted state', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, remaining: 0, used: 100 },
        exhausted: true,
      }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);

    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link!.textContent).toContain('Upgrade for more credits');
  });

  test('no link in formatText path (custom render controls its own layout)', () => {
    const formatText = (data: CreditBalance) =>
      React.createElement('span', null, `Custom: ${data.remaining} left`);

    const { container } = renderWithCanva(
      <CreditCounter action="my-action" formatText={formatText} />,
    );

    const link = container.querySelector('a');
    expect(link).toBeNull();
  });

  test('no link renders when billing is unavailable (Stripe not connected)', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, remaining: 50, used: 50, billingAvailable: false },
      }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    const link = container.querySelector('a');
    expect(link).toBeNull();
    expect(container.textContent).toContain('50 of 100');
  });

  test('shows "Manage subscription" link text when subscribed', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, subscribed: true, cancelAt: null, email: null },
      }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link!.textContent).toContain('Manage subscription');
  });

  test('exhausted without resetAt omits refresh date text', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, remaining: 0, used: 100, resetAt: null },
        exhausted: true,
      }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain("don't have enough credits left");
    expect(container.textContent).not.toContain('Credits refresh');
  });

  test('omits interval text when interval is null', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, interval: null },
      }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('10 of 100');
    expect(container.textContent).not.toContain('Credits refresh');
  });

  test('exhausted state shows when remaining is -1 (negative guard)', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, remaining: -1, used: 101 },
        exhausted: true,
      }),
    );

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain("don't have enough credits left");
  });

  test('mints a fresh link on click, then opens it', async () => {
    const platform = await import('@canva/platform');
    using _spy = vi.spyOn(platform, 'requestOpenExternalUrl').mockResolvedValue(undefined as never);

    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    const link = container.querySelector('a') as HTMLElement;
    expect(link).toBeTruthy();

    fireEvent.click(link);

    await waitFor(() => {
      expect(fetchSubscribeLink).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(platform.requestOpenExternalUrl).toHaveBeenCalledWith({ url: MINTED_URL });
    });
  });

  test('returns null when data is null and not loading', () => {
    mockUseCredits.mockReturnValue(mockCreditsReturn({ data: null, loading: false }));
    const { container } = renderWithCanva(<CreditCounter action="my-action" />);
    expect(container.innerHTML).toBe('');
  });

  test('renders English text when no AppI18nProvider is in the tree', () => {
    const { container } = render(
      <TestAppUiProvider enableAnimations={false}>
        <CreditCounter action="my-action" />
      </TestAppUiProvider>,
    );
    expect(container.textContent).toContain('10 of 100');
    expect(container.textContent).toContain('credit');
  });

  test('renders Spanish translations when locale is es', () => {
    const { container } = render(
      <IntlProvider locale="es" messages={{}}>
        <TestAppUiProvider enableAnimations={false}>
          <CreditCounter action="my-action" />
        </TestAppUiProvider>
      </IntlProvider>,
    );
    expect(container.textContent).toContain('Has usado 10 de 100 créditos.');
    expect(container.textContent).toContain('mensualmente');
    expect(container.textContent).not.toContain('Used');
  });

  test('renders Japanese translations when locale is ja', () => {
    const { container } = render(
      <IntlProvider locale="ja" messages={{}}>
        <TestAppUiProvider enableAnimations={false}>
          <CreditCounter action="my-action" />
        </TestAppUiProvider>
      </IntlProvider>,
    );
    expect(container.textContent).toContain('10 / 100');
    expect(container.textContent).toContain('クレジット');
    expect(container.textContent).not.toContain('Used');
  });
});
