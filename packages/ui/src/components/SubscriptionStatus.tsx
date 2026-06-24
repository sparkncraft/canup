import { Alert, Rows, Text, TextPlaceholder } from '@canva/app-ui-kit';
import { useCustomer } from '../hooks/use-customer.js';
import { useIntl } from '../internal/i18n/use-intl.js';
import { subscriptionMessages } from '../internal/i18n/messages.js';
import { formatDate } from '../internal/format.js';
import { ManageSubscriptionLink, SubscribeLink } from '../internal/billing.js';

/**
 * Customer-level billing surface — the account-area half of Canva's
 * Monetization Status pattern. Renders the state matching the live subscription:
 *
 *  - `active`    → "subscribed" + a manage CTA (+ a cancel-scheduled line)
 *  - `trialing`  → "on a trial" + trial-end date + a manage CTA
 *  - `past_due`  → a critical Alert + a manage CTA
 *  - `none`      → "free plan" + a subscribe CTA when Stripe is connected, else nothing
 *
 * Every plan/manage noun is app-name-attributed; every CTA is payments-gated;
 * status text is never gated. Waits for the customer resource before rendering,
 * so attribution is never missing.
 */
export function SubscriptionStatus() {
  const { appName, subscriptionStatus, cancelAt, trialEnd, email, billingAvailable, loading } =
    useCustomer();
  const intl = useIntl();

  if (loading) return <TextPlaceholder size="small" />;

  // No app name to attribute to, or no resolved status — show nothing.
  if (appName == null || subscriptionStatus == null) return null;

  const m = subscriptionMessages;
  const emailLine =
    email != null ? (
      <Text size="xsmall" tone="tertiary">
        {intl.formatMessage(m.loggedInAs, { email })}
      </Text>
    ) : null;

  switch (subscriptionStatus) {
    case 'active': {
      const cancelDate = formatDate(cancelAt, intl.locale);
      return (
        <Rows spacing="1u" align="center">
          <Text alignment="center" tone="secondary">
            {intl.formatMessage(m.subscribed, { appName })}
          </Text>
          <ManageSubscriptionLink appName={appName} />
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
      const trialEndDate = formatDate(trialEnd, intl.locale);
      return (
        <Rows spacing="1u" align="center">
          <Text alignment="center" tone="secondary">
            {intl.formatMessage(m.trial, { appName })}
          </Text>
          {trialEndDate ? (
            <Text size="xsmall" tone="tertiary">
              {intl.formatMessage(m.trialEnds, { trialEndDate })}
            </Text>
          ) : null}
          <ManageSubscriptionLink appName={appName} />
          {emailLine}
        </Rows>
      );
    }
    case 'past_due':
      // The manage pathway lives inside the critical alert — Canva's
      // access-limitation guideline asks the alert to provide the resolution.
      return (
        <Alert tone="critical" title={intl.formatMessage(m.pastDueTitle, { appName })}>
          <ManageSubscriptionLink appName={appName} />
        </Alert>
      );
    case 'none':
      // Never-subscribed (or terminal, which collapses to `none`). Show the free
      // status + an upgrade pathway, but only when the app has Stripe connected.
      if (!billingAvailable) return null;
      return (
        <Rows spacing="1u" align="center">
          <Text alignment="center" tone="secondary">
            {intl.formatMessage(m.freePlan, { appName })}
          </Text>
          <SubscribeLink appName={appName} />
        </Rows>
      );
  }
}
