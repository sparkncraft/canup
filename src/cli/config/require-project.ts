import { loadProjectConfig, type ProjectConfig } from './project-config.js';
import { loadApiKey } from '../auth/token-store.js';
import { error, hint } from '../ui/output.js';

/**
 * Guard function for commands that require an initialized project.
 *
 * Loads canup/canup.json and the stored API key. If either is missing,
 * prints a helpful error message and exits.
 *
 * Returns the project config, API key, projectRoot, and canupDir on success.
 */
export function requireProject(): {
  config: ProjectConfig;
  apiKey: string;
  projectRoot: string;
  canupDir: string;
} {
  const project = loadProjectConfig();

  if (!project) {
    error('No CanUp project found.');
    hint('Run `canup init` to link this directory to a Canva App.');
    process.exit(1);
  }

  const { config, projectRoot, canupDir } = project;

  const apiKey = loadApiKey(config.appId);

  if (!apiKey) {
    error('No API key found for this project.');
    hint('Run `canup init` to set up authentication.');
    process.exit(1);
  }

  return { config, apiKey, projectRoot, canupDir };
}
