import { useMutation } from '@tanstack/react-query';
import { queryClient, creditKey } from '../internal/query.js';
import { runAction } from '../internal/api-client.js';
import { CanupError } from '../internal/errors.js';
import type { ActionResult } from '../internal/types.js';

export interface UseActionResult {
  execute: (params?: Record<string, unknown>) => Promise<ActionResult>;
  loading: boolean;
  error: CanupError | null;
}

export function useAction(action: string): UseActionResult {
  const mutation = useMutation(
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

  const error =
    mutation.error instanceof CanupError
      ? mutation.error
      : mutation.error
        ? new CanupError('NETWORK_ERROR', mutation.error.message)
        : null;

  return {
    execute: (params) => mutation.mutateAsync(params),
    loading: mutation.isPending,
    error,
  };
}
