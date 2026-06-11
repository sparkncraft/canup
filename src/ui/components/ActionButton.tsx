import { type ComponentProps, useCallback, useRef } from 'react';
import { Button } from '@canva/app-ui-kit';
import { useAction } from '../hooks/use-action.js';
import { useCredits } from '../hooks/use-credits.js';
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
};

export function ActionButton({
  action,
  params,
  onStart,
  onResult,
  onError,
  onSettled,
  disabled,
  children,
  variant,
  ...rest
}: ActionButtonProps) {
  const { execute, loading } = useAction(action);
  const { exhausted } = useCredits(action);

  const latest = useRef({ params, onStart, onResult, onError, onSettled });
  latest.current = { params, onStart, onResult, onError, onSettled };

  const handleClick = useCallback(async () => {
    latest.current.onStart?.();
    try {
      const result = await execute(latest.current.params);
      latest.current.onResult?.(result);
    } catch (err) {
      latest.current.onError?.(toCanupError(err));
    } finally {
      latest.current.onSettled?.();
    }
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
  } as unknown as CanvaButtonProps;

  return <Button {...buttonProps} />;
}
