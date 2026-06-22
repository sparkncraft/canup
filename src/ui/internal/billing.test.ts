import { afterEach, describe, expect, test, vi } from 'vitest';

const { mockFetchSubscribeLink, mockRequestOpen } = vi.hoisted(() => ({
  mockFetchSubscribeLink: vi.fn(),
  mockRequestOpen: vi.fn(),
}));

vi.mock('./api-client.js', () => ({ fetchSubscribeLink: mockFetchSubscribeLink }));
vi.mock('@canva/platform', () => ({ requestOpenExternalUrl: mockRequestOpen }));

async function load() {
  const mod = await import('./billing.js');
  mod._resetBilling();
  return mod;
}

afterEach(async () => {
  (await import('./billing.js'))._resetBilling();
});

describe('openBilling', () => {
  test('mints a fresh link and opens it externally', async () => {
    mockFetchSubscribeLink.mockResolvedValue({ url: 'https://x/subscribe/abc' });
    mockRequestOpen.mockResolvedValue(undefined);
    const { openBilling } = await load();

    await openBilling();

    expect(mockFetchSubscribeLink).toHaveBeenCalledOnce();
    expect(mockRequestOpen).toHaveBeenCalledWith({ url: 'https://x/subscribe/abc' });
  });

  test('drops a second click while a mint is in flight', async () => {
    let resolve: (v: { url: string }) => void = () => {};
    mockFetchSubscribeLink.mockReturnValue(new Promise<{ url: string }>((r) => (resolve = r)));
    mockRequestOpen.mockResolvedValue(undefined);
    const { openBilling } = await load();

    const first = openBilling();
    const second = openBilling(); // in-flight → dropped
    resolve({ url: 'https://x/subscribe/abc' });
    await Promise.all([first, second]);

    expect(mockFetchSubscribeLink).toHaveBeenCalledOnce();
  });

  test('a mint error does not throw and clears the guard for a retry', async () => {
    mockFetchSubscribeLink.mockRejectedValueOnce(new Error('network'));
    const { openBilling } = await load();

    await expect(openBilling()).resolves.toBeUndefined();

    // guard cleared → a retry mints again
    mockFetchSubscribeLink.mockResolvedValue({ url: 'https://x/subscribe/abc' });
    mockRequestOpen.mockResolvedValue(undefined);
    await openBilling();
    expect(mockFetchSubscribeLink).toHaveBeenCalledTimes(2);
  });
});
