import type { Command } from 'commander';
import { CanupClient } from '../../api-client.js';
import { requireProject } from '../../config/require-project.js';
import { success, error, info } from '../../ui/output.js';

export function registerDepsClearAction(depsCommand: Command): void {
  depsCommand
    .command('clear')
    .description('Remove all packages and detach layer')
    .requiredOption('-l, --language <language>', 'Language (python or nodejs)')
    .action(async (options: { language: string }) => {
      const { language } = options;

      if (language !== 'python' && language !== 'nodejs') {
        error(`Invalid language: "${language}". Must be "python" or "nodejs".`);
        process.exit(1);
      }

      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      try {
        await client.clearDeps(config.appId, language);
        success(`All ${language} packages cleared`);
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
