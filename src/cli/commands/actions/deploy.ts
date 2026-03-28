import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Command } from 'commander';
import { requireProject } from '../../config/require-project.js';
import { getActionsDir } from '../../config/project-config.js';
import { discoverActions, resolveActionByName } from '../../config/actions-discovery.js';
import { CanupClient } from '../../api-client.js';
import { error, hint, label, success, info } from '../../ui/output.js';
import { withSpinner } from '../../ui/spinner.js';

/**
 * Compute SHA-256 content hash for skip-unchanged comparison.
 */
function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Detect if an argument looks like a legacy file path (contains / or \ or has a file extension).
 */
function isLegacyFilePath(arg: string): boolean {
  return arg.includes('/') || arg.includes('\\') || /\.\w+$/.test(arg);
}

/**
 * Deploy a single action by name from the convention directory.
 */
async function deploySingle(
  name: string,
  actionsDir: string,
  appId: string,
  client: CanupClient,
  remoteActions: Map<string, string | null>,
): Promise<void> {
  const action = resolveActionByName(actionsDir, name);
  if (!action) {
    error(`Action not found in ${actionsDir}: ${name}`);
    hint('Available extensions: .py, .js, .ts, .mjs, .mts');
    hint('Create one with: canup actions new ' + name);
    process.exit(1);
  }

  const code = readFileSync(action.filePath, 'utf-8');
  const localHash = computeHash(code);
  const remoteHash = remoteActions.get(action.name);

  if (remoteHash === localHash) {
    info(`${action.name} — unchanged, skipping`);
    return;
  }

  const result = await withSpinner(
    `Deploying ${action.name}...`,
    () => client.deployAction(appId, action.name, code, action.language),
    `Deployed ${action.name}`,
  );

  label('Action', action.name);
  label('Language', action.language);
  if (!result.lambdaReady) {
    hint('Lambda is being provisioned. First execution may take longer.');
  }
}

/**
 * Deploy all actions found in the convention directory.
 * Skips unchanged files via content hash comparison with remote.
 */
async function deployAll(
  actionsDir: string,
  appId: string,
  client: CanupClient,
  remoteActions: Map<string, string | null>,
): Promise<void> {
  const localActions = discoverActions(actionsDir);

  if (localActions.length === 0) {
    error('No action files found in ' + actionsDir);
    hint('Create one with: canup actions new <name>');
    process.exit(1);
  }

  let deployed = 0;
  let skipped = 0;

  for (const action of localActions) {
    const code = readFileSync(action.filePath, 'utf-8');
    const localHash = computeHash(code);
    const remoteHash = remoteActions.get(action.name);

    if (remoteHash === localHash) {
      info(`${action.name} — unchanged, skipping`);
      skipped++;
      continue;
    }

    await withSpinner(
      `Deploying ${action.name}...`,
      () => client.deployAction(appId, action.name, code, action.language),
      `Deployed ${action.name}`,
    );
    deployed++;
  }

  // Summary
  if (deployed > 0) {
    success(
      `Deployed ${deployed} action${deployed > 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} unchanged` : ''}`,
    );
  } else {
    info(`All ${skipped} action${skipped > 1 ? 's' : ''} unchanged`);
  }
}

export function registerActionsDeployAction(actionsCommand: Command): void {
  actionsCommand
    .command('deploy [name]')
    .description('Deploy action(s) to production (no args = deploy all)')
    .action(async (name?: string) => {
      try {
        const { config, apiKey, canupDir } = requireProject();
        const actionsDir = getActionsDir(canupDir, config);
        const client = new CanupClient({ token: apiKey });

        // Fetch remote actions with content hashes for skip-unchanged
        const remoteList = await client.listActions(config.appId);
        const remoteActions = new Map(remoteList.map((a) => [a.slug, a.contentHash]));

        if (name) {
          // Legacy file path detection
          if (isLegacyFilePath(name)) {
            hint(
              `Tip: Use action names instead of file paths: canup actions deploy ${name.replace(/\.\w+$/, '').replace(/.*\//, '')}`,
            );
            hint('Actions are now resolved from canup/actions/ by convention.');
            // Extract bare name and try convention lookup
            const bareName = name.replace(/\.\w+$/, '').replace(/.*[\\/]/, '');
            await deploySingle(bareName, actionsDir, config.appId, client, remoteActions);
          } else {
            await deploySingle(name, actionsDir, config.appId, client, remoteActions);
          }
        } else {
          await deployAll(actionsDir, config.appId, client, remoteActions);
        }
      } catch (err) {
        const e = err as Error & { statusCode?: number };
        error(e.message);
        if (e.statusCode === 401) {
          hint('Run `canup init` to re-authenticate.');
        }
        process.exit(1);
      }
    });
}
