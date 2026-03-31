import { QueryClient } from '@tanstack/react-query';

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

if (typeof BroadcastChannel !== 'undefined') {
  const channel = new BroadcastChannel('canup-credits');
  let broadcasting = false;

  queryClient.getQueryCache().subscribe((event) => {
    if (broadcasting) return;
    if (event.type === 'updated' && event.action.type === 'success') {
      channel.postMessage({
        queryKey: event.query.queryKey,
        data: event.query.state.data,
      });
    }
  });

  channel.onmessage = (e: MessageEvent) => {
    broadcasting = true;
    queryClient.setQueryData(e.data.queryKey, e.data.data);
    broadcasting = false;
  };
}
