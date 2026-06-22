import { requestOpenExternalUrl } from '@canva/platform';
import { fetchSubscribeLink } from './api-client.js';

let minting = false;

/**
 * Mint a fresh subscribe/portal link and open it externally. The server returns
 * a checkout URL or a billing-portal URL based on the user's state, so the three
 * CTAs (buy credits / subscribe / manage) all funnel through here and differ
 * only in copy. The link is minted at click time — never cached on render — so
 * its short-lived token is always fresh. A module-level guard drops a second
 * click while one mint is in flight; Canva renders its own external-link
 * consent, so no in-app spinner is needed. Errors leave the CTA in place so the
 * user can retry.
 */
export async function openBilling(): Promise<void> {
  if (minting) return;
  minting = true;
  try {
    const { url } = await fetchSubscribeLink();
    await requestOpenExternalUrl({ url });
  } catch {
    // Best-effort: leave the CTA in place so the user can retry.
  } finally {
    minting = false;
  }
}

/** Test-only: clear the in-flight guard between tests. */
export function _resetBilling(): void {
  minting = false;
}
