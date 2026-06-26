import type { Command } from 'commander';
import { isCanupError } from '@canup/contracts';
import { requireClient } from '../../config/require-project.js';
import { success, error, info } from '../../ui/output.js';
import { assertLanguage, pollLayerBuild } from './_shared.js';

export function registerDepsRemoveAction(depsCommand: Command): void {
  depsCommand
    .command('remove <packages...>')
    .description('Remove packages')
    .requiredOption('-l, --language <language>', 'Language (python or nodejs)')
    .action(async (packages: string[], options: { language: string }) => {
      const { language } = options;
      assertLanguage(language);

      const { config, client } = requireClient();

      let lastBuildId: string | undefined;

      try {
        for (const packageName of packages) {
          const result = await client.removeDep(config.appId, language, packageName);
          success(`Removed: ${result.deleted}`);
          if (result.status === 'building') {
            lastBuildId = result.buildId;
          }
        }

        // If the last removal triggered a build, poll for completion
        if (lastBuildId) {
          await pollLayerBuild(client, config.appId, language, lastBuildId, {
            progress: 'Rebuilding layer',
            done: 'Layer rebuilt',
          });
        }
      } catch (err) {
        if (isCanupError(err) && err.code === 'PACKAGE_NOT_FOUND') {
          error(`Package not found.`);
        } else {
          error(err instanceof Error ? err.message : String(err));
        }
        if (isCanupError(err) && err.code === 'UNAUTHENTICATED') {
          info('Run `canup init` to re-authenticate.');
        }
        process.exit(1);
      }
    });
}
