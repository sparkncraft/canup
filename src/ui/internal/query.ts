import { QueryClient, type Query } from '@tanstack/react-query';
import type { CreditBalance } from './types.js';

export const POLL_INTERVAL = 30_000;
export const POLL_INTERVAL_BACKGROUND = 300_000;

export const creditKey = (action: string) => ['credits', action] as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: POLL_INTERVAL,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

interface CreditSyncMessage {
  queryKey: readonly unknown[];
  data: CreditBalance | undefined;
}

if (typeof BroadcastChannel !== 'undefined') {
  const channel = new BroadcastChannel('canup-credits');
  let broadcasting = false;

  queryClient.getQueryCache().subscribe((event) => {
    if (broadcasting) return;
    if (event.type === 'updated' && event.action.type === 'success') {
      const query = event.query as Query<CreditBalance>;
      channel.postMessage({
        queryKey: query.queryKey,
        data: query.state.data,
      } satisfies CreditSyncMessage);
    }
  });

  channel.onmessage = (e: MessageEvent<CreditSyncMessage>) => {
    broadcasting = true;
    queryClient.setQueryData(e.data.queryKey, e.data.data);
    broadcasting = false;
  };
}
