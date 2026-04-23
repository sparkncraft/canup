import { type ComponentProps, useCallback, useRef } from 'react';
import { Button } from '@canva/app-ui-kit';
import { useAction } from '../hooks/use-action.js';
import { useCredits } from '../hooks/use-credits.js';
import { type CanupError, toCanupError } from '../errors.js';
import type { ActionResult } from '../types.js';

type CanvaButtonProps = ComponentProps<typeof Button>;

/** Preserves discriminated union structure (unlike built-in Omit which collapses unions). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type ActionButtonProps = DistributiveOmit<
  CanvaButtonProps,
  'onClick' | 'loading' | 'pressed'
> & {
  action: string;
  params?: Record<string, unknown>;
  onResult?: (data: ActionResult) => void;
  onError?: (error: CanupError) => void;
};

export function ActionButton({
  action,
  params,
  onResult,
  onError,
  disabled,
  children,
  variant,
  ...rest
}: ActionButtonProps) {
  const { execute, loading } = useAction(action);
  const { exhausted } = useCredits(action);

  const latest = useRef({ params, onResult, onError });
  latest.current = { params, onResult, onError };

  const handleClick = useCallback(async () => {
    try {
      const result = await execute(latest.current.params);
      latest.current.onResult?.(result);
    } catch (err) {
      latest.current.onError?.(toCanupError(err));
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
