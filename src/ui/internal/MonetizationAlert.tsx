import { Alert, Rows } from '@canva/app-ui-kit';
import type { ReactNode } from 'react';

export interface MonetizationAlertProps {
  /** Bold lead line — already localized and app-name-attributed. */
  title: string;
  /** Resolution content: supporting text and/or a billing CTA. */
  children: ReactNode;
}

/**
 * The critical-tone Alert used for access-limitation states (out of credits,
 * payment problem). Per Canva's Monetization Status guidance these states use
 * `Alert` `critical` with attributed resolution copy; centralizing it here keeps
 * both call sites visually identical and gives one place to adjust the look.
 */
export function MonetizationAlert({ title, children }: MonetizationAlertProps) {
  return (
    <Alert tone="critical" title={title}>
      <Rows spacing="1u">{children}</Rows>
    </Alert>
  );
}
