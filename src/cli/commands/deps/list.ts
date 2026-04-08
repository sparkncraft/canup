import type { Command } from 'commander';
import { CanupClient, formatBytes } from '../../api-client.js';
import { requireProject } from '../../config/require-project.js';
import { error, info, label, formatTable } from '../../ui/output.js';

const MAX_LAYER_SIZE_DISPLAY = '250MB';

export function registerDepsListAction(depsCommand: Command): void {
  depsCommand
    .command('list')
    .description('List installed packages')
    .requiredOption('-l, --language <language>', 'Language (python or nodejs)')
    .action(async (options: { language: string }) => {
      const { language } = options;

      if (language !== 'python' && language !== 'nodejs') {
        error(`Invalid language: "${language}". Must be "python" or "nodejs".`);
        process.exit(1);
      }

      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      const result = await client.listDeps(config.appId, language);

      if (result.packages.length === 0) {
        info(`No packages installed for ${language}`);
        return;
      }

      const table = formatTable(
        ['Package', 'Version', 'Added'],
        result.packages.map((pkg) => [pkg.name, pkg.version ?? 'latest', pkg.createdAt]),
      );
      console.log(table);

      if (result.layerSize != null) {
        label('Layer', `${formatBytes(result.layerSize)} / ${MAX_LAYER_SIZE_DISPLAY}`);
      }
    });
}
