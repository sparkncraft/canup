import { Rows, Text, TextPlaceholder } from '@canva/app-ui-kit';
import { useCustomer } from '../hooks/use-customer.js';
import { useIntl } from '../internal/i18n/use-intl.js';
import { subscriptionMessages } from '../internal/i18n/messages.js';
import { formatDate } from '../internal/format.js';
import { MonetizationAlert } from '../internal/MonetizationAlert.js';
import { BillingLink } from '../internal/BillingLink.js';

/**
 * Customer-level billing surface — the account-area half of Canva's
 * Monetization Status pattern. Reads the customer resource and renders the right
 * state for the current subscription:
 *
 *  - `active`    → "subscribed" + a manage CTA (+ a cancel-scheduled line)
 *  - `trialing`  → "on a trial" + trial-end date + a manage CTA
 *  - `past_due`  → a critical Alert + a manage CTA
 *  - `none`      → a subscribe CTA when Stripe is connected, otherwise nothing
 *
 * Every plan/manage noun is app-name-attributed; every CTA is payments-gated via
 * {@link BillingLink}; status text is never gated.
 */
export function SubscriptionStatus() {
  const { appName, subscriptionStatus, cancelAt, trialEnd, email, billingAvailable, loading } =
    useCustomer();
  const intl = useIntl();

  if (loading) return <TextPlaceholder size="small" />;

  const hasApp = appName ? 'true' : 'false';
  const appNameArg = appName ?? '';
  const m = subscriptionMessages;

  const manageCta = (
    <BillingLink label={intl.formatMessage(m.manage, { hasApp, appName: appNameArg })} />
  );
  const emailLine =
    email != null ? (
      <Text size="xsmall" tone="tertiary">
        {intl.formatMessage(m.loggedInAs, { email })}
      </Text>
    ) : null;

  switch (subscriptionStatus) {
    case 'active': {
      const cancelDate = formatDate(cancelAt);
      return (
        <Rows spacing="1u" align="center">
          <Text alignment="center" tone="secondary">
            {intl.formatMessage(m.subscribed, { hasApp, appName: appNameArg })}
          </Text>
          {manageCta}
          {cancelDate ? (
            <Text size="xsmall" tone="tertiary">
              {intl.formatMessage(m.cancelScheduled, { cancelDate })}
            </Text>
          ) : null}
          {emailLine}
        </Rows>
      );
    }
    case 'trialing': {
      const trialEndDate = formatDate(trialEnd);
      return (
        <Rows spacing="1u" align="center">
          <Text alignment="center" tone="secondary">
            {intl.formatMessage(m.trial, { hasApp, appName: appNameArg })}
          </Text>
          {trialEndDate ? (
            <Text size="xsmall" tone="tertiary">
              {intl.formatMessage(m.trialEnds, { trialEndDate })}
            </Text>
          ) : null}
          {manageCta}
          {emailLine}
        </Rows>
      );
    }
    case 'past_due':
      return (
        <MonetizationAlert
          title={intl.formatMessage(m.pastDueTitle, { hasApp, appName: appNameArg })}
        >
          {manageCta}
        </MonetizationAlert>
      );
    case 'none':
      // Never-subscribed (or terminal, which collapses to `none`): offer to
      // subscribe only when the app has Stripe connected.
      if (!billingAvailable) return null;
      return (
        <BillingLink label={intl.formatMessage(m.subscribe, { hasApp, appName: appNameArg })} />
      );
    default:
      // Status not yet resolved (or unknown) — render nothing.
      return null;
  }
}
