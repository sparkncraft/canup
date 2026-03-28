import type { Command } from 'commander';
import { CanupClient, parsePackageSpecs, formatBytes } from '../../api-client.js';
import { requireProject } from '../../config/require-project.js';
import { success, error, info, label } from '../../ui/output.js';
import { createSpinner } from '../../ui/spinner.js';

export function registerDepsAddAction(depsCommand: Command): void {
  depsCommand
    .command('add <packages...>')
    .description('Add packages and build layer')
    .requiredOption('-l, --language <language>', 'Language (python or nodejs)')
    .action(async (packages: string[], options: { language: string }) => {
      const { language } = options;

      if (language !== 'python' && language !== 'nodejs') {
        error(`Invalid language: "${language}". Must be "python" or "nodejs".`);
        process.exit(1);
      }

      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      const parsedPackages = parsePackageSpecs(packages, language);

      try {
        const result = await client.addDeps(config.appId, language, parsedPackages);

        if (result.cached) {
          success('All packages already installed');
          for (const pkg of result.packages) {
            label('Package', `${pkg.name}${pkg.version ? `@${pkg.version}` : ''}`);
          }
          if (result.layerSize != null) {
            label('Layer', `${formatBytes(result.layerSize)} / 250MB`);
          }
          return;
        }

        if (result.buildId) {
          const spin = createSpinner('Building layer...');
          const startTime = Date.now();

          while (true) {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const build = await client.getBuildStatus(config.appId, language, result.buildId);

            if (build.status === 'success') {
              const sizeLabel = build.sizeBytes != null ? formatBytes(build.sizeBytes) : '?';
              spin.succeed(`Layer built (${sizeLabel} / 250MB)`);
              for (const pkg of result.packages) {
                label('Package', `${pkg.name}${pkg.version ? `@${pkg.version}` : ''}`);
              }
              return;
            }

            if (build.status === 'failed') {
              spin.fail(`Build failed: ${build.errorMessage ?? 'Unknown error'}`);
              process.exit(1);
            }

            // Still building -- update spinner with elapsed time
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
            spin.update(`Building layer... (${elapsed}s)`);
          }
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
