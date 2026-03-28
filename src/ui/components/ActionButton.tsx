import { type ComponentProps, useCallback } from 'react';
import { Button } from '@canva/app-ui-kit';
import { useAction } from '../hooks/useAction.js';
import { useCredits } from '../hooks/useCredits.js';
import type { CanupError } from '../internal/errors.js';

type CanvaButtonProps = ComponentProps<typeof Button>;

export interface ActionButtonProps extends Omit<CanvaButtonProps, 'onClick' | 'loading'> {
  action: string;
  params?: Record<string, unknown>;
  onResult?: (data: { result: unknown; durationMs: number }) => void;
  onError?: (error: CanupError) => void;
}

export function ActionButton({
  action,
  params,
  onResult,
  onError,
  disabled,
  children,
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

  return (
    <Button
      {...rest}
      onClick={handleClick}
      loading={loading}
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentional: disabled=false should not override exhausted=true
      disabled={disabled || exhausted}
    >
      {children}
    </Button>
  );
}
