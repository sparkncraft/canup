import { describe, vi } from 'vitest';
import { test as baseTest, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

const mockOutput = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  hint: vi.fn(),
  info: vi.fn(),
  label: vi.fn(),
  dim: vi.fn((msg: string) => msg),
  formatTable: vi.fn((_headers: string[], _rows: string[][]) => ''),
}));

vi.mock('../ui/output.js', () => mockOutput);

import {
  loadProjectConfig,
  saveProjectConfig,
  getActionsDir,
  CANUP_DIR,
  CONFIG_FILE,
  DEFAULT_ACTIONS_DIR,
  type ProjectConfig,
} from '../config/project-config.js';

function validConfig(overrides: Partial<ProjectConfig> = {}): ProjectConfig {
  return { appId: randomUUID(), ...overrides };
}

function writeCanupConfig(projectRoot: string, content: string): void {
  const canupDir = join(projectRoot, CANUP_DIR);
  mkdirSync(canupDir, { recursive: true });
  writeFileSync(join(canupDir, CONFIG_FILE), content);
}

const test = baseTest.extend('tmpRoot', async ({}, { onCleanup }) => {
  const dir = mkdtempSync(join(tmpdir(), 'canup-project-config-test-'));
  onCleanup(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
});

describe('loadProjectConfig', () => {
  test('returns config when canup/canup.json exists in cwd', ({ tmpRoot }) => {
    const config = validConfig();
    writeCanupConfig(tmpRoot, JSON.stringify(config));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).not.toBeNull();
    expect(result!.config.appId).toBe(config.appId);
  });

  test('returns null when no config exists', ({ tmpRoot }) => {
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).toBeNull();
  });

  test('walks up directory tree to find config in parent', ({ tmpRoot }) => {
    const config = validConfig();
    writeCanupConfig(tmpRoot, JSON.stringify(config));

    const childDir = join(tmpRoot, 'deep', 'nested', 'dir');
    mkdirSync(childDir, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(childDir);

    const result = loadProjectConfig();

    expect(result).not.toBeNull();
    expect(result!.config.appId).toBe(config.appId);
  });

  test('returns null for invalid JSON in canup.json', ({ tmpRoot }) => {
    writeCanupConfig(tmpRoot, '{ not valid json !!!');
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).toBeNull();
  });

  test('returns null when appId is missing from config', ({ tmpRoot }) => {
    writeCanupConfig(tmpRoot, JSON.stringify({ canvaAppId: 'abc' }));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).toBeNull();
  });

  test('returns null when appId is not a valid UUID', ({ tmpRoot }) => {
    writeCanupConfig(tmpRoot, JSON.stringify({ appId: 'not-a-uuid' }));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).toBeNull();
  });

  test('detects legacy canup.json at root level and calls hint()', ({ tmpRoot }) => {
    const config = validConfig();
    writeFileSync(join(tmpRoot, CONFIG_FILE), JSON.stringify(config));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).toBeNull();
    expect(mockOutput.hint).toHaveBeenCalledWith(expect.stringContaining('legacy canup.json'));
  });

  test('sets projectRoot to the directory containing canup/, not the canup/ dir itself', ({
    tmpRoot,
  }) => {
    const config = validConfig();
    writeCanupConfig(tmpRoot, JSON.stringify(config));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).not.toBeNull();
    expect(result!.projectRoot).toBe(tmpRoot);
  });

  test('sets canupDir to the full path of the canup/ directory', ({ tmpRoot }) => {
    const config = validConfig();
    writeCanupConfig(tmpRoot, JSON.stringify(config));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).not.toBeNull();
    expect(result!.canupDir).toBe(join(tmpRoot, CANUP_DIR));
  });
});

describe('saveProjectConfig', () => {
  test('creates canup/canup.json with formatted JSON + trailing newline', ({ tmpRoot }) => {
    const config = validConfig();

    saveProjectConfig(tmpRoot, config);

    const configPath = join(tmpRoot, CANUP_DIR, CONFIG_FILE);
    const raw = readFileSync(configPath, 'utf-8');
    expect(raw).toBe(JSON.stringify(config, null, 2) + '\n');
  });

  test('creates canup/ directory if it does not exist', ({ tmpRoot }) => {
    const config = validConfig();
    const canupDir = join(tmpRoot, CANUP_DIR);
    expect(existsSync(canupDir)).toBe(false);

    saveProjectConfig(tmpRoot, config);

    expect(existsSync(canupDir)).toBe(true);
  });

  test('overwrites existing config file', ({ tmpRoot }) => {
    const firstConfig = validConfig();
    const secondConfig = validConfig();

    saveProjectConfig(tmpRoot, firstConfig);
    saveProjectConfig(tmpRoot, secondConfig);

    const configPath = join(tmpRoot, CANUP_DIR, CONFIG_FILE);
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.appId).toBe(secondConfig.appId);
  });
});

describe('getActionsDir', () => {
  test('returns canupDir + "actions" when config has no actions override', () => {
    const canupDir = '/project/canup';
    const config = validConfig();

    const result = getActionsDir(canupDir, config);

    expect(result).toBe(join(canupDir, DEFAULT_ACTIONS_DIR));
  });

  test('returns canupDir + custom dir when config.actions.dir is set', () => {
    const canupDir = '/project/canup';
    const config = validConfig({ actions: { dir: 'my-actions' } });

    const result = getActionsDir(canupDir, config);

    expect(result).toBe(join(canupDir, 'my-actions'));
  });
});
