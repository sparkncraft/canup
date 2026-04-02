// @vitest-environment jsdom
import { describe, expect, vi } from 'vitest';
import { test as baseTest } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { CreditCounter } from '../components/CreditCounter.js';
import { useCredits } from '../hooks/useCredits.js';
import type { UseCreditsResult } from '../hooks/useCredits.js';
import type { CreditBalance } from '../internal/types.js';

vi.mock('@canva/app-ui-kit', () => ({
  Rows: vi.fn(({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'rows' }, children),
  ),
  Text: vi.fn(
    ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      tone?: string;
      size?: string;
      alignment?: string;
    }) =>
      React.createElement(
        'span',
        {
          'data-testid': 'text',
          'data-tone': props.tone,
          'data-size': props.size,
        },
        children,
      ),
  ),
  TextPlaceholder: vi.fn(({ size }: { size?: string }) =>
    React.createElement('div', {
      'data-testid': 'text-placeholder',
      'data-size': size,
    }),
  ),
  Link: vi.fn(
    ({
      children,
      href,
      requestOpenExternalUrl: reqOpen,
    }: {
      children?: React.ReactNode;
      href?: string;
      requestOpenExternalUrl?: () => void;
    }) => React.createElement('a', { 'data-testid': 'link', href, onClick: reqOpen }, children),
  ),
}));

vi.mock('@canva/platform', () => ({
  requestOpenExternalUrl: vi.fn(),
}));

vi.mock('../hooks/useCredits.js', () => ({
  useCredits: vi.fn(),
}));
vi.mock('../internal/jwt-cache.js', () => ({
  getJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));
const mockUseCredits = vi.mocked(useCredits);

const mockBalance: CreditBalance = {
  subscribed: false,
  quota: 100,
  used: 10,
  remaining: 90,
  resetAt: '2026-04-01T00:00:00Z',
  interval: 'monthly',
  email: null,
  subscribeUrl: null,
};

function mockCreditsReturn(overrides: Partial<UseCreditsResult> = {}): UseCreditsResult {
  return {
    data: mockBalance,
    loading: false,
    exhausted: false,
    subscribeUrl: 'https://canup.link/subscribe/mock-jwt',
    refresh: vi.fn(),
    ...overrides,
  };
}

const test = baseTest.extend('_rtl', [
  async ({}, use) => {
    mockUseCredits.mockReturnValue(mockCreditsReturn());
    await use();
  },
  { auto: true },
]);

describe('CreditCounter', () => {
  test('shows TextPlaceholder skeleton while loading', () => {
    mockUseCredits.mockReturnValue(mockCreditsReturn({ data: null, loading: true }));

    const { container } = render(<CreditCounter action="my-action" />);

    const placeholders = container.querySelectorAll('[data-testid="text-placeholder"]');
    expect(placeholders.length).toBeGreaterThanOrEqual(2);
  });

  test('shows "Use X of Y credits" with bold count when remaining > 0', () => {
    const { container } = render(<CreditCounter action="my-action" />);

    const text = container.textContent;
    expect(text).toContain('90 of 100');
    expect(text).toContain('credits');

    const strong = container.querySelector('strong');
    expect(strong).toBeTruthy();
    expect(strong!.textContent).toContain('90 of 100');
  });

  test('shows "credits" (plural) when remaining !== 1', () => {
    const { container } = render(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('credits');
  });

  test('shows "credit" (singular) when remaining === 1', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({ data: { ...mockBalance, remaining: 1, used: 99 } }),
    );

    const { container } = render(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('credit.');
    expect(container.textContent).not.toContain('credits.');
  });

  test('shows "Credits refresh {interval}." for monthly', () => {
    const { container } = render(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('Credits refresh monthly.');
  });

  test('omits refresh text for lifetime interval', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({ data: { ...mockBalance, interval: 'lifetime' } }),
    );

    const { container } = render(<CreditCounter action="my-action" />);
    expect(container.textContent).not.toContain('Credits refresh');
  });

  test('shows exhausted text when remaining === 0 and quota !== null', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, remaining: 0, used: 100 },
        exhausted: true,
      }),
    );

    const { container } = render(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain("don't have enough credits left");
  });

  test('renders nothing (null) when quota === null (free action)', () => {
    mockUseCredits.mockReturnValue(mockCreditsReturn({ data: { ...mockBalance, quota: null } }));

    const { container } = render(<CreditCounter action="my-action" />);
    expect(container.innerHTML).toBe('');
  });

  test('shows subscriber email when email is non-null', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({ data: { ...mockBalance, email: 'user@example.com' } }),
    );

    const { container } = render(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('logged in as user@example.com');
  });

  test('renders optional footer prop', () => {
    const footer = React.createElement('a', { href: '/upgrade' }, 'Upgrade');

    const { container } = render(<CreditCounter action="my-action" footer={footer} />);
    expect(container.textContent).toContain('Upgrade');
  });

  test('accepts optional formatText render prop for custom text', () => {
    const formatText = (data: CreditBalance) =>
      React.createElement('span', null, `Custom: ${data.remaining} left`);

    const { container } = render(<CreditCounter action="my-action" formatText={formatText} />);
    expect(container.textContent).toContain('Custom: 90 left');
  });

  test('renders "Upgrade for more credits" link automatically when subscribeUrl is available', () => {
    const { container } = render(<CreditCounter action="my-action" />);

    const link = container.querySelector('[data-testid="link"]');
    expect(link).toBeTruthy();
    expect(link!.textContent).toBe('Upgrade for more credits');
  });

  test('link href matches subscribeUrl from useCredits', () => {
    const { container } = render(<CreditCounter action="my-action" />);

    const link = container.querySelector('[data-testid="link"]');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toBe('https://canup.link/subscribe/mock-jwt');
  });

  test('no link renders when subscribeUrl is null (loading state)', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({ data: null, loading: true, subscribeUrl: null }),
    );

    const { container } = render(<CreditCounter action="my-action" />);

    const link = container.querySelector('[data-testid="link"]');
    expect(link).toBeNull();
  });

  test('link renders in exhausted state', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, remaining: 0, used: 100 },
        exhausted: true,
      }),
    );

    const { container } = render(<CreditCounter action="my-action" />);

    const link = container.querySelector('[data-testid="link"]');
    expect(link).toBeTruthy();
    expect(link!.textContent).toBe('Upgrade for more credits');
  });

  test('no link in formatText path (custom render controls its own layout)', () => {
    const formatText = (data: CreditBalance) =>
      React.createElement('span', null, `Custom: ${data.remaining} left`);

    const { container } = render(<CreditCounter action="my-action" formatText={formatText} />);

    const link = container.querySelector('[data-testid="link"]');
    expect(link).toBeNull();
  });

  test('no link renders when subscribeUrl is null with data loaded', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, remaining: 50, used: 50 },
        subscribeUrl: null,
      }),
    );

    const { container } = render(<CreditCounter action="my-action" />);
    const link = container.querySelector('[data-testid="link"]');
    expect(link).toBeNull();
    expect(container.textContent).toContain('50 of 100');
  });

  test('shows "Manage subscription" link text when subscribed', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, subscribed: true },
      }),
    );

    const { container } = render(<CreditCounter action="my-action" />);
    const link = container.querySelector('[data-testid="link"]');
    expect(link).toBeTruthy();
    expect(link!.textContent).toBe('Manage subscription');
  });

  test('exhausted without resetAt omits refresh date text', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, remaining: 0, used: 100, resetAt: null },
        exhausted: true,
      }),
    );

    const { container } = render(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain("don't have enough credits left");
    expect(container.textContent).not.toContain('Credits refresh');
  });

  test('omits interval text when interval is null', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, interval: null },
      }),
    );

    const { container } = render(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain('90 of 100');
    expect(container.textContent).not.toContain('Credits refresh');
  });

  test('exhausted state shows when remaining is -1 (negative guard)', () => {
    mockUseCredits.mockReturnValue(
      mockCreditsReturn({
        data: { ...mockBalance, remaining: -1, used: 101 },
        exhausted: true,
      }),
    );

    const { container } = render(<CreditCounter action="my-action" />);
    expect(container.textContent).toContain("don't have enough credits left");
  });

  test('calls requestOpenExternalUrl when link is clicked', async () => {
    const { requestOpenExternalUrl } = await import('@canva/platform');

    const { container } = render(<CreditCounter action="my-action" />);
    const link = container.querySelector('[data-testid="link"]') as HTMLElement;
    expect(link).toBeTruthy();

    fireEvent.click(link);

    expect(requestOpenExternalUrl).toHaveBeenCalledWith({
      url: 'https://canup.link/subscribe/mock-jwt',
    });
  });

  test('returns null when data is null and not loading', () => {
    mockUseCredits.mockReturnValue(mockCreditsReturn({ data: null, loading: false }));
    const { container } = render(<CreditCounter action="my-action" />);
    expect(container.innerHTML).toBe('');
  });
});
