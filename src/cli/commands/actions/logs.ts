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

/** Number of leading hex chars shown for an execution id in the logs table. */
const LOG_ID_DISPLAY_PREFIX_LENGTH = 8;

export function registerActionsLogsAction(actionsCommand: Command): void {
  actionsCommand
    .command('logs [slug]')
    .description('View execution history')
    .option('--id <uuid>', 'Show single execution detail')
    .option('--limit <n>', 'Number of results (default: 20)')
    .option('--search <term>', 'Filter logs by text search')
    .action(
      async (
        slug: string | undefined,
        options: { id?: string; limit?: string; search?: string },
      ) => {
        const { config, apiKey } = requireProject();
        const client = new CanupClient({ token: apiKey });

        try {
          if (options.id) {
            // Detail mode
            await showLogDetail(client, options.id);
          } else {
            // List mode
            const limit = options.limit ? parseInt(options.limit, 10) : undefined;
            await showLogsList(client, config.appId, slug, limit, options.search);
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
      },
    );
}

/**
 * Show full detail for a single log entry (--id mode).
 */
async function showLogDetail(client: CanupClient, id: string): Promise<void> {
  const entry = await client.getLogDetail(id);

  label('Execution', entry.id);
  label('Action', entry.actionSlug);
  label('Status', colorStatus(entry.status));
  label('Duration', `${entry.durationMs}ms`);
  label('Source', entry.source);
  label('Timestamp', entry.timestamp);

  if (entry.errorType) {
    label('Error Type', entry.errorType);
  }
  if (entry.detail?.errorMessage) {
    label('Error', entry.detail.errorMessage);
  }
  if (entry.detail?.stackTrace) {
    console.log('\n' + dim('Stack Trace:'));
    console.log(entry.detail.stackTrace);
  }
  if (entry.detail?.printOutput) {
    console.log('\n' + dim('Output:'));
    console.log(entry.detail.printOutput);
  }
}

/**
 * Show invocation log list.
 */
async function showLogsList(
  client: CanupClient,
  appId: string,
  slug?: string,
  limit?: number,
  search?: string,
): Promise<void> {
  const result = await client.listLogs(appId, slug, { limit, search });

  if (result.items.length === 0) {
    info('No executions found.');
    if (slug) {
      hint('Try without a slug filter to see all executions.');
    }
    return;
  }

  const table = formatTable(
    ['ID', 'Action', 'Status', 'Duration', 'Source', 'Time'],
    result.items.map((e) => [
      e.id.substring(0, LOG_ID_DISPLAY_PREFIX_LENGTH),
      e.actionSlug,
      colorStatus(e.status),
      `${e.durationMs}ms`,
      e.source,
      timeAgo(e.timestamp),
    ]),
  );
  console.log(table);
}
