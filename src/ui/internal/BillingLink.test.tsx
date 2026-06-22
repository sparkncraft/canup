import { afterEach, describe, expect, test, vi } from 'vitest';
import { screen, fireEvent, cleanup } from '@testing-library/react';
import { renderWithCanva } from '#test/setup/ui.js';
import { BillingLink } from './BillingLink.js';
import { canAcceptPayments } from './can-accept-payments.js';
import { openBilling } from './billing.js';

vi.mock('./can-accept-payments.js', () => ({ canAcceptPayments: vi.fn() }));
vi.mock('./billing.js', () => ({ openBilling: vi.fn() }));
vi.mock('./api-client.js', () => ({ getBaseUrl: vi.fn(() => 'https://canup.link') }));

const mockCanAccept = vi.mocked(canAcceptPayments);
const mockOpenBilling = vi.mocked(openBilling);

afterEach(cleanup);

describe('BillingLink', () => {
  test('renders the attributed CTA label when payments are accepted', () => {
    mockCanAccept.mockReturnValue(true);
    renderWithCanva(<BillingLink label="Buy Acme credits" />);
    expect(screen.getByText('Buy Acme credits')).toBeTruthy();
  });

  test('renders nothing when payments are not accepted', () => {
    mockCanAccept.mockReturnValue(false);
    renderWithCanva(<BillingLink label="Buy Acme credits" />);
    expect(screen.queryByText('Buy Acme credits')).toBeNull();
  });

  test('opens the billing flow on click', () => {
    mockCanAccept.mockReturnValue(true);
    renderWithCanva(<BillingLink label="Subscribe to Acme" />);
    fireEvent.click(screen.getByText('Subscribe to Acme'));
    expect(mockOpenBilling).toHaveBeenCalledOnce();
  });
});
