import { afterEach, describe, expect, test, vi } from 'vitest';
import { queryClient, creditKey, customerKey } from './query.js';

const { mockEventSourceCtor, mockClose, lastInstance, resetEsState } = vi.hoisted(() => {
  const closeFn = vi.fn();
  let listeners = new Map<string, ((ev: Event) => void)[]>();
  let inst: {
    url: string;
    init: { fetch?: typeof fetch };
    addEventListener: (type: string, fn: (ev: Event) => void) => void;
    readyState: number;
    close: typeof closeFn;
    _emit: (type: string, ev: Event) => void;
  } | null = null;

  function Ctor(this: object, url: string, init: { fetch?: typeof fetch }) {
    inst = {
      url,
      init,
      addEventListener: (type, fn) => {
        const arr = listeners.get(type) ?? [];
        arr.push(fn);
        listeners.set(type, arr);
      },
      readyState: 1, // OPEN
      close: closeFn,
      _emit: (type, ev) => {
        for (const fn of listeners.get(type) ?? []) fn(ev);
      },
    };
    Object.assign(this, inst);
    return inst;
  }

  return {
    mockEventSourceCtor: vi.fn(Ctor as never),
    mockClose: closeFn,
    lastInstance: () => inst,
    resetEsState: () => {
      listeners = new Map();
      inst = null;
    },
  };
});

vi.mock('eventsource', () => ({
  EventSource: Object.assign(mockEventSourceCtor, {
    CONNECTING: 0,
    OPEN: 1,
    CLOSED: 2,
  }),
}));
vi.mock('./jwt-cache.js', () => ({
  getJwt: vi.fn().mockResolvedValue('mock-jwt'),
}));

async function load() {
  const mod = await import('./realtime.js');
  mod._reset();
  queryClient.clear();
  return mod;
}

afterEach(async () => {
  vi.useRealTimers();
  const mod = await import('./realtime.js');
  mod._reset();
  queryClient.clear();
  resetEsState();
});

/** A per-action balance with a given `remaining`, as the server serializes it. */
function balance(remaining: number) {
  return {
    quota: 10,
    used: 10 - remaining,
    remaining,
    resetAt: null,
    interval: 'monthly' as const,
  };
}

/** A per-brand customer resource, as the server serializes it. */
function customer(overrides: Record<string, unknown> = {}) {
  return {
    appName: 'Acme',
    subscriptionStatus: 'active' as const,
    cancelAt: null,
    trialEnd: null,
    email: 'subscriber@example.com',
    billingAvailable: true,
    ...overrides,
  };
}

describe('realtime — connection', () => {
  test('first acquire opens an EventSource at /events with Bearer-injecting fetch', async () => {
    const { acquire } = await load();
    const release = acquire();

    expect(mockEventSourceCtor).toHaveBeenCalledOnce();
    const [url, init] = mockEventSourceCtor.mock.calls[0];
    expect(url).toMatch(/\/events$/);
    expect(typeof init.fetch).toBe('function');

    using realFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response());
    await init.fetch!('https://x/events', {});
    expect(realFetch).toHaveBeenCalledWith(
      'https://x/events',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer mock-jwt' }),
      }),
    );

    release();
  });

  test('second acquire reuses the connection (one EventSource for N subscribers)', async () => {
    const { acquire } = await load();
    const a = acquire();
    const b = acquire();

    expect(mockEventSourceCtor).toHaveBeenCalledOnce();
    a();
    b();
  });

  test('last release closes the connection', async () => {
    const { acquire } = await load();
    const a = acquire();
    const b = acquire();

    a();
    expect(mockClose).not.toHaveBeenCalled();
    b();
    expect(mockClose).toHaveBeenCalledOnce();
  });
});

describe('realtime — dispatch', () => {
  function emit(data: unknown): void {
    lastInstance()!._emit(
      'message',
      new MessageEvent('message', {
        data: typeof data === 'string' ? data : JSON.stringify(data),
      }),
    );
  }

  test('a credits event writes the balance straight into the credit cache', async () => {
    const { acquire } = await load();
    acquire();

    const b = balance(7);
    emit({ type: 'credits', action: 'generate', balance: b, at: '2026-06-01T00:00:00.000Z' });

    expect(queryClient.getQueryData(creditKey('generate'))).toEqual(b);
  });

  test('a customer event writes the customer straight into the customer cache', async () => {
    const { acquire } = await load();
    acquire();

    const c = customer();
    emit({ type: 'customer', customer: c, at: '2026-06-01T00:00:00.000Z' });

    expect(queryClient.getQueryData(customerKey())).toEqual(c);
  });

  test('unknown event types are dropped (forward-compat, no cache write)', async () => {
    const { acquire } = await load();
    acquire();

    emit({ type: 'some.future.event', payload: {} });
    expect(queryClient.getQueryData(creditKey('generate'))).toBeUndefined();
    expect(queryClient.getQueryData(customerKey())).toBeUndefined();
  });

  test('unparseable JSON is dropped with a warning', async () => {
    using warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { acquire } = await load();
    acquire();

    emit('not json');
    expect(warnSpy).toHaveBeenCalled();
    expect(queryClient.getQueryData(creditKey('generate'))).toBeUndefined();
  });

  test('a non-object payload is dropped', async () => {
    const { acquire } = await load();
    acquire();

    emit('42'); // valid JSON, not an object
    expect(queryClient.getQueryData(creditKey('generate'))).toBeUndefined();
  });

  test('credits: a newer at-timestamp overwrites; an older one is rejected', async () => {
    const { acquire } = await load();
    acquire();

    const newer = balance(8);
    const older = balance(9);
    emit({ type: 'credits', action: 'generate', balance: newer, at: '2026-06-01T00:00:02.000Z' });
    emit({ type: 'credits', action: 'generate', balance: older, at: '2026-06-01T00:00:01.000Z' });

    expect(queryClient.getQueryData(creditKey('generate'))).toEqual(newer);
  });

  test('credits: events without an `at` still apply (graceful degradation)', async () => {
    const { acquire } = await load();
    acquire();

    const b = balance(7);
    emit({ type: 'credits', action: 'generate', balance: b });

    expect(queryClient.getQueryData(creditKey('generate'))).toEqual(b);
  });

  test('credits: an update for one action does not touch another action cache', async () => {
    const { acquire } = await load();
    acquire();

    const b = balance(5);
    emit({ type: 'credits', action: 'generate', balance: b, at: '2026-06-01T00:00:00.000Z' });

    expect(queryClient.getQueryData(creditKey('generate'))).toEqual(b);
    expect(queryClient.getQueryData(creditKey('other'))).toBeUndefined();
  });

  test('customer: a newer at-timestamp overwrites; an older one is rejected', async () => {
    const { acquire } = await load();
    acquire();

    const newer = customer({ email: 'new@example.com' });
    const older = customer({ email: 'old@example.com' });
    emit({ type: 'customer', customer: newer, at: '2026-06-01T00:00:02.000Z' });
    emit({ type: 'customer', customer: older, at: '2026-06-01T00:00:01.000Z' });

    expect(queryClient.getQueryData(customerKey())).toEqual(newer);
  });

  test('the credits and customer streams have independent out-of-order guards', async () => {
    const { acquire } = await load();
    acquire();

    // A late credits event must not be rejected by an earlier customer event's
    // timestamp (and vice versa) — the guards are separate.
    emit({ type: 'customer', customer: customer(), at: '2026-06-01T00:00:05.000Z' });
    const b = balance(3);
    emit({ type: 'credits', action: 'generate', balance: b, at: '2026-06-01T00:00:01.000Z' });

    expect(queryClient.getQueryData(creditKey('generate'))).toEqual(b);
  });

  test('a later customer event replaces the cached one wholesale — a deleted email clears', async () => {
    // Each update writes the whole customer, so a re-subscribe (new email) or a
    // customer.deleted (email: null) simply overwrites the prior value — there is
    // no field-level merge that could leave a stale email behind.
    const { acquire } = await load();
    acquire();

    emit({
      type: 'customer',
      customer: customer({ email: 'old@example.com' }),
      at: '2026-06-01T00:00:00.000Z',
    });
    expect(queryClient.getQueryData<ReturnType<typeof customer>>(customerKey())?.email).toBe(
      'old@example.com',
    );

    const afterDelete = customer({ email: null, subscriptionStatus: 'none' });
    emit({ type: 'customer', customer: afterDelete, at: '2026-06-01T00:00:01.000Z' });

    expect(queryClient.getQueryData(customerKey())).toEqual(afterDelete);
    expect(queryClient.getQueryData<typeof afterDelete>(customerKey())?.email).toBeNull();
  });
});

describe('realtime — error recovery', () => {
  test('5xx error schedules manual reopen after delay', async () => {
    vi.useFakeTimers();
    const { acquire } = await load();
    acquire();

    const instance = lastInstance()!;
    instance.readyState = 2; // CLOSED
    const err = new Event('error') as Event & { code?: number };
    err.code = 503;
    instance._emit('error', err);

    expect(mockEventSourceCtor).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(5_001);
    await Promise.resolve();
    expect(mockEventSourceCtor).toHaveBeenCalledTimes(2);
  });

  test('401 error does NOT trigger manual reopen', async () => {
    vi.useFakeTimers();
    const { acquire } = await load();
    acquire();

    const instance = lastInstance()!;
    instance.readyState = 2;
    const err = new Event('error') as Event & { code?: number };
    err.code = 401;
    instance._emit('error', err);

    vi.advanceTimersByTime(60_000);
    expect(mockEventSourceCtor).toHaveBeenCalledOnce();
  });

  test('transient error (readyState=CONNECTING) does not schedule manual reopen', async () => {
    vi.useFakeTimers();
    const { acquire } = await load();
    acquire();

    const instance = lastInstance()!;
    instance.readyState = 0; // CONNECTING — library is retrying
    instance._emit('error', new Event('error'));

    vi.advanceTimersByTime(60_000);
    expect(mockEventSourceCtor).toHaveBeenCalledOnce();
  });

  test('release before scheduled reopen cancels it', async () => {
    vi.useFakeTimers();
    const { acquire } = await load();
    const release = acquire();

    const instance = lastInstance()!;
    instance.readyState = 2;
    const err = new Event('error') as Event & { code?: number };
    err.code = 500;
    instance._emit('error', err);

    release();
    vi.advanceTimersByTime(60_000);
    expect(mockEventSourceCtor).toHaveBeenCalledOnce();
  });
});
