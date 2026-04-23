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
 * Format a resetAt ISO string to a human-readable date.
 */
function formatResetDate(resetAt: string | null): string | null {
  if (!resetAt) return null;
  return new Date(resetAt).toLocaleDateString(undefined, {
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
  const subscribeUrl = data?.subscribeUrl ?? null;

  const openUrl = useCallback(() => {
    if (subscribeUrl) void requestOpenExternalUrl({ url: subscribeUrl });
  }, [subscribeUrl]);

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
  const billingLink = subscribeUrl ? (
    <>
      {' '}
      <Link href={subscribeUrl} requestOpenExternalUrl={openUrl}>
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
        <EmailLine email={data.email} intl={intl} />
      </Rows>
    );
  }

  const resetDate = formatResetDate(data.resetAt);

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
        <EmailLine email={data.email} intl={intl} />
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
      <EmailLine email={data.email} intl={intl} />
    </Rows>
  );
}
