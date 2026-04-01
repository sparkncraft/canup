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

describe('Token Store', () => {
  test('saves and loads a token', async ({ tempDir }) => {
    const { saveToken, loadToken } = await import('../auth/token-store.js');

    saveToken('test-session-token-123');
    expect(loadToken()).toBe('test-session-token-123');
  });

  test('returns null when no credentials file exists', async ({ tempDir }) => {
    const { loadToken } = await import('../auth/token-store.js');
    expect(loadToken()).toBeNull();
  });

  test('creates ~/.canup/ directory with mode 0o700', async ({ tempDir }) => {
    const { saveToken } = await import('../auth/token-store.js');

    saveToken('test-token');

    const canupDir = join(tempDir, '.canup');
    expect(existsSync(canupDir)).toBe(true);
    expect(statSync(canupDir).mode & 0o777).toBe(0o700);
  });

  test('creates credentials file with mode 0o600', async ({ tempDir }) => {
    const { saveToken } = await import('../auth/token-store.js');

    saveToken('test-token');

    const credPath = join(tempDir, '.canup', 'credentials');
    expect(existsSync(credPath)).toBe(true);
    expect(statSync(credPath).mode & 0o777).toBe(0o600);
  });

  test('stores valid JSON with token and savedAt fields', async ({ tempDir }) => {
    const { saveToken } = await import('../auth/token-store.js');

    saveToken('test-token-abc');

    const credPath = join(tempDir, '.canup', 'credentials');
    const parsed = JSON.parse(readFileSync(credPath, 'utf-8'));
    expect(parsed.token).toBe('test-token-abc');
    expect(typeof parsed.savedAt).toBe('string');
  });

  test('clears the token by deleting credentials file', async ({ tempDir }) => {
    const { saveToken, clearToken, loadToken } = await import('../auth/token-store.js');

    saveToken('test-token');
    expect(loadToken()).toBe('test-token');

    clearToken();
    expect(loadToken()).toBeNull();
    expect(existsSync(join(tempDir, '.canup', 'credentials'))).toBe(false);
  });

  test('clearToken does not error when no credentials exist', async ({ tempDir }) => {
    const { clearToken } = await import('../auth/token-store.js');
    expect(() => clearToken()).not.toThrow();
  });
});

describe('API Key Store', () => {
  test('saves and loads an API key by appId', async ({ tempDir }) => {
    const { saveApiKey, loadApiKey } = await import('../auth/token-store.js');

    saveApiKey('app-123', 'cnup_key_abc');
    expect(loadApiKey('app-123')).toBe('cnup_key_abc');
  });

  test('returns null when no key file exists for appId', async ({ tempDir }) => {
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
    const parsed = JSON.parse(readFileSync(keyPath, 'utf-8'));
    expect(parsed.apiKey).toBe('cnup_secret');
    expect(typeof parsed.savedAt).toBe('string');
  });

  test('isolates keys by appId', async ({ tempDir }) => {
    const { saveApiKey, loadApiKey } = await import('../auth/token-store.js');

    saveApiKey('app-a', 'key-a');
    saveApiKey('app-b', 'key-b');

    expect(loadApiKey('app-a')).toBe('key-a');
    expect(loadApiKey('app-b')).toBe('key-b');
  });

  test('returns null for corrupted key file', async ({ tempDir }) => {
    const { loadApiKey } = await import('../auth/token-store.js');

    const keysDir = join(tempDir, '.canup', 'keys');
    mkdirSync(keysDir, { recursive: true });
    writeFileSync(join(keysDir, 'app-corrupt'), 'not json');

    expect(loadApiKey('app-corrupt')).toBeNull();
  });
});
