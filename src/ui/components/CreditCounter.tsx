import { type ReactNode, useCallback } from 'react';
import { Link, Rows, Text, TextPlaceholder } from '@canva/app-ui-kit';
import { requestOpenExternalUrl } from '@canva/platform';
import { useCredits } from '../hooks/useCredits.js';
import type { CreditBalance } from '../internal/types.js';

const INTERVAL_TEXT: Record<string, string> = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
};

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
function EmailLine({ email }: { email: string | null }) {
  if (!email) return null;
  return (
    <Text alignment="center" size="xsmall" tone="tertiary">
      You&apos;re logged in as {email}.
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

  const openUrl = useCallback(() => {
    if (!subscribeUrl) return;
    void requestOpenExternalUrl({ url: subscribeUrl });
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

  const linkText = data.subscribed ? 'Manage subscription' : 'Upgrade for more credits';
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
        <EmailLine email={data.email} />
      </Rows>
    );
  }

  const resetDate = formatResetDate(data.resetAt);

  if (data.remaining <= 0) {
    return (
      <Rows spacing="1u" align="center">
        <Rows spacing="0" align="center">
          <Text alignment="center" tone="secondary">
            You don&apos;t have enough credits left.
            {resetDate ? ` Credits refresh ${resetDate}.` : ''}
            {billingLink}
          </Text>
        </Rows>
        {footer}
        <EmailLine email={data.email} />
      </Rows>
    );
  }

  const intervalText = data.interval ? INTERVAL_TEXT[data.interval] : null;
  const creditWord = data.remaining === 1 ? 'credit' : 'credits';

  return (
    <Rows spacing="1u" align="center">
      <Rows spacing="0" align="center">
        <Text alignment="center" tone="secondary">
          Use{' '}
          <strong>
            {data.remaining} of {data.quota}
          </strong>{' '}
          {creditWord}.
          {intervalText && data.interval !== 'lifetime' ? ` Credits refresh ${intervalText}.` : ''}
          {billingLink}
        </Text>
      </Rows>
      {footer}
      <EmailLine email={data.email} />
    </Rows>
  );
}
