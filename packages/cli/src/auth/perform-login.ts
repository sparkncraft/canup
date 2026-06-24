import { hostname as osHostname } from 'node:os';
import { randomBytes } from 'node:crypto';
import open from 'open';
import { startCallbackServer } from './oauth-server.js';
import { saveCredentials, type UserCredentials } from './token-store.js';
import { CanupClient } from '../api-client.js';
import { DEFAULT_API_URL } from '../constants.js';
import { info, success } from '../ui/output.js';

const STATE_NONCE_BYTES = 16;

/**
 * Perform the full OAuth login flow:
 *
 * 1. Start a local callback server (random OS-assigned port).
 * 2. Open the browser to the CLI login page with `port`, `host`, and a
 *    fresh `state` nonce.
 * 3. Wait for the loopback callback with `{ token, keyId, state }`.
 * 4. Verify the echoed state matches what we sent. Reject otherwise.
 * 5. Save credentials and print "Logged in as <email>."
 *
 * Returns the saved credentials for callers/tests that want them.
 */
export async function performLogin(): Promise<UserCredentials> {
  const apiUrl = process.env.CANUP_URL ?? DEFAULT_API_URL;
  const { port, credentialsPromise, close } = await startCallbackServer();

  const host = osHostname();
  const state = randomBytes(STATE_NONCE_BYTES).toString('hex');

  const url = new URL('/cli/login', apiUrl);
  url.searchParams.set('port', String(port));
  if (host) url.searchParams.set('host', host);
  url.searchParams.set('state', state);
  const targetUrl = url.toString();

  info('Opening browser for GitHub login...');

  try {
    await open(targetUrl);
  } catch {
    info('Could not open browser automatically.');
    console.log(`Please open this URL in your browser:\n\n  ${targetUrl}\n`);
  }

  let result;
  try {
    result = await credentialsPromise;
  } finally {
    close();
  }

  // Strict state check — covers both 'missing' and 'mismatched'. We always
  // generate a nonce and the server always echoes it, so anything else is
  // either a stripped callback or cross-session interference.
  if (result.state !== state) {
    throw new Error(
      'State mismatch — possible cross-session interference or stripped callback. Try `canup login` again.',
    );
  }

  const credentials: UserCredentials = { userKey: result.userKey, keyId: result.keyId };
  saveCredentials(credentials);

  // Fetch identity for the success message. This also confirms the key
  // works against `/v1/me` before we tell the user they're logged in.
  try {
    const client = new CanupClient({ token: credentials.userKey });
    const me = await client.getMe();
    success(`Logged in as ${me.email}.`);
  } catch {
    // Credentials are saved either way; surface a generic confirmation if
    // the identity fetch fails (e.g. transient network).
    success('Logged in.');
  }

  return credentials;
}
