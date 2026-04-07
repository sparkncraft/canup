import type { Command } from 'commander';
import { requireProject } from '../config/require-project.js';
import { getActionsDir } from '../config/project-config.js';
import { discoverActions } from '../config/actions-discovery.js';
import { CanupClient } from '../api-client.js';
import { error, hint, dim } from '../ui/output.js';

/**
 * Relative timestamp helper for status dashboard.
 *
 * Converts an ISO date string into a human-friendly relative time
 * like "just now", "2m ago", "1h ago", "3d ago".
 */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Merged action state: combines local file discovery with remote API state.
 */
interface MergedAction {
  name: string;
  language: string;
  deployed: boolean;
  localOnly: boolean;
  updatedAt?: string;
}

function mergeActionState(
  localActions: { name: string; language: string }[],
  remoteActions: { slug: string; language: string; deployed: boolean; updatedAt: string }[],
): MergedAction[] {
  const seen = new Set<string>();
  const result: MergedAction[] = [];

  // Remote actions first (deployed state is authoritative)
  for (const remote of remoteActions) {
    seen.add(remote.slug);
    result.push({
      name: remote.slug,
      language: remote.language === 'python' ? 'Python' : 'Node.js',
      deployed: remote.deployed,
      localOnly: false,
      updatedAt: remote.updatedAt,
    });
  }

  // Local-only actions
  for (const local of localActions) {
    if (!seen.has(local.name)) {
      result.push({
        name: local.name,
        language: local.language === 'python' ? 'Python' : 'Node.js',
        deployed: false,
        localOnly: true,
      });
    }
  }

  return result;
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show project status dashboard')
    .action(async () => {
      try {
        const { config, apiKey, canupDir } = requireProject();
        const actionsDir = getActionsDir(canupDir, config);
        const client = new CanupClient({ token: apiKey });

        // Fetch all remote state in parallel (per research: Promise.all is fine for CLI)
        const [appInfo, remoteActions, secrets, pythonDepsResult, nodejsDepsResult] =
          await Promise.all([
            client.getAppInfo(config.appId),
            client.listActions(config.appId),
            client.listSecrets(config.appId),
            client.listDeps(config.appId, 'python').catch(() => null),
            client.listDeps(config.appId, 'nodejs').catch(() => null),
          ]);

        // Get local actions
        const localActions = discoverActions(actionsDir);

        // Merge action state
        const merged = mergeActionState(localActions, remoteActions);

        // ─── Output ───

        // Header
        console.log();
        console.log(`  ${appInfo.name ?? 'CanUp App'} (${appInfo.canvaAppId})`);
        console.log();

        // Actions section
        if (merged.length > 0) {
          console.log('  Actions:');

          // Calculate column widths for alignment
          const maxName = Math.max(...merged.map((a) => a.name.length));
          const maxLang = Math.max(...merged.map((a) => a.language.length));

          for (const action of merged) {
            const name = action.name.padEnd(maxName + 2);
            const lang = action.language.padEnd(maxLang + 2);

            if (action.deployed) {
              const time = action.updatedAt ? timeAgo(action.updatedAt) : '';
              console.log(`    ${name}${lang}\u2713 deployed   ${dim(time)}`);
            } else {
              console.log(`    ${name}${lang}${dim('\u25CB local only')}`);
            }
          }
        } else {
          console.log('  Actions: none');
          console.log(dim('    Create one with: canup actions new <name>'));
        }

        console.log();

        // Secrets section
        const secretCount = Array.isArray(secrets) ? secrets.length : 0;
        console.log(`  Secrets: ${secretCount > 0 ? `${secretCount} configured` : dim('none')}`);

        // Deps section -- listDeps returns { packages, layerSize, layerArn }, extract packages array
        const pythonPackages = pythonDepsResult?.packages ?? [];
        const nodePackages = nodejsDepsResult?.packages ?? [];
        const pythonCount = pythonPackages.length;
        const nodeCount = nodePackages.length;
        const depParts: string[] = [];
        if (pythonCount > 0)
          depParts.push(`python (${pythonCount} package${pythonCount > 1 ? 's' : ''})`);
        if (nodeCount > 0)
          depParts.push(`nodejs (${nodeCount} package${nodeCount > 1 ? 's' : ''})`);

        if (depParts.length > 0) {
          console.log(`  Deps: ${depParts.join(', ')}`);
        } else {
          console.log(`  Deps: ${dim('none')}`);
        }

        console.log();
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        if (e.statusCode === 401) {
          error('Not authenticated.');
          hint('Run `canup login` to re-authenticate.');
          process.exit(1);
        }
        error(`Status failed: ${e.message}`);
        process.exit(1);
      }
    });
}
