import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { Command } from 'commander';
import { requireProject } from '../config/require-project.js';
import { getActionsDir } from '../config/project-config.js';
import { CanupClient } from '../api-client.js';
import { error, hint, info, success, warn } from '../ui/output.js';
import { withSpinner } from '../ui/spinner.js';

/**
 * Map a language identifier to its file extension.
 */
function extensionForLanguage(language: string): string {
  return language === 'python' ? '.py' : '.ts';
}

/**
 * Register the `pull` command.
 *
 * Downloads deployed action scripts from the server to the local
 * canup/actions/ directory. Detects conflicts and supports --force
 * to overwrite differing local files.
 */
export function registerPullCommand(program: Command): void {
  program
    .command('pull [slug]')
    .description('Download deployed action scripts from the server')
    .option('--force', 'Overwrite local files that differ from remote')
    .action(async (slug?: string, opts?: { force?: boolean }) => {
      try {
        const { config, apiKey, canupDir } = requireProject();
        const actionsDir = getActionsDir(canupDir, config);

        // Ensure actions directory exists
        mkdirSync(actionsDir, { recursive: true });

        const client = new CanupClient({ token: apiKey });

        // Fetch remote actions with script content
        const remoteActions = await withSpinner(
          'Fetching actions...',
          () => client.listActionsWithScript(config.appId),
          'Fetched actions',
        );

        // Filter to specific slug if provided
        let actions = remoteActions;
        if (slug) {
          actions = remoteActions.filter((a) => a.slug === slug);
          if (actions.length === 0) {
            error(`Action '${slug}' not found`);
            process.exit(1);
          }
        }

        // Filter to actions with scripts (deployed)
        const deployedActions = actions.filter((a) => a.script !== null);
        if (deployedActions.length === 0) {
          info('No deployed actions to pull');
          return;
        }

        let pulled = 0;
        let upToDate = 0;
        let skipped = 0;

        for (const action of deployedActions) {
          const ext = extensionForLanguage(action.language);
          const filePath = join(actionsDir, `${action.slug}${ext}`);

          if (!existsSync(filePath)) {
            // No local file -- write directly
            writeFileSync(filePath, action.script!);
            info(`Pulled ${action.slug}${ext}`);
            pulled++;
          } else {
            const localContent = readFileSync(filePath, 'utf-8');
            const localHash = createHash('sha256').update(localContent).digest('hex');
            const remoteHash = createHash('sha256').update(action.script!).digest('hex');

            if (localHash === remoteHash) {
              upToDate++;
            } else if (opts?.force) {
              writeFileSync(filePath, action.script!);
              info(`Pulled ${action.slug}${ext} (overwritten)`);
              pulled++;
            } else {
              warn(`${action.slug}${ext} — local file differs (use --force to overwrite)`);
              skipped++;
            }
          }
        }

        // Print summary
        success(
          `Pulled ${pulled} action${pulled !== 1 ? 's' : ''}${upToDate > 0 ? `, ${upToDate} up to date` : ''}${skipped > 0 ? `, ${skipped} skipped` : ''}`,
        );
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        error(e.message);
        if (e.statusCode === 401) {
          hint('Run `canup init` to re-authenticate.');
        }
        process.exit(1);
      }
    });
}
