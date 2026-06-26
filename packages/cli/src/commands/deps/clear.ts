import type { Command } from 'commander';
import { requireClient } from '../../config/require-project.js';
import { success, error, info } from '../../ui/output.js';
import { assertLanguage } from './_shared.js';

export function registerDepsClearAction(depsCommand: Command): void {
  depsCommand
    .command('clear')
    .description('Remove all packages and detach layer')
    .requiredOption('-l, --language <language>', 'Language (python or nodejs)')
    .action(async (options: { language: string }) => {
      const { language } = options;
      assertLanguage(language);

      const { config, client } = requireClient();

      try {
        await client.clearDeps(config.appId, language);
        success(`All ${language} packages cleared`);
      } catch (err) {
        const e = err as Error & { httpStatus?: number };
        error(e.message);
        if (e.httpStatus === 401) {
          info('Run `canup init` to re-authenticate.');
        }
        process.exit(1);
      }
    });
}
