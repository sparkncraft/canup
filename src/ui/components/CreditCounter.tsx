import { type ReactNode, useCallback } from 'react';
import { Link, Rows, Text, TextPlaceholder } from '@canva/app-ui-kit';
import { requestOpenExternalUrl } from '@canva/platform';
import type { IntlShape } from 'react-intl';
import { useCredits } from '../hooks/useCredits.js';
import { useIntl } from '../internal/i18n/use-intl.js';
import { creditCounterMessages } from '../internal/i18n/messages.js';
import type { CreditBalance } from '../internal/types.js';

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

export interface CreditCounterProps {
  action: string;
  footer?: ReactNode;
  formatText?: (data: CreditBalance) => ReactNode;
}

export function CreditCounter({ action, footer, formatText }: CreditCounterProps) {
  const { data, loading, subscribeUrl } = useCredits(action);
  const intl = useIntl();

  const openUrl = useCallback(() => {
    void requestOpenExternalUrl({ url: subscribeUrl! });
  }, [subscribeUrl]);

  if (loading) {
    return (
      <Rows spacing="0.5u">
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
      <Rows spacing="1u" align="center">
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
      <Rows spacing="1u" align="center">
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
    <Rows spacing="1u" align="center">
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
