import { Link } from '@canva/app-ui-kit';
import { getPlatformInfo, requestOpenExternalUrl } from '@canva/platform';
import { useIntl } from './i18n/use-intl.js';
import { creditsMessages, subscriptionMessages } from './i18n/messages.js';
import { fetchSubscribeLink, getBaseUrl } from './api-client.js';

let minting = false;

/**
 * Mint a fresh subscribe/portal link and open it externally. The server returns
 * a checkout URL or a billing-portal URL based on the user's state, so every CTA
 * (buy credits / subscribe / manage) funnels through here and differs only in
 * copy. The link is minted at click time — never cached on render — so its
 * short-lived token is always fresh. A module-level guard drops a second click
 * while one mint is in flight; Canva renders its own external-link consent, so
 * no in-app spinner is needed. Errors leave the CTA in place for a retry.
 */
async function openBilling(): Promise<void> {
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

/**
 * A payments-gated billing link. Renders nothing on surfaces that forbid
 * external payment flows (`canAcceptPayments === false`, e.g. iOS) — the
 * surrounding component still shows status; only the CTA is withheld.
 */
function BillingLink({ label }: { label: string }) {
  if (!getPlatformInfo().canAcceptPayments) return null;
  return (
    <Link href={`${getBaseUrl()}/subscribe`} requestOpenExternalUrl={openBilling}>
      {label}
    </Link>
  );
}

/** "Buy {app} credits" — the exhausted-credits resolution CTA. */
export function BuyCreditsLink({ appName }: { appName: string }) {
  const intl = useIntl();
  return <BillingLink label={intl.formatMessage(creditsMessages.buy, { appName })} />;
}

/** "Subscribe to {app}" — the freemium / not-subscribed upgrade CTA. */
export function SubscribeLink({ appName }: { appName: string }) {
  const intl = useIntl();
  return <BillingLink label={intl.formatMessage(subscriptionMessages.subscribe, { appName })} />;
}

/** "Manage {app} subscription" — opens the billing portal. */
export function ManageSubscriptionLink({ appName }: { appName: string }) {
  const intl = useIntl();
  return <BillingLink label={intl.formatMessage(subscriptionMessages.manage, { appName })} />;
}
