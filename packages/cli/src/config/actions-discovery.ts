import { readdirSync, existsSync } from 'node:fs';
import { join, parse, extname } from 'node:path';

/**
 * Action file discovery from the canup/actions/ convention directory.
 *
 * Lists and resolves action source files (.py, .js, .mjs, .ts, .mts)
 * by convention, without requiring explicit configuration.
 */

export interface DiscoveredAction {
  name: string;
  filePath: string;
  language: 'python' | 'nodejs';
}

const ACTION_EXTENSIONS = ['.py', '.js', '.mjs', '.ts', '.mts'] as const;

const SEARCH_ORDER = ['.py', '.js', '.ts', '.mjs', '.mts'] as const;

function languageForExt(ext: string): 'python' | 'nodejs' {
  return ext === '.py' ? 'python' : 'nodejs';
}

/**
 * List all action source files in the given directory.
 *
 * Returns an array of discovered actions with name (filename without ext),
 * full file path, and detected language. If the directory doesn't exist,
 * returns an empty array.
 */
export function discoverActions(actionsDir: string): DiscoveredAction[] {
  if (!existsSync(actionsDir)) return [];

  try {
    const entries = readdirSync(actionsDir, { withFileTypes: true });

    return entries
      .filter(
        (e) =>
          e.isFile() &&
          ACTION_EXTENSIONS.includes(
            extname(e.name).toLowerCase() as (typeof ACTION_EXTENSIONS)[number],
          ),
      )
      .map((e) => {
        const ext = extname(e.name).toLowerCase();
        return {
          name: parse(e.name).name,
          filePath: join(actionsDir, e.name),
          language: languageForExt(ext),
        };
      });
  } catch {
    return [];
  }
}

/**
 * Find a specific action file by name (without extension) in the actions directory.
 *
 * Searches for the name with each supported extension in order:
 * .py, .js, .ts, .mjs, .mts. Returns the first match found, or null.
 */
export function resolveActionByName(actionsDir: string, name: string): DiscoveredAction | null {
  if (!existsSync(actionsDir)) return null;

  for (const ext of SEARCH_ORDER) {
    const filePath = join(actionsDir, `${name}${ext}`);
    if (existsSync(filePath)) {
      return {
        name,
        filePath,
        language: languageForExt(ext),
      };
    }
  }

  return null;
}
