import chalk from 'chalk';
import type { Command } from 'commander';
import { CanupClient } from '../../api-client.js';
import { requireProject } from '../../config/require-project.js';
import { error, hint, info, label, dim, formatTable } from '../../ui/output.js';

/**
 * Simple relative time formatting.
 * Returns strings like "2s ago", "5m ago", "3h ago", "2d ago".
 */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

/**
 * Colorize execution status for terminal display.
 */
function colorStatus(status: string): string {
  if (status === 'success') return chalk.green(status);
  if (status === 'error') return chalk.red(status);
  return status;
}

export function registerActionsLogsAction(actionsCommand: Command): void {
  actionsCommand
    .command('logs [slug]')
    .description('View execution history')
    .option('--id <uuid>', 'Show single execution detail')
    .option('--limit <n>', 'Number of results (default: 20)')
    .action(async (slug: string | undefined, options: { id?: string; limit?: string }) => {
      const { config, apiKey } = requireProject();
      const client = new CanupClient({ token: apiKey });

      try {
        if (options.id) {
          // Detail mode
          await showHistoryDetail(client, config.appId, options.id);
        } else {
          // List mode
          const limit = options.limit ? parseInt(options.limit, 10) : undefined;
          await showHistoryList(client, config.appId, slug, limit);
        }
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        if (e.statusCode === 401) {
          error('Not authenticated.');
          hint('Run `canup init` to re-authenticate.');
          process.exit(1);
        }
        if (e.statusCode === 404) {
          error('Execution not found.');
          hint('Run `canup actions logs` to see recent executions.');
          process.exit(1);
        }
        error(e.message);
        process.exit(1);
      }
    });
}

/**
 * Show full detail for a single execution (--id mode).
 */
async function showHistoryDetail(client: CanupClient, appId: string, id: string): Promise<void> {
  const exec = await client.getHistoryDetail(appId, id);

  label('Execution', exec.id);
  label('Action', exec.actionSlug);
  label('Status', colorStatus(exec.status));
  label('Duration', `${exec.durationMs}ms`);
  label('Source', exec.source);
  label('Executed', exec.executedAt);

  if (exec.errorType) {
    label('Error Type', exec.errorType);
  }
  if (exec.errorMessage) {
    label('Error', exec.errorMessage);
  }
  if (exec.stackTrace) {
    console.log('\n' + dim('Stack Trace:'));
    console.log(exec.stackTrace);
  }
  if (exec.printOutput) {
    console.log('\n' + dim('Output:'));
    console.log(exec.printOutput);
  }
}

/**
 * Show execution history list.
 */
async function showHistoryList(
  client: CanupClient,
  appId: string,
  slug?: string,
  limit?: number,
): Promise<void> {
  const executions = await client.listHistory(appId, slug, { limit });

  if (executions.length === 0) {
    info('No executions found.');
    if (slug) {
      hint('Try without a slug filter to see all executions.');
    }
    return;
  }

  const table = formatTable(
    ['ID', 'Action', 'Status', 'Duration', 'Source', 'Time'],
    executions.map((e) => [
      e.id.substring(0, 8),
      e.actionSlug,
      colorStatus(e.status),
      `${e.durationMs}ms`,
      e.source,
      timeAgo(e.executedAt),
    ]),
  );
  console.log(table);
}
