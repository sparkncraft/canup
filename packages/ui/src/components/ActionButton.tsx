import { type ComponentProps, useCallback, useRef } from 'react';
import { Button, Rows } from '@canva/app-ui-kit';
import { useAction } from '../hooks/use-action.js';
import { useCredits } from '../hooks/use-credits.js';
import { ActionCredits } from './ActionCredits.js';
import { type CanupError, toCanupError } from '../errors.js';

type CanvaButtonProps = ComponentProps<typeof Button>;

/** Preserves discriminated union structure (unlike built-in Omit which collapses unions). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type ActionButtonProps = DistributiveOmit<
  CanvaButtonProps,
  'onClick' | 'loading' | 'pressed'
> & {
  action: string;
  params?: Record<string, unknown>;
  /** Fires synchronously when the user clicks, before the action runs. Useful for starting an external timer or progress UI. */
  onStart?: () => void;
  onResult?: (result: unknown) => void;
  onError?: (error: CanupError) => void;
  /** Fires after the action settles (success or error). Pair with `onStart` to bracket consumer-side loading state. */
  onSettled?: () => void;
  /** Renders `<ActionCredits action={action}>` directly below the button — the common action-panel layout as one drop-in, and the path that keeps the blocked-credits state compliant (status + a resolution CTA). On by default; pass `showCredits={false}` to render the button alone. */
  showCredits?: boolean;
};

export function ActionButton({
  action,
  params,
  onStart,
  onResult,
  onError,
  onSettled,
  showCredits = true,
  disabled,
  children,
  variant,
  ...rest
}: ActionButtonProps) {
  const { execute, loading } = useAction(action);
  const { exhausted } = useCredits(action);

  const latest = useRef({ params, onStart, onResult, onError, onSettled });
  latest.current = { params, onStart, onResult, onError, onSettled };

  // Sync handler (returns void) so it matches Canva's `Button.onClick` signature.
  // `onStart` fires synchronously; the run settles asynchronously after.
  const handleClick = useCallback(() => {
    latest.current.onStart?.();
    execute(latest.current.params)
      .then((result) => {
        latest.current.onResult?.(result);
      })
      .catch((err: unknown) => {
        latest.current.onError?.(toCanupError(err));
      })
      .finally(() => {
        latest.current.onSettled?.();
      });
  }, [execute]);

  // Canva's Button uses nested discriminated unions (pressed × size × variant)
  // that TypeScript cannot narrow through a variable (TS #41184). We reassemble
  // the props object and assert the type — inputs are fully checked via DistributiveOmit.
  const buttonProps = {
    ...rest,
    variant,
    onClick: handleClick,
    loading,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- disabled=false should not override exhausted=true
    disabled: disabled || exhausted,
    children,
  } as CanvaButtonProps;

  if (showCredits) {
    return (
      <Rows spacing="1u">
        <Button {...buttonProps} />
        <ActionCredits action={action} />
      </Rows>
    );
  }

  return <Button {...buttonProps} />;
}
