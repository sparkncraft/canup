import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { CanupClient, type TestResult } from '../../api-client.js';
import { requireProject } from '../../config/require-project.js';
import { success, error, hint, dim } from '../../ui/output.js';
import { withSpinner } from '../../ui/spinner.js';

/**
 * Parse --params option: inline JSON string, file path to JSON, or empty object.
 */
function parseParams(paramsArg?: string): unknown {
  if (!paramsArg) return {};

  const trimmed = paramsArg.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      error('Invalid --params: failed to parse JSON string.');
      process.exit(1);
    }
  }

  // Try as file path
  const filePath = resolve(trimmed);
  if (existsSync(filePath)) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      error(`Invalid --params: failed to parse JSON from file ${trimmed}`);
      process.exit(1);
    }
  }

  error('Invalid --params: must be a JSON string or path to a JSON file.');
  process.exit(1);
}

/**
 * Format milliseconds into a human-readable duration string.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Display run result (same envelope as test -- TestResult).
 */
function displayRunResult(result: TestResult): void {
  if (result.ok) {
    if (result.data.printOutput) {
      console.log(dim('Output:'));
      console.log(result.data.printOutput);
    }

    success('Run succeeded');
    if (result.data.result !== undefined && result.data.result !== null) {
      console.log(
        `Returned: ${JSON.stringify(result.data.result, null, 2)} ${dim(`(${formatDuration(result.data.durationMs)})`)}`,
      );
    } else {
      console.log(dim(`(${formatDuration(result.data.durationMs)})`));
    }
  } else {
    if (result.error.printOutput) {
      console.log(dim('Output:'));
      console.log(result.error.printOutput);
    }

    error(`Run failed: ${result.error.type}: ${result.error.message}`);
    if (result.error.stackTrace) {
      console.error(dim(result.error.stackTrace));
    }
    process.exit(1);
  }
}

export function registerActionsRunAction(actionsCommand: Command): void {
  actionsCommand
    .command('run <name>')
    .description('Run a deployed action')
    .option('--params <json>', 'Parameters as JSON string or path to JSON file')
    .action(async (name: string, opts: { params?: string }) => {
      try {
        const { config, apiKey } = requireProject();
        const client = new CanupClient({ token: apiKey });
        const params = parseParams(opts.params);

        // Fetch the deployed action's code, then invoke it through the app's
        // test endpoint. Actions without deployed code (e.g. track-only) have
        // a null script and cannot be executed from the CLI.
        const actions = await client.listActionsWithScript(config.appId);
        const action = actions.find((a) => a.slug === name);

        if (!action) {
          error(`Action not found: ${name}`);
          hint('Deploy the action first with `canup actions deploy`.');
          process.exit(1);
          return;
        }

        if (action.script === null || action.language === null) {
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

        displayRunResult(result);
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
