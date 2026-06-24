import { Link, Text } from '@canva/app-ui-kit';
import { useCallback, useState } from 'react';
import { getPlatformInfo, requestOpenExternalUrl } from '@canva/platform';
import { useIntl } from './i18n/use-intl.js';
import { billingMessages, creditsMessages, subscriptionMessages } from './i18n/messages.js';
import { fetchSubscribeLink, getBaseUrl } from './api-client.js';

let minting = false;

/**
 * Mint a fresh subscribe/portal link and open it externally. The server returns
 * a checkout URL or a billing-portal URL based on the user's state, so every CTA
 * (buy credits / subscribe / manage) funnels through here and differs only in
 * copy. The link is minted at click time — never cached on render — so its
 * short-lived token is always fresh. A module-level guard drops a second click
 * while one mint is in flight; Canva renders its own external-link consent, so
 * no in-app spinner is needed. Throws on failure so the caller can surface it.
 */
async function openBilling(): Promise<void> {
  if (minting) return;
  minting = true;
  try {
    const { url } = await fetchSubscribeLink();
    await requestOpenExternalUrl({ url });
  } finally {
    minting = false;
  }
}

/**
 * A payments-gated billing link. Renders nothing on surfaces that forbid
 * external payment flows (`canAcceptPayments === false`, e.g. iOS) — Canva's
 * store policy disallows payment call-to-actions there; the surrounding
 * component still shows status, only the CTA is withheld. If a click fails to
 * mint or open, an inline error appears and the link stays put for a retry.
 */
function BillingLink({ label }: { label: string }) {
  const intl = useIntl();
  const [failed, setFailed] = useState(false);

  // Sync handler (returns void) so it matches Link's `requestOpenExternalUrl`
  // signature; the mint runs fire-and-forget and surfaces failures inline.
  const handleOpen = useCallback(() => {
    setFailed(false);
    openBilling().catch(() => {
      setFailed(true);
    });
  }, []);

  if (!getPlatformInfo().canAcceptPayments) return null;

  return (
    <>
      <Link href={`${getBaseUrl()}/subscribe`} requestOpenExternalUrl={handleOpen}>
        {label}
      </Link>
      {failed ? (
        <Text size="small" tone="critical">
          {intl.formatMessage(billingMessages.openFailed)}
        </Text>
      ) : null}
    </>
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
