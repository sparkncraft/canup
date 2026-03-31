import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverActions, resolveActionByName } from '../config/actions-discovery.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'canup-actions-test-'));
});

afterEach(() => {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('discoverActions', () => {
  it('returns empty array when directory does not exist', () => {
    const result = discoverActions(join(tempDir, 'nonexistent'));
    expect(result).toEqual([]);
  });

  it('returns empty array for empty directory', () => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);

    const result = discoverActions(actionsDir);
    expect(result).toEqual([]);
  });

  it('discovers .py files as python', () => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'hello.py'), 'print("hi")');

    const result = discoverActions(actionsDir);
    expect(result).toEqual([
      {
        name: 'hello',
        filePath: join(actionsDir, 'hello.py'),
        language: 'python',
      },
    ]);
  });

  it('discovers .js, .ts, .mjs, .mts files as nodejs', () => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'a.js'), '');
    writeFileSync(join(actionsDir, 'b.ts'), '');
    writeFileSync(join(actionsDir, 'c.mjs'), '');
    writeFileSync(join(actionsDir, 'd.mts'), '');

    const result = discoverActions(actionsDir);
    const languages = result.map((r) => r.language);
    expect(languages).toEqual(['a', 'b', 'c', 'd'].map(() => 'nodejs'));

    for (const action of result) {
      expect(action.language).toBe('nodejs');
    }
  });

  it('ignores non-action files (.txt, .json, .md, directories)', () => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'notes.txt'), '');
    writeFileSync(join(actionsDir, 'config.json'), '{}');
    writeFileSync(join(actionsDir, 'README.md'), '');
    mkdirSync(join(actionsDir, 'subdir'));

    const result = discoverActions(actionsDir);
    expect(result).toEqual([]);
  });

  it('returns name without extension', () => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'my-action.py'), '');
    writeFileSync(join(actionsDir, 'other-action.js'), '');

    const result = discoverActions(actionsDir);
    const names = result.map((r) => r.name);
    expect(names).toContain('my-action');
    expect(names).toContain('other-action');
  });

  it('handles mixed file types in one directory', () => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'fetch.py'), '');
    writeFileSync(join(actionsDir, 'transform.ts'), '');
    writeFileSync(join(actionsDir, 'load.mjs'), '');
    writeFileSync(join(actionsDir, 'ignore.txt'), '');
    mkdirSync(join(actionsDir, 'nested'));

    const result = discoverActions(actionsDir);
    expect(result).toHaveLength(3);

    const pyAction = result.find((a) => a.name === 'fetch');
    expect(pyAction).toBeDefined();
    expect(pyAction!.language).toBe('python');

    const tsAction = result.find((a) => a.name === 'transform');
    expect(tsAction).toBeDefined();
    expect(tsAction!.language).toBe('nodejs');

    const mjsAction = result.find((a) => a.name === 'load');
    expect(mjsAction).toBeDefined();
    expect(mjsAction!.language).toBe('nodejs');
  });
});

describe('resolveActionByName', () => {
  it('returns null when directory does not exist', () => {
    const result = resolveActionByName(join(tempDir, 'nonexistent'), 'hello');
    expect(result).toBeNull();
  });

  it('returns null when no matching file found', () => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'other.py'), '');

    const result = resolveActionByName(actionsDir, 'hello');
    expect(result).toBeNull();
  });

  it('resolves .py file and returns python language', () => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'greet.py'), '');

    const result = resolveActionByName(actionsDir, 'greet');
    expect(result).toEqual({
      name: 'greet',
      filePath: join(actionsDir, 'greet.py'),
      language: 'python',
    });
  });

  it('resolves .js file and returns nodejs language', () => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'run.js'), '');

    const result = resolveActionByName(actionsDir, 'run');
    expect(result).toEqual({
      name: 'run',
      filePath: join(actionsDir, 'run.js'),
      language: 'nodejs',
    });
  });

  it('respects search order (.py before .js when both exist)', () => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'dual.py'), '');
    writeFileSync(join(actionsDir, 'dual.js'), '');

    const result = resolveActionByName(actionsDir, 'dual');
    expect(result).not.toBeNull();
    expect(result!.filePath).toBe(join(actionsDir, 'dual.py'));
    expect(result!.language).toBe('python');
  });

  it('resolves .ts, .mjs, .mts correctly', () => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);

    // Test .ts
    writeFileSync(join(actionsDir, 'alpha.ts'), '');
    const tsResult = resolveActionByName(actionsDir, 'alpha');
    expect(tsResult).toEqual({
      name: 'alpha',
      filePath: join(actionsDir, 'alpha.ts'),
      language: 'nodejs',
    });

    // Test .mjs
    writeFileSync(join(actionsDir, 'beta.mjs'), '');
    const mjsResult = resolveActionByName(actionsDir, 'beta');
    expect(mjsResult).toEqual({
      name: 'beta',
      filePath: join(actionsDir, 'beta.mjs'),
      language: 'nodejs',
    });

    // Test .mts
    writeFileSync(join(actionsDir, 'gamma.mts'), '');
    const mtsResult = resolveActionByName(actionsDir, 'gamma');
    expect(mtsResult).toEqual({
      name: 'gamma',
      filePath: join(actionsDir, 'gamma.mts'),
      language: 'nodejs',
    });
  });
});
