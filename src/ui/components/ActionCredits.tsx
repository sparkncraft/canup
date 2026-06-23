import { Alert, Rows, Text, TextPlaceholder } from '@canva/app-ui-kit';
import { useCredits } from '../hooks/use-credits.js';
import { useCustomer } from '../hooks/use-customer.js';
import { useIntl } from '../internal/i18n/use-intl.js';
import { creditsMessages } from '../internal/i18n/messages.js';
import { formatDate } from '../internal/format.js';
import { BuyCreditsLink } from '../internal/billing.js';

export interface ActionCreditsProps {
  /** The action whose credit balance to display. */
  action: string;
}

/**
 * Per-action credit status. Shows the live balance for `action`, attributed with
 * the app name. Renders only when the action is credit-metered (`quota != null`).
 * When the balance is exhausted, renders a critical Alert with a payments-gated
 * "Buy credits" CTA, per Canva's Monetization Status pattern.
 *
 * Waits for the customer resource (which carries `appName`) before rendering, so
 * attribution is never missing; if it can't resolve, the surface is omitted
 * rather than shown unattributed.
 */
export function ActionCredits({ action }: ActionCreditsProps) {
  const { data, loading: creditsLoading } = useCredits(action);
  const { appName, loading: customerLoading } = useCustomer();
  const intl = useIntl();

  if (creditsLoading || customerLoading) return <TextPlaceholder size="small" />;

  // No per-action credits to show, or no app name to attribute them to.
  if (data?.quota == null || appName == null) return null;

  if (data.remaining <= 0) {
    const resetDate = formatDate(data.resetAt);
    return (
      <Alert
        tone="critical"
        title={intl.formatMessage(creditsMessages.exhaustedTitle, { appName })}
      >
        <Rows spacing="1u">
          {resetDate ? (
            <Text size="small">
              {intl.formatMessage(creditsMessages.exhaustedRefresh, { resetDate })}
            </Text>
          ) : null}
          <BuyCreditsLink appName={appName} />
        </Rows>
      </Alert>
    );
  }

  const showInterval = data.interval != null && data.interval !== 'lifetime';
  return (
    <Text alignment="center" tone="secondary">
      {intl.formatMessage(creditsMessages.remaining, {
        remaining: data.remaining,
        quota: data.quota,
        appName,
      })}
      {showInterval
        ? intl.formatMessage(creditsMessages.refreshSuffix, { interval: data.interval })
        : ''}
    </Text>
  );
}
