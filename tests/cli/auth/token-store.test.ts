import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, readFileSync, statSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// We need to mock homedir() so tests use a temp directory
let tempDir: string;

vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    homedir: () => tempDir,
  };
});

describe('Token Store', () => {
  beforeEach(() => {
    // Create a fresh temp directory for each test
    tempDir = mkdtempSync(join(tmpdir(), 'canup-test-'));
    // Clear module cache so the module picks up the new tempDir
    vi.resetModules();
  });

  afterEach(() => {
    // Clean up temp directory
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('saves and loads a token', async () => {
    const { saveToken, loadToken } = await import('../../../src/cli/auth/token-store.js');

    saveToken('test-session-token-123');

    const loaded = loadToken();
    expect(loaded).toBe('test-session-token-123');
  });

  it('returns null when no credentials file exists', async () => {
    const { loadToken } = await import('../../../src/cli/auth/token-store.js');

    const loaded = loadToken();
    expect(loaded).toBeNull();
  });

  it('creates ~/.canup/ directory with mode 0o700', async () => {
    const { saveToken } = await import('../../../src/cli/auth/token-store.js');

    saveToken('test-token');

    const canupDir = join(tempDir, '.canup');
    expect(existsSync(canupDir)).toBe(true);

    const stats = statSync(canupDir);
    // Check directory permissions (mask out file type bits)
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o700);
  });

  it('creates credentials file with mode 0o600', async () => {
    const { saveToken } = await import('../../../src/cli/auth/token-store.js');

    saveToken('test-token');

    const credPath = join(tempDir, '.canup', 'credentials');
    expect(existsSync(credPath)).toBe(true);

    const stats = statSync(credPath);
    const mode = stats.mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('stores valid JSON with token and savedAt fields', async () => {
    const { saveToken } = await import('../../../src/cli/auth/token-store.js');

    saveToken('test-token-abc');

    const credPath = join(tempDir, '.canup', 'credentials');
    const raw = readFileSync(credPath, 'utf-8');
    const parsed = JSON.parse(raw);

    expect(parsed.token).toBe('test-token-abc');
    expect(parsed.savedAt).toBeDefined();
    expect(typeof parsed.savedAt).toBe('string');
  });

  it('clears the token by deleting credentials file', async () => {
    const { saveToken, clearToken, loadToken } = await import('../../../src/cli/auth/token-store.js');

    saveToken('test-token');
    expect(loadToken()).toBe('test-token');

    clearToken();
    expect(loadToken()).toBeNull();

    const credPath = join(tempDir, '.canup', 'credentials');
    expect(existsSync(credPath)).toBe(false);
  });

  it('clearToken does not error when no credentials exist', async () => {
    const { clearToken } = await import('../../../src/cli/auth/token-store.js');

    // Should not throw
    expect(() => clearToken()).not.toThrow();
  });
});
