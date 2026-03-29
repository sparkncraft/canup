import { useState, useCallback, useRef } from 'react';
import { runAction as apiRunAction } from '../internal/api-client.js';
import { creditStore } from '../internal/credit-store.js';
import { CanupError } from '../internal/errors.js';
import type { ActionResult } from '../internal/types.js';

export interface UseActionResult {
  execute: (params?: Record<string, unknown>) => Promise<ActionResult>;
  loading: boolean;
  error: CanupError | null;
}

export function useAction(action: string): UseActionResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CanupError | null>(null);
  const pendingRef = useRef(0);

  const execute = useCallback(
    async (params?: Record<string, unknown>): Promise<ActionResult> => {
      pendingRef.current += 1;
      setLoading(true);
      setError(null);

      try {
        const result = await apiRunAction(action, params);
        if (result.credits) {
          creditStore.setCredits(action, result.credits);
        }
        pendingRef.current -= 1;
        if (pendingRef.current === 0) setLoading(false);
        return result;
      } catch (err) {
        pendingRef.current -= 1;
        if (pendingRef.current === 0) setLoading(false);

        if (err instanceof CanupError) {
          setError(err);
          throw err;
        }

        const message = err instanceof Error ? err.message : String(err);
        const canupError = new CanupError('NETWORK_ERROR', message);
        setError(canupError);
        throw canupError;
      }
    },
    [action],
  );

  return { execute, loading, error };
}
