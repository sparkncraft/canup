import { createServer, type Server } from 'node:http';
import { URL } from 'node:url';

export interface CallbackServerResult {
  /** The port the server is listening on (OS-assigned) */
  port: number;
  /** Resolves with the session token when the OAuth callback is received. Throws on error. */
  tokenPromise: Promise<string>;
  /** Close the server */
  close: () => void;
}

interface TokenResult {
  ok: true;
  token: string;
}

interface TokenError {
  ok: false;
  error: string;
}

type CallbackResult = TokenResult | TokenError;

/**
 * Start a local HTTP callback server for receiving the OAuth redirect.
 *
 * The server listens on 127.0.0.1 (per research Pitfall 3: ALWAYS use
 * 127.0.0.1, never localhost) with port 0 (OS-assigned random port).
 *
 * Handles:
 * - GET /callback?token=... -> resolves tokenPromise, serves success page
 * - GET /callback?error=... -> resolves with error result, serves error page
 *
 * Automatically times out after 120 seconds.
 */
export function startCallbackServer(): Promise<CallbackServerResult> {
  return new Promise((resolveStart, rejectStart) => {
    let resolveResult: (result: CallbackResult) => void;

    // Use a result-based promise that always resolves (never rejects directly)
    // to avoid unhandled rejection issues. The tokenPromise wraps this
    // to throw on error results.
    const resultPromise = new Promise<CallbackResult>((resolve) => {
      resolveResult = resolve;
    });

    // The public tokenPromise throws if the result is an error
    const tokenPromise = resultPromise.then((result) => {
      if (result.ok) {
        return result.token;
      }
      throw new Error(result.error);
    });

    // Prevent Node/Vitest unhandled rejection warnings.
    // The consumer will still receive the rejection when they await tokenPromise.
    tokenPromise.catch(() => {});

    const server: Server = createServer((req, res) => {
      if (!req.url) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const url = new URL(req.url, `http://127.0.0.1`);

      if (url.pathname === '/callback') {
        const token = url.searchParams.get('token');
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
          resolveResult!({ ok: false, error: `OAuth error: ${error}` });
          return;
        }

        if (token) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<!DOCTYPE html>
<html><head><title>Login Successful</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 60px;">
<h1>Login Successful!</h1>
<p>You can close this tab and return to your terminal.</p>
</body></html>`);
          resolveResult!({ ok: true, token });
          return;
        }

        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<!DOCTYPE html>
<html><head><title>Bad Request</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 60px;">
<h1>Bad Request</h1>
<p>Missing token or error parameter.</p>
</body></html>`);
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    // Timeout after 120 seconds
    const timeout = setTimeout(() => {
      resolveResult!({
        ok: false,
        error: 'Login timed out. No callback received within 120 seconds.',
      });
      server.close();
    }, 120_000);

    // Clear timeout when result is resolved
    void resultPromise.then(() => {
      clearTimeout(timeout);
    });

    const close = () => {
      clearTimeout(timeout);
      server.close();
    };

    // Listen on 127.0.0.1 with port 0 (OS-assigned)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr !== null) {
        resolveStart({
          port: addr.port,
          tokenPromise,
          close,
        });
      } else {
        rejectStart(new Error('Failed to get server address'));
      }
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
