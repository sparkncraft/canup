import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CONFIG_HOME_DIR = '.canup';
const CREDENTIALS_FILE = 'credentials';
const KEYS_DIR = 'keys';
const DIR_PERMISSION = 0o700;
const FILE_PERMISSION = 0o600;

/**
 * Path to the CanUp credentials directory (~/.canup/)
 */
function getCanupDir(): string {
  return join(homedir(), CONFIG_HOME_DIR);
}

/**
 * Path to the credentials file (~/.canup/credentials)
 */
function getCredentialsPath(): string {
  return join(getCanupDir(), CREDENTIALS_FILE);
}

/**
 * Save a session token to ~/.canup/credentials.
 *
 * Creates the ~/.canup/ directory (mode 0o700) if it does not exist.
 * Writes the credentials file with mode 0o600 (owner read/write only).
 */
export function saveToken(token: string): void {
  const dir = getCanupDir();
  const filePath = getCredentialsPath();

  // Create directory with restrictive permissions
  mkdirSync(dir, { recursive: true, mode: DIR_PERMISSION });

  // Write credentials with restrictive permissions
  const data = JSON.stringify({ token, savedAt: new Date().toISOString() }, null, 2);
  writeFileSync(filePath, data, { mode: FILE_PERMISSION });
}

/**
 * Load a session token from ~/.canup/credentials.
 *
 * Returns the token string, or null if the file does not exist or is invalid.
 */
export function loadToken(): string | null {
  const filePath = getCredentialsPath();

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Clear the stored token by deleting the credentials file.
 */
export function clearToken(): void {
  const filePath = getCredentialsPath();

  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch {
    // Silently ignore errors (file may not exist)
  }
}

// ──────────────────────────────────────────────
// API Key storage (per-app, in ~/.canup/keys/)
// ──────────────────────────────────────────────

/**
 * Path to the API keys directory (~/.canup/keys/)
 */
function getKeysDir(): string {
  return join(getCanupDir(), KEYS_DIR);
}

/**
 * Save an API key for a specific app.
 *
 * Stores at ~/.canup/keys/{appId} with restrictive permissions.
 * The API key is never stored in canup.json -- only here.
 */
export function saveApiKey(appId: string, apiKey: string): void {
  const dir = getKeysDir();
  mkdirSync(dir, { recursive: true, mode: DIR_PERMISSION });

  const filePath = join(dir, appId);
  const data = JSON.stringify({ apiKey, savedAt: new Date().toISOString() }, null, 2);
  writeFileSync(filePath, data, { mode: FILE_PERMISSION });
}

/**
 * Load the API key for a specific app.
 *
 * Returns the API key string, or null if not found.
 */
export function loadApiKey(appId: string): string | null {
  const filePath = join(getKeysDir(), appId);

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as { apiKey?: string };
    return parsed.apiKey ?? null;
  } catch {
    return null;
  }
}
