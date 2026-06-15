import { EventSource } from 'eventsource';
import type { RealtimeEvent } from '@canup/types';
import { getJwt } from './jwt-cache.js';
import { queryClient, creditKey } from './query.js';
import { DEFAULT_API_URL } from '../../constants.js';

/**
 * One SSE connection shared by the whole SDK consumer. Every mounted credit
 * counter calls `acquire()` to keep it open; the connection opens on the first
 * acquire and closes on the last release.
 *
 * Incoming messages are routed by event type. `credits.update` writes the new
 * balance straight into the query cache — the same module-level client the rest
 * of the SDK reads — so any `useCredits` re-renders without supplying a handler.
 * Unknown event types are dropped, so an older SDK quietly ignores events a
 * newer server adds.
 */

const REOPEN_DELAY_MS = 5_000;
const NO_RETRY_STATUSES = new Set([401, 403]);

/**
 * Last accepted publish timestamp per action, to reject out-of-order SSE
 * deliveries: the network can reorder messages, and without this a stale
 * snapshot could overwrite a fresh one. ISO-8601 strings sort lexically in time
 * order, so a string compare suffices. A missing `at` bypasses the guard —
 * degrade gracefully rather than drop the update.
 */
const lastAtByAction = new Map<string, string>();

let subscribers = 0;
let connection: EventSource | null = null;
let reopenTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Handle one raw SSE message: parse it, then route by event type. Exported so
 * the routing is unit-testable without standing up a live EventSource.
 */
export function handleServerEvent(data: unknown): void {
  if (typeof data !== 'string') return;
  let event: unknown;
  try {
    event = JSON.parse(data);
  } catch (err) {
    console.warn('[canup] ignoring unparseable SSE message', err);
    return;
  }
  if (typeof event !== 'object' || event === null) return;

  switch ((event as { type?: unknown }).type) {
    case 'credits.update':
      applyCreditsUpdate(event as RealtimeEvent);
      break;
    default:
      break; // unknown event type — drop (forward-compat)
  }
}

function applyCreditsUpdate(event: RealtimeEvent): void {
  if (event.at) {
    const prev = lastAtByAction.get(event.action);
    if (prev && event.at < prev) return; // out-of-order delivery — ignore
    lastAtByAction.set(event.action, event.at);
  }
  queryClient.setQueryData(creditKey(event.action), event.balance);
}

function open(): void {
  if (connection || subscribers === 0) return;

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
    handleServerEvent(ev.data);
  });

  connection.addEventListener('error', (ev) => {
    const code = (ev as ErrorEvent & { code?: number }).code;
    if (connection?.readyState === EventSource.CLOSED) {
      connection = null;
      if (code && NO_RETRY_STATUSES.has(code)) return; // auth fail — don't loop
      reopenTimer = setTimeout(() => {
        if (subscribers > 0) open();
      }, REOPEN_DELAY_MS);
    }
    // readyState === CONNECTING: the library is already retrying; do nothing.
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
 * Keep the shared SSE connection open while the caller is mounted. The first
 * call opens it; the returned release closes it once the last subscriber lets
 * go.
 */
export function acquire(): () => void {
  subscribers += 1;
  open();
  return () => {
    subscribers -= 1;
    if (subscribers === 0) close();
  };
}

// ─── Test-only helpers ──────────────────────────────────────

export function _reset(): void {
  close();
  subscribers = 0;
  lastAtByAction.clear();
}

export function _isConnected(): boolean {
  return connection !== null;
}
