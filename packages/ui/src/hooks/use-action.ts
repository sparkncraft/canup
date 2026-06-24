import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient, creditKey } from '../internal/query.js';
import { runAction } from '../internal/api-client.js';
import { type CanupError, toCanupError } from '../errors.js';

export interface UseActionResult {
  execute: (params?: Record<string, unknown>) => Promise<unknown>;
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
      // The run response carries the caller's post-run balance — push it into
      // the cache so this action's credit balance reflects the spend
      // immediately, without waiting on the SSE echo.
      onSuccess: (run) => {
        queryClient.setQueryData(creditKey(action), run.credits);
      },
    },
    queryClient,
  );

  // Hand the consumer just the action's return value; credits reach the UI
  // through the cache (read them with `useCredits`), not this return.
  const execute = useCallback(
    async (params?: Record<string, unknown>) => (await mutateAsync(params)).result,
    [mutateAsync],
  );

  const error = mutationError ? toCanupError(mutationError) : null;

  return { execute, loading, error };
}
