import { describe, expect, test as baseTest, vi } from 'vitest';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { renderWithCanva } from '#test/setup/ui.js';
import { getPlatformInfo, requestOpenExternalUrl } from '@canva/platform';
import { fetchSubscribeLink } from './api-client.js';
import { BuyCreditsLink, SubscribeLink, ManageSubscriptionLink } from './billing.js';

vi.mock('@canva/platform', () => ({
  getPlatformInfo: vi.fn(),
  requestOpenExternalUrl: vi.fn(),
}));
vi.mock('./api-client.js', () => ({
  fetchSubscribeLink: vi.fn(),
  getBaseUrl: vi.fn(() => 'https://canup.link'),
}));

const mockGetPlatformInfo = vi.mocked(getPlatformInfo);
const mockRequestOpen = vi.mocked(requestOpenExternalUrl);
const mockFetchSubscribeLink = vi.mocked(fetchSubscribeLink);

const test = baseTest.extend('_rtl', [
  async ({}, use) => {
    mockGetPlatformInfo.mockReturnValue({ canAcceptPayments: true });
    mockRequestOpen.mockResolvedValue({ status: 'completed' } as never);
    mockFetchSubscribeLink.mockResolvedValue({ url: 'https://x/subscribe/abc' });
    await use();
    cleanup();
  },
  { auto: true },
]);

describe('billing CTAs', () => {
  test('BuyCreditsLink renders the attributed label', () => {
    renderWithCanva(<BuyCreditsLink appName="Acme" />);
    expect(screen.getByText('Buy Acme credits')).toBeTruthy();
  });

  test('SubscribeLink renders the attributed label', () => {
    renderWithCanva(<SubscribeLink appName="Acme" />);
    expect(screen.getByText('Subscribe to Acme')).toBeTruthy();
  });

  test('ManageSubscriptionLink renders the attributed label', () => {
    renderWithCanva(<ManageSubscriptionLink appName="Acme" />);
    expect(screen.getByText('Manage Acme subscription')).toBeTruthy();
  });

  test('renders nothing when the surface forbids payments (Canva store policy)', () => {
    mockGetPlatformInfo.mockReturnValue({ canAcceptPayments: false });
    renderWithCanva(<SubscribeLink appName="Acme" />);
    expect(screen.queryByText('Subscribe to Acme')).toBeNull();
  });

  test('clicking mints a fresh link and opens it externally', async () => {
    renderWithCanva(<BuyCreditsLink appName="Acme" />);
    fireEvent.click(screen.getByText('Buy Acme credits'));

    await waitFor(() => expect(mockFetchSubscribeLink).toHaveBeenCalledOnce());
    await waitFor(() =>
      expect(mockRequestOpen).toHaveBeenCalledWith({ url: 'https://x/subscribe/abc' }),
    );
    expect(screen.queryByText(/Couldn't open billing/)).toBeNull();
  });

  test('drops a second click while a mint is in flight', async () => {
    let resolve: (v: { url: string }) => void = () => {};
    mockFetchSubscribeLink.mockReturnValue(new Promise<{ url: string }>((r) => (resolve = r)));

    renderWithCanva(<BuyCreditsLink appName="Acme" />);
    const link = screen.getByText('Buy Acme credits');
    fireEvent.click(link);
    fireEvent.click(link); // in-flight → dropped

    resolve({ url: 'https://x/subscribe/abc' });
    await waitFor(() => expect(mockFetchSubscribeLink).toHaveBeenCalledOnce());
  });

  test('a mint error surfaces an inline error and leaves the CTA in place', async () => {
    mockFetchSubscribeLink.mockRejectedValueOnce(new Error('network'));
    renderWithCanva(<BuyCreditsLink appName="Acme" />);
    fireEvent.click(screen.getByText('Buy Acme credits'));

    await waitFor(() => expect(mockFetchSubscribeLink).toHaveBeenCalledOnce());
    expect(mockRequestOpen).not.toHaveBeenCalled();
    // The CTA stays put and the user gets a visible, retryable error — never a
    // dead, silent click.
    expect(screen.getByText("Couldn't open billing. Please try again.")).toBeTruthy();
    expect(screen.getByText('Buy Acme credits')).toBeTruthy();
  });
});
