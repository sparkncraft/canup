import { describe, expect, vi } from 'vitest';
import { test as baseTest } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

const instances: MockBC[] = [];

class MockBC {
  postMessage = vi.fn();
  close = vi.fn();
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor() {
    instances.push(this);
  }
}

const test = baseTest.extend<{ loadModule: () => Promise<typeof import('../internal/query.js')> }>({
  loadModule: async ({}, use) => {
    vi.resetModules();
    instances.length = 0;
    vi.stubGlobal('BroadcastChannel', MockBC);
    await use(() => import('../internal/query.js'));
  },
});

describe('query', () => {
  test('queryClient is a QueryClient with correct defaults', async ({ loadModule }) => {
    const { queryClient, POLL_INTERVAL } = await loadModule();

    expect(queryClient).toBeInstanceOf(QueryClient);

    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(POLL_INTERVAL);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(true);
    expect(defaults.queries?.retry).toBe(1);
  });

  test('creditKey returns ["credits", action] tuple', async ({ loadModule }) => {
    const { creditKey } = await loadModule();
    expect(creditKey('my-action')).toEqual(['credits', 'my-action']);
  });

  test('broadcasts query cache updates to BroadcastChannel', async ({ loadModule }) => {
    const { queryClient } = await loadModule();
    const channel = instances[0]!;

    queryClient.setQueryData(['credits', 'test'], { remaining: 5 });

    await vi.waitFor(() => {
      expect(channel.postMessage).toHaveBeenCalledWith({
        queryKey: ['credits', 'test'],
        data: { remaining: 5 },
      });
    });
  });

  test('applies incoming BroadcastChannel messages to cache', async ({ loadModule }) => {
    const { queryClient } = await loadModule();
    const channel = instances[0]!;

    channel.onmessage!(
      new MessageEvent('message', {
        data: {
          queryKey: ['credits', 'incoming'],
          data: { remaining: 10 },
        },
      }),
    );

    expect(queryClient.getQueryData(['credits', 'incoming'])).toEqual({
      remaining: 10,
    });
  });

  test('recursion guard: incoming message does NOT trigger outgoing broadcast', async ({
    loadModule,
  }) => {
    const { queryClient } = await loadModule();
    const channel = instances[0]!;
    const callsBefore = channel.postMessage.mock.calls.length;

    channel.onmessage!(
      new MessageEvent('message', {
        data: {
          queryKey: ['credits', 'guard-test'],
          data: { remaining: 7 },
        },
      }),
    );

    expect(channel.postMessage.mock.calls.length).toBe(callsBefore);
  });

  test('skips BroadcastChannel when unavailable', async ({ loadModule }) => {
    vi.stubGlobal('BroadcastChannel', undefined);

    const { queryClient } = await loadModule();
    expect(queryClient).toBeInstanceOf(QueryClient);
    expect(instances).toHaveLength(0);
  });
});
