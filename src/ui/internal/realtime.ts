import { EventSource } from 'eventsource';
import { z } from 'zod';
import { getJwt } from './jwt-cache.js';
import { DEFAULT_API_URL } from '../../constants.js';

/**
 * One SSE connection for the whole SDK consumer. Every `useCredits` hook
 * subscribes to this singleton; the connection opens on first acquire
 * and closes on last release.
 */

// ─── Wire schema (also the type) ────────────────────────────

const creditsUpdateSchema = z.object({
  type: z.literal('credits.update'),
  action: z.string(),
  balance: z.object({
    subscribed: z.boolean(),
    quota: z.number().nullable(),
    used: z.number(),
    remaining: z.number(),
    // Date is JSON-serialized to ISO string on the wire.
    resetAt: z.string().nullable(),
    interval: z.enum(['daily', 'weekly', 'monthly', 'lifetime']).nullable(),
  }),
  // ISO-8601 publish-time timestamp. Consumers compare it against the
  // last accepted update to skip out-of-order deliveries. Optional in
  // the schema so an older server that doesn't emit the field still
  // parses; consumers degrade gracefully (no ordering protection) for
  // that case.
  at: z.string().optional(),
});

/** Discriminated union of every server→SDK event. Adding a variant here
 *  is the only change needed to ship a new event type. */
const sdkEventSchema = z.discriminatedUnion('type', [creditsUpdateSchema]);

export type SdkEvent = z.infer<typeof sdkEventSchema>;
export type CreditsUpdate = z.infer<typeof creditsUpdateSchema>;

// ─── Connection lifecycle ───────────────────────────────────

const REOPEN_DELAY_MS = 5_000;
const NO_RETRY_STATUSES = new Set([401, 403]);

const handlers = new Set<(event: SdkEvent) => void>();
let connection: EventSource | null = null;
let reopenTimer: ReturnType<typeof setTimeout> | undefined;

function open(): void {
  if (connection || handlers.size === 0) return;

  const url = `${globalThis.__canup_url ?? DEFAULT_API_URL}/events`;
  connection = new EventSource(url, {
    fetch: async (input, init) => {
      const token = await getJwt();
      return fetch(input, {
        ...init,
        headers: { ...init?.headers, Authorization: `Bearer ${token}` },
      });
    },
  });

  connection.addEventListener('message', (ev: MessageEvent<unknown>) => {
    if (typeof ev.data !== 'string') return;
    let raw: unknown;
    try {
      raw = JSON.parse(ev.data);
    } catch {
      return; // Malformed JSON — drop.
    }
    const parsed = sdkEventSchema.safeParse(raw);
    if (!parsed.success) return; // Unknown event type or shape — forward-compat drop.
    for (const handler of handlers) {
      try {
        handler(parsed.data);
      } catch (err) {
        console.error('[canup] handler threw', err);
      }
    }
  });

  connection.addEventListener('error', (ev) => {
    const code = (ev as ErrorEvent & { code?: number }).code;
    if (connection?.readyState === EventSource.CLOSED) {
      connection = null;
      if (code && NO_RETRY_STATUSES.has(code)) return; // Auth fail — don't loop.
      reopenTimer = setTimeout(() => {
        if (handlers.size > 0) open();
      }, REOPEN_DELAY_MS);
    }
    // readyState === CONNECTING: library is already retrying; do nothing.
  });
}

function close(): void {
  if (reopenTimer) {
    clearTimeout(reopenTimer);
    reopenTimer = undefined;
  }
  if (connection) {
    connection.close();
    connection = null;
  }
}

/**
 * Subscribe to the SSE event stream. The first call opens the connection;
 * subsequent calls share it. Returns a release function that, when
 * called, removes this handler and closes the connection if no handlers
 * remain.
 */
export function acquire(handler: (event: SdkEvent) => void): () => void {
  handlers.add(handler);
  open();
  return () => {
    handlers.delete(handler);
    if (handlers.size === 0) close();
  };
}

// ─── Test-only helpers ──────────────────────────────────────

export function _reset(): void {
  close();
  handlers.clear();
}

export function _handlerCount(): number {
  return handlers.size;
}

export function _isConnected(): boolean {
  return connection !== null;
}
