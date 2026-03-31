// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('query', () => {
  beforeEach(() => {
    vi.resetModules();
    instances.length = 0;
    globalThis.BroadcastChannel = MockBC as unknown as typeof BroadcastChannel;
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).BroadcastChannel;
  });

  async function loadModule() {
    return import('../internal/query.js');
  }

  it('queryClient is a QueryClient with correct defaults', async () => {
    const { queryClient, POLL_INTERVAL } = await loadModule();

    expect(queryClient).toBeInstanceOf(QueryClient);

    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(POLL_INTERVAL);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(true);
    expect(defaults.queries?.retry).toBe(1);
  });

  it('creditKey returns ["credits", action] tuple', async () => {
    const { creditKey } = await loadModule();
    expect(creditKey('my-action')).toEqual(['credits', 'my-action']);
  });

  it('broadcasts query cache updates to BroadcastChannel', async () => {
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

  it('applies incoming BroadcastChannel messages to cache', async () => {
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

  it('recursion guard: incoming message does NOT trigger outgoing broadcast', async () => {
    const { queryClient } = await loadModule();
    const channel = instances[0]!;
    channel.postMessage.mockClear();

    channel.onmessage!(
      new MessageEvent('message', {
        data: {
          queryKey: ['credits', 'guard-test'],
          data: { remaining: 7 },
        },
      }),
    );

    expect(channel.postMessage).not.toHaveBeenCalled();
  });

  it('skips BroadcastChannel when unavailable', async () => {
    delete (globalThis as Record<string, unknown>).BroadcastChannel;

    const { queryClient } = await loadModule();
    expect(queryClient).toBeInstanceOf(QueryClient);
    expect(instances).toHaveLength(0);
  });
});
