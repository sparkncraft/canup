import { Link } from '@canva/app-ui-kit';
import { canAcceptPayments } from './can-accept-payments.js';
import { openBilling } from './billing.js';
import { getBaseUrl } from './api-client.js';

export interface BillingLinkProps {
  /** Already-localized, app-name-attributed CTA label. */
  label: string;
}

/**
 * The single billing call-to-action shared by every monetization component
 * (buy credits / subscribe / manage). Renders nothing on platforms that forbid
 * external payment flows (`canAcceptPayments === false`, e.g. iOS) — status is
 * shown by the surrounding component regardless; only the CTA is withheld.
 * Otherwise it opens the freshly minted subscribe/portal link at click time.
 */
export function BillingLink({ label }: BillingLinkProps) {
  if (!canAcceptPayments()) return null;
  return (
    <Link href={`${getBaseUrl()}/subscribe`} requestOpenExternalUrl={openBilling}>
      {label}
    </Link>
  );
}
