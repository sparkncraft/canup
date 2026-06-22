import { Text, TextPlaceholder } from '@canva/app-ui-kit';
import { useCredits } from '../hooks/use-credits.js';
import { useCustomer } from '../hooks/use-customer.js';
import { useIntl } from '../internal/i18n/use-intl.js';
import { creditsMessages } from '../internal/i18n/messages.js';
import { formatDate } from '../internal/format.js';
import { MonetizationAlert } from '../internal/MonetizationAlert.js';
import { BillingLink } from '../internal/BillingLink.js';

export interface ActionCreditsProps {
  /** The action whose credit balance to display. */
  action: string;
}

/**
 * Per-action credit status. Reads the live balance for `action` and the
 * customer resource (for app-name attribution). Renders only when the action is
 * credit-metered (`quota != null`); a pure-subscription action shows nothing
 * here. When the balance is exhausted, renders a critical Alert with a
 * (payments-gated) "Buy credits" CTA, per Canva's Monetization Status pattern.
 */
export function ActionCredits({ action }: ActionCreditsProps) {
  const { data, loading } = useCredits(action);
  const { appName } = useCustomer();
  const intl = useIntl();

  if (loading) return <TextPlaceholder size="small" />;

  // Pure-subscription action — no per-action credits to show.
  if (data?.quota == null) return null;

  // `appName` may lag the balance by a beat; the `hasApp` branch keeps the copy
  // correct either way and re-renders attributed once the customer resolves.
  const hasApp = appName ? 'true' : 'false';
  const appNameArg = appName ?? '';

  if (data.remaining <= 0) {
    const resetDate = formatDate(data.resetAt);
    return (
      <MonetizationAlert
        title={intl.formatMessage(creditsMessages.exhaustedTitle, { hasApp, appName: appNameArg })}
      >
        {resetDate ? (
          <Text size="small">
            {intl.formatMessage(creditsMessages.exhaustedRefresh, { resetDate })}
          </Text>
        ) : null}
        <BillingLink
          label={intl.formatMessage(creditsMessages.buy, { hasApp, appName: appNameArg })}
        />
      </MonetizationAlert>
    );
  }

  const showInterval = data.interval != null && data.interval !== 'lifetime';
  return (
    <Text alignment="center" tone="secondary">
      {intl.formatMessage(creditsMessages.usage, {
        used: data.used,
        quota: data.quota,
        hasApp,
        appName: appNameArg,
      })}
      {showInterval
        ? intl.formatMessage(creditsMessages.refreshSuffix, { interval: data.interval })
        : ''}
    </Text>
  );
}
