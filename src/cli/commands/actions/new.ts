import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Command } from 'commander';
import { z } from 'zod';
import { requireProject } from '../../config/require-project.js';
import { getActionsDir } from '../../config/project-config.js';
import { success, error, hint, label } from '../../ui/output.js';

const ACTION_SLUG_MIN_LENGTH = 2;
const ACTION_SLUG_MAX_LENGTH = 64;

const actionSlugSchema = z
  .string()
  .min(ACTION_SLUG_MIN_LENGTH, `Action name must be at least ${ACTION_SLUG_MIN_LENGTH} characters`)
  .max(ACTION_SLUG_MAX_LENGTH, `Action name must be at most ${ACTION_SLUG_MAX_LENGTH} characters`)
  .regex(
    /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/,
    'Action name must contain only lowercase letters, numbers, and hyphens, and must start and end with a letter or number',
  );

const PYTHON_TEMPLATE = (name: string) => `def handler(params, context):
    """
    Process request from Canva App.

    Args:
        params: JSON data from your app
        context: Platform context (user_id, brand_id, app_id, invocation_id)

    Returns:
        Any JSON-serializable value
    """
    return {"message": "Hello from ${name}!"}
`;

const NODEJS_TEMPLATE = (name: string) => `export async function handler(params, context) {
  /**
   * Process request from Canva App.
   *
   * @param {Object} params - JSON data from your app
   * @param {Object} context - Platform context (user_id, brand_id, app_id, invocation_id)
   * @returns {any} JSON-serializable value
   */
  return { message: "Hello from ${name}!" };
}
`;

export function registerActionsNewAction(actionsCommand: Command): void {
  actionsCommand
    .command('new <name>')
    .description('Scaffold a new action template')
    .option('--lang <language>', 'Template language', 'nodejs')
    .action((name: string, opts: { lang: string }) => {
      const slugResult = actionSlugSchema.safeParse(name);
      if (!slugResult.success) {
        error(`Invalid action name: ${name}`);
        hint(
          'Name must be 2-64 chars, lowercase letters, numbers, and hyphens. Must start and end with a letter or number.',
        );
        process.exit(1);
      }

      const validLangs = ['python', 'nodejs'];
      if (!validLangs.includes(opts.lang)) {
        error(`Invalid language: ${opts.lang}`);
        hint('Supported languages: python, nodejs');
        process.exit(1);
      }

      const { canupDir, config } = requireProject();
      const actionsDir = getActionsDir(canupDir, config);

      mkdirSync(actionsDir, { recursive: true });

      const extension = opts.lang === 'python' ? '.py' : '.js';
      const filePath = join(actionsDir, name + extension);

      if (existsSync(filePath)) {
        error(`Action file already exists: ${filePath}`);
        hint('Edit it directly or choose a different name.');
        process.exit(1);
      }

      const template = opts.lang === 'python' ? PYTHON_TEMPLATE(name) : NODEJS_TEMPLATE(name);
      writeFileSync(filePath, template);

      success(`Created ${name}`);
      label('File', filePath);
      hint(`Edit the handler, then run: canup actions test ${name}`);
    });
}
