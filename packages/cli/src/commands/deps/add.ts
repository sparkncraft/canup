import type { Command } from 'commander';
import { isCanupError } from '@canup/contracts';
import { requireClient } from '../../config/require-project.js';
import { success, error, info, label } from '../../ui/output.js';
import {
  assertLanguage,
  pollLayerBuild,
  parsePackageSpecs,
  formatBytes,
  MAX_LAYER_SIZE_DISPLAY,
} from './_shared.js';

export function registerDepsAddAction(depsCommand: Command): void {
  depsCommand
    .command('add <packages...>')
    .description('Add packages and build layer')
    .requiredOption('-l, --language <language>', 'Language (python or nodejs)')
    .action(async (packages: string[], options: { language: string }) => {
      const { language } = options;
      assertLanguage(language);

      const { config, client } = requireClient();

      const parsedPackages = parsePackageSpecs(packages, language);

      try {
        const result = await client.addDeps(config.appId, language, parsedPackages);

        if (result.cached) {
          success('All packages already installed');
          for (const pkg of result.packages) {
            label('Package', `${pkg.name}${pkg.version ? `@${pkg.version}` : ''}`);
          }
          label('Layer', `${formatBytes(result.layerSize)} / ${MAX_LAYER_SIZE_DISPLAY}`);
          return;
        }

        // Not cached: a build was kicked off — poll it, then list the packages.
        await pollLayerBuild(client, config.appId, language, result.buildId, {
          progress: 'Building layer',
          done: 'Layer built',
        });
        for (const pkg of result.packages) {
          label('Package', `${pkg.name}${pkg.version ? `@${pkg.version}` : ''}`);
        }
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        if (isCanupError(err) && err.code === 'UNAUTHENTICATED') {
          info('Run `canup init` to re-authenticate.');
        }
        process.exit(1);
      }
    });
}
