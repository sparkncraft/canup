import type { Command } from 'commander';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { join } from 'node:path';
import { select, Separator } from '@inquirer/prompts';
import { loadToken } from '../auth/token-store.js';
import { saveApiKey } from '../auth/token-store.js';
import { performLogin } from '../auth/perform-login.js';
import { CanupClient } from '../api-client.js';
import {
  loadProjectConfig,
  saveProjectConfig,
  CANUP_DIR,
  DEFAULT_ACTIONS_DIR,
} from '../config/project-config.js';
import { success, error, hint, info, label } from '../ui/output.js';

/**
 * Detect CANVA_APP_ID from a .env file in the current directory.
 *
 * Returns the value if found, or null otherwise.
 */
function detectCanvaAppId(): string | null {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return null;
  try {
    const content = readFileSync(envPath, 'utf-8');
    const match = /^CANVA_APP_ID\s*=\s*["']?([^\s"']+)["']?/m.exec(content);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Register the `init` command.
 *
 * Creates the canup/ folder structure, auto-triggers login when needed,
 * detects CANVA_APP_ID from .env, shows an app picker for existing apps,
 * and links the directory to a Canva App.
 */
export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize a Canup project in this directory')
    .option('--app-id <id>', 'Canva App ID (skip interactive prompt)')
    .action(async (opts: { appId?: string }) => {
      try {
        // a. Check if already initialized
        const existing = loadProjectConfig();
        if (existing) {
          info('Project already initialized.');
          label('App ID', existing.config.appId);
          label('Config', join(existing.canupDir, 'canup.json'));
          return;
        }

        // b. Auto-login: check for session token, trigger login if missing
        let token = loadToken();
        if (!token) {
          info('Not logged in. Starting login...');
          token = await performLogin();
          info('Login successful!');
        }

        const client = new CanupClient({ token });

        // c. Determine the app to link: --app-id flag, .env detection, app picker, or create new
        let appId: string | undefined;
        let isExistingApp = false;

        if (opts.appId) {
          // Fast path: --app-id flag provided, register directly
          const app = await client.registerApp(opts.appId);
          appId = app.id;
        } else {
          // Try detecting from .env
          const detected = detectCanvaAppId();
          if (detected) {
            info(`Detected Canva App ID from .env: ${detected}`);
            const app = await client.registerApp(detected);
            appId = app.id;
          } else {
            // No --app-id, no .env -- try app picker
            const existingApps = await client.listApps();

            if (existingApps.length > 0) {
              // Show interactive app picker
              const appChoice = await select({
                message: 'Select an app',
                choices: [
                  ...existingApps.map((app) => ({
                    name: `${app.name} (${app.canvaAppId})`,
                    value: app.id,
                  })),
                  new Separator(),
                  { name: 'Create a new app', value: '__new__' },
                ],
              });

              if (appChoice !== '__new__') {
                // User selected an existing app
                appId = appChoice;
                isExistingApp = true;
              }
            }

            // If no apps exist or user chose "Create a new app", prompt for Canva App ID
            if (!appId) {
              const rl = createInterface({ input: process.stdin, output: process.stderr });
              let canvaAppId: string;
              try {
                canvaAppId = await rl.question('Enter your Canva App ID: ');
              } finally {
                rl.close();
              }

              if (!canvaAppId.trim()) {
                error('Canva App ID is required.');
                process.exit(1);
              }
              canvaAppId = canvaAppId.trim();

              const app = await client.registerApp(canvaAppId);
              appId = app.id;
            }
          }
        }

        // d. Create API key
        const { key: fullKey, prefix } = await client.createApiKey(appId, 'canup-cli');

        // e. Store API key
        saveApiKey(appId, fullKey);

        // f. Create canup/ folder structure with actions/ subdirectory
        mkdirSync(join(process.cwd(), CANUP_DIR, DEFAULT_ACTIONS_DIR), { recursive: true });

        // g. Save project config (only appId -- no canvaAppId in new convention)
        saveProjectConfig(process.cwd(), { appId });

        // h. Output
        success('Project initialized');
        label('App ID', appId);
        label('Config', join(CANUP_DIR, 'canup.json'));
        label('API Key', `${prefix}...`);
        hint('Add the canup/ folder to your git repository.');

        // i. If joining existing app, check for deployed actions and suggest pull
        if (isExistingApp) {
          const appActions = await client.listActions(appId);
          const deployedCount = appActions.filter((a) => a.deployed).length;
          if (deployedCount > 0) {
            hint(
              `This app has ${deployedCount} deployed action${deployedCount > 1 ? 's' : ''}. Run \`canup pull\` to download them.`,
            );
          }
        }
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        const message = err instanceof Error ? err.message : String(err);

        if (statusCode === 401) {
          error('Session expired.');
          hint('Run `canup login` to re-authenticate.');
          process.exit(1);
        }

        if (statusCode === 409) {
          error('This Canva App ID is already registered by another user.');
          process.exit(1);
        }

        error(`Init failed: ${message}`);
        process.exit(1);
      }
    });
}
