import { auth } from '@canva/user';

let cachedToken: string | null = null;
let tokenExpiry = 0;
let pendingRequest: Promise<string> | null = null;

const EXPIRY_BUFFER_MS = 30_000;
const FALLBACK_TTL_MS = 5 * 60_000;

async function fetchToken(): Promise<string> {
  try {
    const token = await auth.getCanvaUserToken();
    cachedToken = token;

    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp: number };
      tokenExpiry = payload.exp * 1000;
    } catch {
      tokenExpiry = Date.now() + FALLBACK_TTL_MS;
    }

    return token;
  } finally {
    pendingRequest = null;
  }
}

export async function getJwt(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry - EXPIRY_BUFFER_MS) {
    return cachedToken;
  }

  pendingRequest ??= fetchToken();
  return pendingRequest;
}
