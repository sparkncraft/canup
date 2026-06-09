import { type ComponentProps, type ReactNode, useCallback } from 'react';
import { Link, Rows, Text, TextPlaceholder } from '@canva/app-ui-kit';
import { requestOpenExternalUrl } from '@canva/platform';
import type { IntlShape } from 'react-intl';
import { useCredits } from '../hooks/use-credits.js';
import { useIntl } from '../internal/i18n/use-intl.js';
import { creditCounterMessages } from '../internal/i18n/messages.js';
import type { CreditBalance } from '../types.js';

type CanvaRowsProps = ComponentProps<typeof Rows>;

/**
 * Format an ISO date string to a human-readable date.
 */
function formatIsoDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Email line component, extracted for reuse across all CreditCounter layouts.
 */
function EmailLine({ email, intl }: { email: string | null; intl: IntlShape }) {
  if (!email) return null;
  return (
    <Text alignment="center" size="xsmall" tone="tertiary">
      {intl.formatMessage(creditCounterMessages.loggedInAs, { email })}
    </Text>
  );
}

/**
 * "Subscription ends MMM DD" line shown when cancel_at_period_end is set
 * on the brand's Stripe subscription. Lets users know the sub is scheduled
 * to cancel without forcing them into the billing portal to find out.
 */
function CancelScheduledLine({ cancelAt, intl }: { cancelAt: string | null; intl: IntlShape }) {
  const cancelDate = formatIsoDate(cancelAt);
  if (!cancelDate) return null;
  return (
    <Text alignment="center" size="xsmall" tone="tertiary">
      {intl.formatMessage(creditCounterMessages.cancelScheduled, { cancelDate })}
    </Text>
  );
}

/**
 * Subscription footer lines (cancel-scheduled + logged-in-as email), rendered
 * only for subscribed users. Narrowing on `subscribed` is what makes
 * `cancelAt` / `email` accessible — they don't exist on the unsubscribed arm.
 */
function SubscriptionLines({ data, intl }: { data: CreditBalance; intl: IntlShape }) {
  if (!data.subscribed) return null;
  return (
    <>
      <CancelScheduledLine cancelAt={data.cancelAt} intl={intl} />
      <EmailLine email={data.email} intl={intl} />
    </>
  );
}

export type CreditCounterProps = Omit<CanvaRowsProps, 'children' | 'spacing' | 'align'> & {
  action: string;
  footer?: ReactNode;
  formatText?: (data: CreditBalance) => ReactNode;
  spacing?: CanvaRowsProps['spacing'];
  align?: CanvaRowsProps['align'];
};

export function CreditCounter({
  action,
  footer,
  formatText,
  spacing = '1u',
  align = 'center',
  ...rest
}: CreditCounterProps) {
  const { data, loading } = useCredits(action);
  const intl = useIntl();
  const billingUrl = data?.billingUrl ?? null;

  const openUrl = useCallback(() => {
    if (!billingUrl) return;
    void requestOpenExternalUrl({ url: billingUrl });
  }, [billingUrl]);

  const rowsProps = { ...rest, spacing, align } satisfies CanvaRowsProps;

  if (loading) {
    return (
      <Rows {...rowsProps}>
        <Rows spacing="0">
          <TextPlaceholder size="small" />
          <TextPlaceholder size="small" />
        </Rows>
        <TextPlaceholder size="xsmall" />
      </Rows>
    );
  }

  if (data?.quota == null) {
    return null;
  }

  const linkText = data.subscribed
    ? intl.formatMessage(creditCounterMessages.manageSubscription)
    : intl.formatMessage(creditCounterMessages.upgradeForMore);
  const billingLink = billingUrl ? (
    <>
      {' '}
      <Link href={billingUrl} requestOpenExternalUrl={openUrl}>
        {linkText}
      </Link>
    </>
  ) : null;

  if (formatText) {
    return (
      <Rows {...rowsProps}>
        <Rows spacing="0" align="center">
          {formatText(data)}
        </Rows>
        {footer}
        <SubscriptionLines data={data} intl={intl} />
      </Rows>
    );
  }

  const resetDate = formatIsoDate(data.resetAt);

  if (data.remaining <= 0) {
    return (
      <Rows {...rowsProps}>
        <Rows spacing="0" align="center">
          <Text alignment="center" tone="secondary">
            {intl.formatMessage(creditCounterMessages.exhausted)}
            {resetDate
              ? ` ${intl.formatMessage(creditCounterMessages.exhaustedRefresh, { resetDate })}`
              : ''}
            {billingLink}
          </Text>
        </Rows>
        {footer}
        <SubscriptionLines data={data} intl={intl} />
      </Rows>
    );
  }

  const showInterval = data.interval && data.interval !== 'lifetime';

  return (
    <Rows {...rowsProps}>
      <Rows spacing="0" align="center">
        <Text alignment="center" tone="secondary">
          {intl.formatMessage(creditCounterMessages.usage, {
            used: data.used,
            quota: data.quota,
          })}
          {showInterval
            ? ` ${intl.formatMessage(creditCounterMessages.refreshInterval, { interval: data.interval })}`
            : ''}
          {billingLink}
        </Text>
      </Rows>
      {footer}
      <SubscriptionLines data={data} intl={intl} />
    </Rows>
  );
}
