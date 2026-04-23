import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, creditKey } from '../internal/query.js';
import { runAction } from '../internal/api-client.js';
import { type CanupError, toCanupError } from '../errors.js';
import type { ActionResult } from '../types.js';

export interface UseActionResult {
  execute: (params?: Record<string, unknown>) => Promise<ActionResult>;
  loading: boolean;
  error: CanupError | null;
}

export function useAction(action: string): UseActionResult {
  const {
    mutateAsync,
    isPending: loading,
    error: mutationError,
  } = useMutation(
    {
      mutationFn: (params?: Record<string, unknown>) => runAction(action, params),
      onSuccess: (result) => {
        if (result.credits) {
          queryClient.setQueryData(creditKey(action), result.credits);
        }
      },
    },
    queryClient,
  );

  const execute = useCallback(
    (params?: Record<string, unknown>) => mutateAsync(params),
    [mutateAsync],
  );

  const error = mutationError ? toCanupError(mutationError) : null;

  return { execute, loading, error };
}
