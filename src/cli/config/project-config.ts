import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, parse, resolve } from 'node:path';
import { hint } from '../ui/output.js';

/**
 * Project configuration file: canup/canup.json
 *
 * Lives inside the `canup/` folder convention. Created by `canup init`.
 * The canup/ folder is the project's entire footprint, committed to git.
 * Contains only appId + optional overrides -- never secrets.
 */

export const CANUP_DIR = 'canup';
export const CONFIG_FILE = 'canup.json';
export const DEFAULT_ACTIONS_DIR = 'actions';

export interface ProjectConfig {
  appId: string;
  actions?: { dir: string };
}

/**
 * Validate parsed JSON as a {@link ProjectConfig}. Returns the typed config or
 * `null` if the shape is wrong: `appId` must be a non-empty string, and
 * `actions`, when present, must carry a string `dir`. Unknown keys are ignored.
 */
function parseProjectConfig(value: unknown): ProjectConfig | null {
  if (typeof value !== 'object' || value === null) return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.appId !== 'string' || obj.appId.length === 0) return null;

  if (obj.actions === undefined) return { appId: obj.appId };
  if (typeof obj.actions !== 'object' || obj.actions === null) return null;
  const dir = (obj.actions as Record<string, unknown>).dir;
  if (typeof dir !== 'string') return null;
  return { appId: obj.appId, actions: { dir } };
}

export interface LoadedProject {
  config: ProjectConfig;
  projectRoot: string;
  canupDir: string;
}

/**
 * Load canup/canup.json by walking up from process.cwd().
 *
 * Returns { config, projectRoot, canupDir } or null.
 * The projectRoot is the directory containing canup/, and canupDir
 * is the full path to the canup/ directory.
 *
 * If canup/canup.json is NOT found but a legacy root-level canup.json
 * is found, returns null and prints a migration hint.
 */
export function loadProjectConfig(): LoadedProject | null {
  let dir = process.cwd();
  const root = parse(dir).root;
  let legacyFound = false;

  while (true) {
    const canupDir = join(dir, CANUP_DIR);
    const configPath = join(canupDir, CONFIG_FILE);

    if (existsSync(configPath)) {
      try {
        const raw = readFileSync(configPath, 'utf-8');
        const config = parseProjectConfig(JSON.parse(raw) as unknown);
        if (config) {
          return { config, projectRoot: dir, canupDir };
        }
      } catch {
        // Invalid JSON or read error -- continue searching
      }
    }

    // Check for legacy canup.json at this level
    const legacyPath = join(dir, CONFIG_FILE);
    if (!legacyFound && existsSync(legacyPath)) {
      legacyFound = true;
    }

    if (dir === root) break;
    dir = resolve(dir, '..');
  }

  if (legacyFound) {
    hint("Found legacy canup.json. Run 'canup init' to migrate to canup/ folder.");
  }

  return null;
}

/**
 * Save canup.json to {projectRoot}/canup/canup.json.
 *
 * Creates the canup/ directory if it doesn't exist.
 */
export function saveProjectConfig(projectRoot: string, config: ProjectConfig): void {
  const canupDir = join(projectRoot, CANUP_DIR);
  mkdirSync(canupDir, { recursive: true });
  const configPath = join(canupDir, CONFIG_FILE);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Resolve the actions directory path from the canup directory and config.
 *
 * Returns the full path to the actions directory (e.g., /project/canup/actions).
 */
export function getActionsDir(canupDir: string, config: ProjectConfig): string {
  return join(canupDir, config.actions?.dir ?? DEFAULT_ACTIONS_DIR);
}
