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

interface ExhaustedCreditsAlertProps {
  appName: string;
  resetAt: string | null;
}

function ExhaustedCreditsAlert({ appName, resetAt }: ExhaustedCreditsAlertProps) {
  const intl = useIntl();
  const resetDate = formatDate(resetAt, intl.locale);

  // The "buy" pathway lives inside the critical alert — Canva's access-limitation
  // guideline asks the alert to provide the resolution pathway.
  return (
    <Alert tone="critical" title={intl.formatMessage(creditsMessages.exhaustedTitle, { appName })}>
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
  const { data, exhausted, loading: creditsLoading } = useCredits(action);
  const { appName, loading: customerLoading } = useCustomer();
  const intl = useIntl();

  if (creditsLoading || customerLoading) return <TextPlaceholder size="small" />;

  // No per-action credits to show, or no app name to attribute them to.
  if (data?.quota == null || appName == null) return null;

  if (exhausted) {
    return <ExhaustedCreditsAlert appName={appName} resetAt={data.resetAt} />;
  }

  // A null interval and `lifetime` both mean "no refresh cadence" — they fall to
  // the message's `other` arm, which omits the cadence word so the absence reads
  // as one-time credits. The count is emphasized in a bold span (Canva's pattern);
  // passing it as a node keeps every locale's count bold without per-locale markup.
  const bold = (value: number) => (
    <Text variant="bold" tagName="span" size="small">
      {value}
    </Text>
  );
  return (
    <Text alignment="center" tone="secondary" size="small">
      {intl.formatMessage(creditsMessages.remaining, {
        remaining: bold(data.remaining),
        quota: bold(data.quota),
        appName,
        interval: data.interval ?? 'lifetime',
      })}
    </Text>
  );
}
