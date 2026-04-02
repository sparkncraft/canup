import { describe, expect } from 'vitest';
import { test as baseTest } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverActions, resolveActionByName } from '../config/actions-discovery.js';

const test = baseTest.extend('tempDir', async ({}, { onCleanup }) => {
  const dir = mkdtempSync(join(tmpdir(), 'canup-actions-test-'));
  onCleanup(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
});

describe('discoverActions', () => {
  test('returns empty array when directory does not exist', ({ tempDir }) => {
    const result = discoverActions(join(tempDir, 'nonexistent'));
    expect(result).toEqual([]);
  });

  test('returns empty array for empty directory', ({ tempDir }) => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);

    const result = discoverActions(actionsDir);
    expect(result).toEqual([]);
  });

  test('discovers .py files as python', ({ tempDir }) => {
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

  test('discovers .js, .ts, .mjs, .mts files as nodejs', ({ tempDir }) => {
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

  test('ignores non-action files (.txt, .json, .md, directories)', ({ tempDir }) => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'notes.txt'), '');
    writeFileSync(join(actionsDir, 'config.json'), '{}');
    writeFileSync(join(actionsDir, 'README.md'), '');
    mkdirSync(join(actionsDir, 'subdir'));

    const result = discoverActions(actionsDir);
    expect(result).toEqual([]);
  });

  test('returns name without extension', ({ tempDir }) => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'my-action.py'), '');
    writeFileSync(join(actionsDir, 'other-action.js'), '');

    const result = discoverActions(actionsDir);
    const names = result.map((r) => r.name);
    expect(names).toContain('my-action');
    expect(names).toContain('other-action');
  });

  test('returns empty array when readdirSync throws (e.g. permission error)', ({ tempDir }) => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    const fakePath = join(actionsDir, 'not-a-dir');
    writeFileSync(fakePath, '');
    const result = discoverActions(fakePath);
    expect(result).toEqual([]);
  });

  test('handles mixed file types in one directory', ({ tempDir }) => {
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
  test('returns null when directory does not exist', ({ tempDir }) => {
    const result = resolveActionByName(join(tempDir, 'nonexistent'), 'hello');
    expect(result).toBeNull();
  });

  test('returns null when no matching file found', ({ tempDir }) => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'other.py'), '');

    const result = resolveActionByName(actionsDir, 'hello');
    expect(result).toBeNull();
  });

  test('resolves .py file and returns python language', ({ tempDir }) => {
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

  test('resolves .js file and returns nodejs language', ({ tempDir }) => {
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

  test('respects search order (.py before .js when both exist)', ({ tempDir }) => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);
    writeFileSync(join(actionsDir, 'dual.py'), '');
    writeFileSync(join(actionsDir, 'dual.js'), '');

    const result = resolveActionByName(actionsDir, 'dual');
    expect(result).not.toBeNull();
    expect(result!.filePath).toBe(join(actionsDir, 'dual.py'));
    expect(result!.language).toBe('python');
  });

  test('resolves .ts, .mjs, .mts correctly', ({ tempDir }) => {
    const actionsDir = join(tempDir, 'actions');
    mkdirSync(actionsDir);

    writeFileSync(join(actionsDir, 'alpha.ts'), '');
    const tsResult = resolveActionByName(actionsDir, 'alpha');
    expect(tsResult).toEqual({
      name: 'alpha',
      filePath: join(actionsDir, 'alpha.ts'),
      language: 'nodejs',
    });

    writeFileSync(join(actionsDir, 'beta.mjs'), '');
    const mjsResult = resolveActionByName(actionsDir, 'beta');
    expect(mjsResult).toEqual({
      name: 'beta',
      filePath: join(actionsDir, 'beta.mjs'),
      language: 'nodejs',
    });

    writeFileSync(join(actionsDir, 'gamma.mts'), '');
    const mtsResult = resolveActionByName(actionsDir, 'gamma');
    expect(mtsResult).toEqual({
      name: 'gamma',
      filePath: join(actionsDir, 'gamma.mts'),
      language: 'nodejs',
    });
  });
});
