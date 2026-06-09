import type { Command } from 'commander';
import { parsePackageSpecs, formatBytes } from '../../api-client.js';
import { requireClient } from '../../config/require-project.js';
import { success, error, info, label } from '../../ui/output.js';
import { assertLanguage, pollLayerBuild, MAX_LAYER_SIZE_DISPLAY } from './_shared.js';

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
          if (result.layerSize != null) {
            label('Layer', `${formatBytes(result.layerSize)} / ${MAX_LAYER_SIZE_DISPLAY}`);
          }
          return;
        }

        if (result.buildId) {
          await pollLayerBuild(client, config.appId, language, result.buildId, {
            progress: 'Building layer',
            done: 'Layer built',
          });
          for (const pkg of result.packages) {
            label('Package', `${pkg.name}${pkg.version ? `@${pkg.version}` : ''}`);
          }
          return;
        }

        // No build triggered, no cache -- just show packages
        for (const pkg of result.packages) {
          label('Package', `${pkg.name}${pkg.version ? `@${pkg.version}` : ''}`);
        }
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        error(e.message);
        if (e.statusCode === 401) {
          info('Run `canup init` to re-authenticate.');
        }
        process.exit(1);
      }
    });
}
