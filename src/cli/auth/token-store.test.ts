import { test as baseTest, describe, expect, vi } from 'vitest';
import {
  mkdtempSync,
  readFileSync,
  statSync,
  existsSync,
  rmSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const { tempDirRef } = vi.hoisted(() => ({ tempDirRef: { value: '' } }));

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return { ...actual, homedir: () => tempDirRef.value };
});

const test = baseTest.extend('tempDir', async ({}, { onCleanup }) => {
  const dir = mkdtempSync(join(tmpdir(), 'canup-test-'));
  tempDirRef.value = dir;
  vi.resetModules();
  onCleanup(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  return dir;
});

describe('Credentials Store', () => {
  test('saves and loads credentials', async ({ tempDir: _ }) => {
    const { saveCredentials, loadCredentials } = await import('../auth/token-store.js');

    saveCredentials({ userKey: 'cnup_secret_xyz', keyId: 'apikey_abc' });
    expect(loadCredentials()).toEqual({ userKey: 'cnup_secret_xyz', keyId: 'apikey_abc' });
  });

  test('returns null when no credentials file exists', async ({ tempDir: _ }) => {
    const { loadCredentials } = await import('../auth/token-store.js');
    expect(loadCredentials()).toBeNull();
  });

  test('creates ~/.canup/ directory with mode 0o700', async ({ tempDir }) => {
    const { saveCredentials } = await import('../auth/token-store.js');

    saveCredentials({ userKey: 'cnup_xxx', keyId: 'apikey_xxx' });

    const canupDir = join(tempDir, '.canup');
    expect(existsSync(canupDir)).toBe(true);
    expect(statSync(canupDir).mode & 0o777).toBe(0o700);
  });

  test('creates credentials file with mode 0o600', async ({ tempDir }) => {
    const { saveCredentials } = await import('../auth/token-store.js');

    saveCredentials({ userKey: 'cnup_xxx', keyId: 'apikey_xxx' });

    const credPath = join(tempDir, '.canup', 'credentials');
    expect(existsSync(credPath)).toBe(true);
    expect(statSync(credPath).mode & 0o777).toBe(0o600);
  });

  test('stores valid JSON with userKey, keyId, and savedAt fields', async ({ tempDir }) => {
    const { saveCredentials } = await import('../auth/token-store.js');

    saveCredentials({ userKey: 'cnup_secret', keyId: 'apikey_123' });

    const credPath = join(tempDir, '.canup', 'credentials');
    const parsed = JSON.parse(readFileSync(credPath, 'utf-8')) as Record<string, unknown>;
    expect(parsed.userKey).toBe('cnup_secret');
    expect(parsed.keyId).toBe('apikey_123');
    expect(typeof parsed.savedAt).toBe('string');
  });

  test('clears credentials by deleting the file', async ({ tempDir }) => {
    const { saveCredentials, clearCredentials, loadCredentials } =
      await import('../auth/token-store.js');

    saveCredentials({ userKey: 'cnup_xxx', keyId: 'apikey_xxx' });
    expect(loadCredentials()).not.toBeNull();

    clearCredentials();
    expect(loadCredentials()).toBeNull();
    expect(existsSync(join(tempDir, '.canup', 'credentials'))).toBe(false);
  });

  test('returns null when credentials JSON lacks userKey', async ({ tempDir }) => {
    const { loadCredentials } = await import('../auth/token-store.js');

    const canupDir = join(tempDir, '.canup');
    mkdirSync(canupDir, { recursive: true });
    writeFileSync(
      join(canupDir, 'credentials'),
      JSON.stringify({ keyId: 'apikey_xxx', savedAt: '2026-01-01' }),
    );

    expect(loadCredentials()).toBeNull();
  });

  test('returns null when credentials JSON lacks keyId', async ({ tempDir }) => {
    const { loadCredentials } = await import('../auth/token-store.js');

    const canupDir = join(tempDir, '.canup');
    mkdirSync(canupDir, { recursive: true });
    writeFileSync(
      join(canupDir, 'credentials'),
      JSON.stringify({ userKey: 'cnup_xxx', savedAt: '2026-01-01' }),
    );

    expect(loadCredentials()).toBeNull();
  });

  test('clearCredentials does not error when no file exists', async ({ tempDir: _ }) => {
    const { clearCredentials } = await import('../auth/token-store.js');
    expect(() => clearCredentials()).not.toThrow();
  });
});

describe('API Key Store', () => {
  test('saves and loads an API key by appId', async ({ tempDir: _ }) => {
    const { saveApiKey, loadApiKey } = await import('../auth/token-store.js');

    saveApiKey('app-123', 'cnup_key_abc');
    expect(loadApiKey('app-123')).toBe('cnup_key_abc');
  });

  test('returns null when no key file exists for appId', async ({ tempDir: _ }) => {
    const { loadApiKey } = await import('../auth/token-store.js');
    expect(loadApiKey('nonexistent-app')).toBeNull();
  });

  test('creates keys directory with mode 0o700', async ({ tempDir }) => {
    const { saveApiKey } = await import('../auth/token-store.js');

    saveApiKey('app-1', 'key');

    const keysDir = join(tempDir, '.canup', 'keys');
    expect(existsSync(keysDir)).toBe(true);
    expect(statSync(keysDir).mode & 0o777).toBe(0o700);
  });

  test('creates key file with mode 0o600', async ({ tempDir }) => {
    const { saveApiKey } = await import('../auth/token-store.js');

    saveApiKey('app-1', 'key');

    const keyPath = join(tempDir, '.canup', 'keys', 'app-1');
    expect(statSync(keyPath).mode & 0o777).toBe(0o600);
  });

  test('stores valid JSON with apiKey and savedAt', async ({ tempDir }) => {
    const { saveApiKey } = await import('../auth/token-store.js');

    saveApiKey('app-1', 'cnup_secret');

    const keyPath = join(tempDir, '.canup', 'keys', 'app-1');
    const parsed = JSON.parse(readFileSync(keyPath, 'utf-8')) as Record<string, unknown>;
    expect(parsed.apiKey).toBe('cnup_secret');
    expect(typeof parsed.savedAt).toBe('string');
  });

  test('isolates keys by appId', async ({ tempDir: _ }) => {
    const { saveApiKey, loadApiKey } = await import('../auth/token-store.js');

    saveApiKey('app-a', 'key-a');
    saveApiKey('app-b', 'key-b');

    expect(loadApiKey('app-a')).toBe('key-a');
    expect(loadApiKey('app-b')).toBe('key-b');
  });

  test('returns null when API key JSON lacks apiKey field', async ({ tempDir }) => {
    const { loadApiKey } = await import('../auth/token-store.js');

    const keysDir = join(tempDir, '.canup', 'keys');
    mkdirSync(keysDir, { recursive: true });
    writeFileSync(join(keysDir, 'app-no-key'), JSON.stringify({ savedAt: '2026-01-01' }));

    expect(loadApiKey('app-no-key')).toBeNull();
  });

  test('returns null for corrupted key file', async ({ tempDir }) => {
    const { loadApiKey } = await import('../auth/token-store.js');

    const keysDir = join(tempDir, '.canup', 'keys');
    mkdirSync(keysDir, { recursive: true });
    writeFileSync(join(keysDir, 'app-corrupt'), 'not json');

    expect(loadApiKey('app-corrupt')).toBeNull();
  });
});
