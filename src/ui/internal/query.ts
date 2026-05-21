import { QueryClient } from '@tanstack/react-query';

/**
 * SSE delivers live credit-balance updates via `acquire()` in
 * `./realtime.ts`. `refetchOnWindowFocus` is the safety net for
 * connections that died silently (e.g., a corporate proxy buffered
 * the stream forever) — the user comes back to the Canva tab and the
 * cache refreshes.
 */
export const creditKey = (action: string) => ['credits', action] as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
