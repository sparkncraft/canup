import type { Command } from 'commander';
import { CanupClient, formatBytes } from '../../api-client.js';
import { requireProject } from '../../config/require-project.js';
import { success, error, info } from '../../ui/output.js';
import { createSpinner } from '../../ui/spinner.js';

const BUILD_POLL_INTERVAL_MS = 2000;
const MAX_LAYER_SIZE_DISPLAY = '250MB';

export function registerDepsRemoveAction(depsCommand: Command): void {
  depsCommand
    .command('remove <packages...>')
    .description('Remove packages')
    .requiredOption('-l, --language <language>', 'Language (python or nodejs)')
    .action(async (packages: string[], options: { language: string }) => {
      const { language } = options;

      if (language !== 'python' && language !== 'nodejs') {
        error(`Invalid language: "${language}". Must be "python" or "nodejs".`);
        process.exit(1);
      }

      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      let lastBuildId: string | undefined;

      try {
        for (const packageName of packages) {
          const result = await client.removeDep(config.appId, language, packageName);
          success(`Removed: ${result.deleted}`);
          if (result.buildId) {
            lastBuildId = result.buildId;
          }
        }

        // If the last removal triggered a build, poll for completion
        if (lastBuildId) {
          const spin = createSpinner('Rebuilding layer...');
          const startTime = Date.now();

          while (true) {
            await new Promise((resolve) => setTimeout(resolve, BUILD_POLL_INTERVAL_MS));

            const build = await client.getBuildStatus(config.appId, language, lastBuildId);

            if (build.status === 'success') {
              const sizeLabel = build.sizeBytes != null ? formatBytes(build.sizeBytes) : '?';
              spin.succeed(`Layer rebuilt (${sizeLabel} / ${MAX_LAYER_SIZE_DISPLAY})`);
              return;
            }

            if (build.status === 'failed') {
              spin.fail(`Build failed: ${build.errorMessage ?? 'Unknown error'}`);
              process.exit(1);
            }

            // Still building -- update spinner with elapsed time
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
            spin.update(`Rebuilding layer... (${elapsed}s)`);
          }
        }
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        if (e.statusCode === 404) {
          error(`Package not found.`);
        } else {
          error(e.message);
        }
        if (e.statusCode === 401) {
          info('Run `canup init` to re-authenticate.');
        }
        process.exit(1);
      }
    });
}
