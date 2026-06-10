import { afterEach, describe, expect, test, vi } from 'vitest';

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
  return mod;
}

afterEach(async () => {
  vi.useRealTimers();
  const mod = await import('./realtime.js');
  mod._reset();
  resetEsState();
});

describe('realtime — connection', () => {
  test('first acquire opens an EventSource at /events with Bearer-injecting fetch', async () => {
    const { acquire } = await load();
    const release = acquire(() => {});

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

  test('second acquire reuses the connection (one EventSource for N handlers)', async () => {
    const { acquire } = await load();
    const a = acquire(() => {});
    const b = acquire(() => {});

    expect(mockEventSourceCtor).toHaveBeenCalledOnce();
    a();
    b();
  });

  test('last release closes the connection', async () => {
    const { acquire } = await load();
    const a = acquire(() => {});
    const b = acquire(() => {});

    a();
    expect(mockClose).not.toHaveBeenCalled();
    b();
    expect(mockClose).toHaveBeenCalledOnce();
  });
});

describe('realtime — dispatch', () => {
  test('valid credits.update event is forwarded to every handler', async () => {
    const a = vi.fn();
    const b = vi.fn();
    const { acquire } = await load();
    acquire(a);
    acquire(b);

    const event = {
      type: 'credits.update',
      action: 'generate',
      balance: {
        subscribed: true,
        quota: 500,
        used: 13,
        remaining: 487,
        resetAt: '2026-06-01T00:00:00.000Z',
        interval: 'monthly',
        cancelAt: null,
        email: 'subscriber@example.com',
        billingAvailable: true,
      },
    };
    lastInstance()!._emit('message', new MessageEvent('message', { data: JSON.stringify(event) }));

    expect(a).toHaveBeenCalledExactlyOnceWith(event);
    expect(b).toHaveBeenCalledExactlyOnceWith(event);
  });

  test('malformed JSON is dropped silently', async () => {
    const h = vi.fn();
    const { acquire } = await load();
    acquire(h);

    lastInstance()!._emit('message', new MessageEvent('message', { data: 'not json' }));
    expect(h).not.toHaveBeenCalled();
  });

  test('unknown event types are dropped (forward compat)', async () => {
    const h = vi.fn();
    const { acquire } = await load();
    acquire(h);

    lastInstance()!._emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'some.future.event', payload: {} }),
      }),
    );
    expect(h).not.toHaveBeenCalled();
  });

  test('payload that fails schema validation is dropped', async () => {
    const h = vi.fn();
    const { acquire } = await load();
    acquire(h);

    lastInstance()!._emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'credits.update',
          action: 'generate',
          balance: { quota: 'not a number' }, // wrong type
        }),
      }),
    );
    expect(h).not.toHaveBeenCalled();
  });

  test('balance carries email + cancelAt only on the subscribed arm', async () => {
    const h = vi.fn();
    const { acquire } = await load();
    acquire(h);

    // Subscribed brand — email + cancelAt populated.
    lastInstance()!._emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'credits.update',
          action: 'generate',
          balance: {
            subscribed: true,
            quota: 100,
            used: 5,
            remaining: 95,
            resetAt: '2026-06-01T00:00:00.000Z',
            interval: 'monthly',
            cancelAt: '2026-07-01T00:00:00.000Z',
            email: 'cancelled@example.com',
            billingAvailable: true,
          },
        }),
      }),
    );
    expect(h).toHaveBeenCalledTimes(1);
    expect(h.mock.calls[0][0].balance.email).toBe('cancelled@example.com');
    expect(h.mock.calls[0][0].balance.cancelAt).toBe('2026-07-01T00:00:00.000Z');

    // Unsubscribed brand — the discriminated union has no email/cancelAt on the
    // free-tier arm, so any the server sends are stripped: a free-tier balance
    // can't carry a stray subscriber email or cancellation date.
    lastInstance()!._emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'credits.update',
          action: 'generate',
          balance: {
            subscribed: false,
            quota: 10,
            used: 0,
            remaining: 10,
            resetAt: null,
            interval: 'monthly',
            cancelAt: null,
            email: null,
            billingAvailable: true,
          },
        }),
      }),
    );
    expect(h).toHaveBeenCalledTimes(2);
    expect(h.mock.calls[1][0].balance.subscribed).toBe(false);
    expect(h.mock.calls[1][0].balance.remaining).toBe(10);
    expect(h.mock.calls[1][0].balance.email).toBeUndefined();
    expect(h.mock.calls[1][0].balance.cancelAt).toBeUndefined();
  });

  test('wire schema rejects payload missing email (forward-compat boundary)', async () => {
    const h = vi.fn();
    const { acquire } = await load();
    acquire(h);

    lastInstance()!._emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'credits.update',
          action: 'generate',
          balance: {
            subscribed: true,
            quota: 100,
            used: 0,
            remaining: 100,
            resetAt: '2026-06-01T00:00:00.000Z',
            interval: 'monthly',
            cancelAt: null,
            billingAvailable: true,
            // email omitted — older server without this field.
          },
        }),
      }),
    );
    expect(h).not.toHaveBeenCalled();
  });

  test('throwing handler does not stop other handlers', async () => {
    using consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ok = vi.fn();
    const { acquire } = await load();
    acquire(() => {
      throw new Error('boom');
    });
    acquire(ok);

    lastInstance()!._emit(
      'message',
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'credits.update',
          action: 'generate',
          balance: {
            subscribed: false,
            quota: 100,
            used: 0,
            remaining: 100,
            resetAt: null,
            interval: 'monthly',
            cancelAt: null,
            email: null,
            billingAvailable: true,
          },
        }),
      }),
    );

    expect(ok).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalled();
  });
});

describe('realtime — error recovery', () => {
  test('5xx error schedules manual reopen after delay', async () => {
    vi.useFakeTimers();
    const { acquire } = await load();
    acquire(() => {});

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
    acquire(() => {});

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
    acquire(() => {});

    const instance = lastInstance()!;
    instance.readyState = 0; // CONNECTING — library is retrying
    instance._emit('error', new Event('error'));

    vi.advanceTimersByTime(60_000);
    expect(mockEventSourceCtor).toHaveBeenCalledOnce();
  });

  test('release before scheduled reopen cancels it', async () => {
    vi.useFakeTimers();
    const { acquire } = await load();
    const release = acquire(() => {});

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
