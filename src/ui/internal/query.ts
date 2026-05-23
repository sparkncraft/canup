import { QueryClient } from '@tanstack/react-query';

/**
 * SSE delivers live credit-balance updates via `acquire()` in
 * `./realtime.ts`. Two safety nets cover the rare case where SSE dies
 * silently (e.g., a corporate proxy that buffers the stream forever
 * without emitting an error event):
 *
 *   - `refetchOnWindowFocus` — when the user comes back to the Canva tab.
 *   - `refetchInterval` (every 5 min, visible-tab-only) — covers active
 *     sessions where the user never leaves the iframe, since focus
 *     events would otherwise never fire.
 */
const STALE_TIME_MS = 30_000;
const SAFETY_POLL_INTERVAL_MS = 5 * 60_000;

export const creditKey = (action: string) => ['credits', action] as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      refetchInterval: SAFETY_POLL_INTERVAL_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
