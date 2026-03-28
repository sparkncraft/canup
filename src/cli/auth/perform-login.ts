import open from 'open';
import { startCallbackServer } from './oauth-server.js';
import { saveToken } from './token-store.js';
import { CanupClient } from '../api-client.js';
import { info } from '../ui/output.js';

/**
 * Perform the full OAuth login flow.
 *
 * 1. Start local callback server
 * 2. Get GitHub auth URL from API
 * 3. Open browser
 * 4. Wait for callback with token
 * 5. Save token
 *
 * Returns the session token.
 */
export async function performLogin(): Promise<string> {
  const { port, tokenPromise, close } = await startCallbackServer();
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const client = new CanupClient();
  const { url } = await client.getAuthUrl(redirectUri);

  info('Opening browser for GitHub login...');

  try {
    await open(url);
  } catch {
    info('Could not open browser automatically.');
    console.log(`Please open this URL in your browser:\n\n  ${url}\n`);
  }

  const token = await tokenPromise;
  saveToken(token);
  close();

  return token;
}
