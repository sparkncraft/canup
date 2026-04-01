import { auth } from '@canva/user';

let cachedToken: string | null = null;
let tokenExpiry = 0;
let pendingRequest: Promise<string> | null = null;

/** @internal Reset cache state for testing. Not part of the public API. */
export function _resetCache(): void {
  cachedToken = null;
  tokenExpiry = 0;
  pendingRequest = null;
}

export async function getJwt(): Promise<string> {
  // Return cached if not expired (with 30s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 30_000) {
    return cachedToken;
  }

  // Deduplicate concurrent requests
  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = auth
    .getCanvaUserToken()
    .then((token) => {
      cachedToken = token;
      // Parse exp from JWT payload (base64url decode middle segment)
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp: number };
      tokenExpiry = payload.exp * 1000;
      pendingRequest = null;
      return token;
    })
    .catch((err) => {
      pendingRequest = null;
      throw err;
    });

  return pendingRequest;
}
