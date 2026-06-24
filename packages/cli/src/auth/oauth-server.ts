import { createServer, type Server } from 'node:http';
import { URL } from 'node:url';

export interface CredentialsCallbackResult {
  userKey: string;
  keyId: string;
  state?: string;
}

export interface CallbackServerResult {
  /** The port the server is listening on (OS-assigned) */
  port: number;
  /** Resolves with credentials when the OAuth callback is received. Throws on error. */
  credentialsPromise: Promise<CredentialsCallbackResult>;
  /** Close the server */
  close: () => void;
}

interface CredentialsOk {
  ok: true;
  result: CredentialsCallbackResult;
}

interface CredentialsErr {
  ok: false;
  error: string;
}

type CallbackOutcome = CredentialsOk | CredentialsErr;

/**
 * Start a local HTTP callback server for receiving the OAuth redirect.
 *
 * The server listens on 127.0.0.1 (never localhost, which can resolve to an
 * external interface) with port 0 (OS-assigned random port).
 *
 * Handles:
 * - GET /callback?token=<userKey>&keyId=<id>[&state=<x>] -> resolves credentialsPromise, serves success page
 * - GET /callback?error=...                              -> resolves with error result, serves error page
 *
 * Automatically times out after LOGIN_TIMEOUT_SECONDS.
 */
const LOGIN_TIMEOUT_MS = 120_000;
const LOGIN_TIMEOUT_SECONDS = LOGIN_TIMEOUT_MS / 1000;

export function startCallbackServer(): Promise<CallbackServerResult> {
  return new Promise((resolveStart, rejectStart) => {
    let resolveOutcome: (outcome: CallbackOutcome) => void;

    // Result-based promise that always resolves (never rejects directly) to
    // avoid unhandled rejection issues. The public credentialsPromise wraps
    // this to throw on error outcomes.
    const outcomePromise = new Promise<CallbackOutcome>((resolve) => {
      resolveOutcome = resolve;
    });

    const credentialsPromise = outcomePromise.then((outcome) => {
      if (outcome.ok) return outcome.result;
      throw new Error(outcome.error);
    });

    // Prevent Node/Vitest unhandled-rejection warnings. The consumer still
    // receives the rejection when they await credentialsPromise.
    credentialsPromise.catch(() => {});

    const server: Server = createServer((req, res) => {
      const url = new URL(req.url!, `http://127.0.0.1`);

      if (url.pathname === '/callback') {
        const userKey = url.searchParams.get('token');
        const keyId = url.searchParams.get('keyId');
        const state = url.searchParams.get('state') ?? undefined;
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<!DOCTYPE html>
<html><head><title>Login Failed</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 60px;">
<h1>Login Failed</h1>
<p>${escapeHtml(error)}</p>
<p>You can close this tab and try again.</p>
</body></html>`);
          resolveOutcome!({ ok: false, error: `OAuth error: ${error}` });
          return;
        }

        if (userKey && keyId) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<!DOCTYPE html>
<html><head><title>Login Successful</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 60px;">
<h1>Login Successful!</h1>
<p>You can close this tab and return to your terminal.</p>
</body></html>`);
          resolveOutcome!({ ok: true, result: { userKey, keyId, state } });
          return;
        }

        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html><head><title>Bad Request</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 60px;">
<h1>Bad Request</h1>
<p>Missing credentials in the callback URL.</p>
</body></html>`);
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    const timeout = setTimeout(() => {
      resolveOutcome!({
        ok: false,
        error: `Login timed out. No callback received within ${LOGIN_TIMEOUT_SECONDS} seconds.`,
      });
      server.close();
    }, LOGIN_TIMEOUT_MS);

    void outcomePromise.then(() => {
      clearTimeout(timeout);
    });

    const close = () => {
      clearTimeout(timeout);
      server.close();
    };

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolveStart({
        port: addr.port,
        credentialsPromise,
        close,
      });
    });

    server.on('error', (err) => {
      rejectStart(err);
    });
  });
}

/** Escape HTML special characters to prevent XSS in error messages */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
