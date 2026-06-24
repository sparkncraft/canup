import type { Command } from 'commander';
import { requireClient } from '../../config/require-project.js';
import { error, hint } from '../../ui/output.js';
import { withSpinner } from '../../ui/spinner.js';
import { parseParams, displayTestResult } from './_shared.js';

export function registerActionsRunAction(actionsCommand: Command): void {
  actionsCommand
    .command('run <name>')
    .description('Run a deployed action')
    .option('--params <json>', 'Parameters as JSON string or path to JSON file')
    .action(async (name: string, opts: { params?: string }) => {
      try {
        const { config, client } = requireClient();
        const params = parseParams(opts.params);

        // Fetch the deployed action's code, then invoke it through the app's
        // test endpoint. Actions without deployed code (e.g. track-only) carry
        // no script and cannot be executed from the CLI.
        const actions = await client.listActionsWithScript(config.appId);
        const action = actions.find((a) => a.slug === name);

        if (!action) {
          error(`Action not found: ${name}`);
          hint('Deploy the action first with `canup actions deploy`.');
          process.exit(1);
          return;
        }

        if (action.script == null || action.language === null) {
          error(`Action '${name}' has no deployed code to run.`);
          hint('Deploy code for this action with `canup actions deploy`.');
          process.exit(1);
          return;
        }

        const code = action.script;
        const language = action.language === 'python' ? 'python' : 'nodejs';

        const result = await withSpinner(
          `Running ${name}...`,
          () => client.testCode(config.appId, code, language, params),
          'Run complete',
        );

        displayTestResult(result, { success: 'Run succeeded', failure: 'Run failed' });
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        const message = err instanceof Error ? err.message : String(err);

        if (statusCode === 401) {
          error('Not authenticated.');
          hint('Run `canup login` to re-authenticate.');
          process.exit(1);
        }

        if (statusCode === 404) {
          error(`Action not found: ${name}`);
          hint('Deploy the action first with `canup actions deploy`.');
          process.exit(1);
        }

        error(`Run failed: ${message}`);
        process.exit(1);
      }
    });
}
