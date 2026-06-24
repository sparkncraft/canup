import type { Command } from 'commander';
import { requireClient } from '../../config/require-project.js';
import { info, label, formatTable } from '../../ui/output.js';
import { assertLanguage, formatBytes, MAX_LAYER_SIZE_DISPLAY } from './_shared.js';

export function registerDepsListAction(depsCommand: Command): void {
  depsCommand
    .command('list')
    .description('List installed packages')
    .requiredOption('-l, --language <language>', 'Language (python or nodejs)')
    .action(async (options: { language: string }) => {
      const { language } = options;
      assertLanguage(language);

      const { config, client } = requireClient();

      const result = await client.listDeps(config.appId, language);

      if (result.packages.length === 0) {
        info(`No packages installed for ${language}`);
        return;
      }

      const table = formatTable(
        ['Package', 'Version'],
        result.packages.map((pkg) => [pkg.name, pkg.version ?? 'latest']),
      );
      console.log(table);

      if (result.layerSize != null) {
        label('Layer', `${formatBytes(result.layerSize)} / ${MAX_LAYER_SIZE_DISPLAY}`);
      }
    });
}
