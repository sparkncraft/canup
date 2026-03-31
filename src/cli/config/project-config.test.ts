import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
// vi.hoisted runs at hoist-time, before static imports resolve.
// This file has a static import of project-config.js which itself imports output.js,
// so the mock must be ready before module loading — createMockOutput() can't be used
// because the fixtures import hasn't resolved yet at hoist time.
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

describe('loadProjectConfig', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'canup-project-config-test-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('returns config when canup/canup.json exists in cwd', () => {
    const config = validConfig();
    writeCanupConfig(tmpRoot, JSON.stringify(config));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).not.toBeNull();
    expect(result!.config.appId).toBe(config.appId);
  });

  it('returns null when no config exists', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).toBeNull();
  });

  it('walks up directory tree to find config in parent', () => {
    const config = validConfig();
    writeCanupConfig(tmpRoot, JSON.stringify(config));

    const childDir = join(tmpRoot, 'deep', 'nested', 'dir');
    mkdirSync(childDir, { recursive: true });
    vi.spyOn(process, 'cwd').mockReturnValue(childDir);

    const result = loadProjectConfig();

    expect(result).not.toBeNull();
    expect(result!.config.appId).toBe(config.appId);
  });

  it('returns null for invalid JSON in canup.json', () => {
    writeCanupConfig(tmpRoot, '{ not valid json !!!');
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).toBeNull();
  });

  it('returns null when appId is missing from config', () => {
    writeCanupConfig(tmpRoot, JSON.stringify({ canvaAppId: 'abc' }));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).toBeNull();
  });

  it('returns null when appId is not a valid UUID', () => {
    writeCanupConfig(tmpRoot, JSON.stringify({ appId: 'not-a-uuid' }));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).toBeNull();
  });

  it('detects legacy canup.json at root level and calls hint()', () => {
    // Place a legacy canup.json directly in tmpRoot (not inside canup/)
    const config = validConfig();
    writeFileSync(join(tmpRoot, CONFIG_FILE), JSON.stringify(config));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).toBeNull();
    expect(mockOutput.hint).toHaveBeenCalledWith(expect.stringContaining('legacy canup.json'));
  });

  it('sets projectRoot to the directory containing canup/, not the canup/ dir itself', () => {
    const config = validConfig();
    writeCanupConfig(tmpRoot, JSON.stringify(config));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).not.toBeNull();
    expect(result!.projectRoot).toBe(tmpRoot);
  });

  it('sets canupDir to the full path of the canup/ directory', () => {
    const config = validConfig();
    writeCanupConfig(tmpRoot, JSON.stringify(config));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpRoot);

    const result = loadProjectConfig();

    expect(result).not.toBeNull();
    expect(result!.canupDir).toBe(join(tmpRoot, CANUP_DIR));
  });
});

describe('saveProjectConfig', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'canup-project-config-test-'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('creates canup/canup.json with formatted JSON + trailing newline', () => {
    const config = validConfig();

    saveProjectConfig(tmpRoot, config);

    const configPath = join(tmpRoot, CANUP_DIR, CONFIG_FILE);
    const raw = readFileSync(configPath, 'utf-8');
    expect(raw).toBe(JSON.stringify(config, null, 2) + '\n');
  });

  it('creates canup/ directory if it does not exist', () => {
    const config = validConfig();
    const canupDir = join(tmpRoot, CANUP_DIR);
    expect(existsSync(canupDir)).toBe(false);

    saveProjectConfig(tmpRoot, config);

    expect(existsSync(canupDir)).toBe(true);
  });

  it('overwrites existing config file', () => {
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
  it('returns canupDir + "actions" when config has no actions override', () => {
    const canupDir = '/project/canup';
    const config = validConfig();

    const result = getActionsDir(canupDir, config);

    expect(result).toBe(join(canupDir, DEFAULT_ACTIONS_DIR));
  });

  it('returns canupDir + custom dir when config.actions.dir is set', () => {
    const canupDir = '/project/canup';
    const config = validConfig({ actions: { dir: 'my-actions' } });

    const result = getActionsDir(canupDir, config);

    expect(result).toBe(join(canupDir, 'my-actions'));
  });
});
