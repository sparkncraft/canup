import { type ComponentProps, useCallback } from 'react';
import { Button } from '@canva/app-ui-kit';
import { useAction } from '../hooks/useAction.js';
import { useCredits } from '../hooks/useCredits.js';
import type { CanupError } from '../internal/errors.js';

type CanvaButtonProps = ComponentProps<typeof Button>;

/** Preserves discriminated union structure (unlike built-in Omit which collapses unions). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type ActionButtonProps = DistributiveOmit<
  CanvaButtonProps,
  'onClick' | 'loading' | 'pressed' | 'variant'
> & {
  action: string;
  params?: Record<string, unknown>;
  onResult?: (data: { result: unknown; durationMs: number }) => void;
  onError?: (error: CanupError) => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'contrast';
};

export function ActionButton({
  action,
  params,
  onResult,
  onError,
  disabled,
  children,
  variant = 'primary',
  ...rest
}: ActionButtonProps) {
  const { execute, loading } = useAction(action);
  const { exhausted } = useCredits(action);

  const handleClick = useCallback(async () => {
    try {
      const result = await execute(params);
      onResult?.(result);
    } catch (err) {
      onError?.(err as CanupError);
    }
  }, [execute, params, onResult, onError]);

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
