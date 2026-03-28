import type { Command } from 'commander';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, parse as pathParse, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { requireProject } from '../../config/require-project.js';
import { getActionsDir, type ProjectConfig } from '../../config/project-config.js';
import { resolveActionByName } from '../../config/actions-discovery.js';
import { CanupClient, type TestResult } from '../../api-client.js';
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
 * Detect language from file extension.
 */
function detectLanguage(filePath: string): 'python' | 'nodejs-js' | 'nodejs-ts' {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.py':
      return 'python';
    case '.js':
    case '.mjs':
      return 'nodejs-js';
    case '.ts':
    case '.mts':
      return 'nodejs-ts';
    default:
      error(`Unsupported file extension: ${ext}`);
      hint('Supported extensions: .py, .js, .mjs, .ts, .mts');
      process.exit(1);
  }
}

/**
 * Resolve an action file from the argument.
 *
 * Resolution order:
 * 1. Explicit file path with recognized extension -- use directly
 * 2. Contains path separator -- treat as file path
 * 3. Bare name -- try convention directory (canup/actions/) first
 * 4. Fallback -- search cwd for matching extensions (legacy behavior)
 */
function resolveActionFile(action: string, canupDir?: string, config?: ProjectConfig): string {
  const ext = extname(action).toLowerCase();

  // Case 1: Explicit file path with extension -- use directly
  if (['.py', '.js', '.mjs', '.ts', '.mts'].includes(ext)) {
    const resolved = resolve(action);
    if (!existsSync(resolved)) {
      error(`Action file not found: ${action}`);
      process.exit(1);
    }
    return resolved;
  }

  // Case 2: Contains path separator -- treat as file path
  if (action.includes('/') || action.includes('\\')) {
    const resolved = resolve(action);
    if (!existsSync(resolved)) {
      error(`Action file not found: ${action}`);
      process.exit(1);
    }
    return resolved;
  }

  // Case 3: Bare name -- try convention directory first
  if (canupDir && config) {
    const actionsDir = getActionsDir(canupDir, config);
    const found = resolveActionByName(actionsDir, action);
    if (found) return found.filePath;
  }

  // Case 4: Fallback -- search cwd for matching extensions (legacy behavior)
  const candidates = ['.py', '.js', '.ts', '.mjs', '.mts'];
  for (const candidate of candidates) {
    const resolved = resolve(`${action}${candidate}`);
    if (existsSync(resolved)) {
      return resolved;
    }
  }

  error(`Action not found: ${action}`);
  hint('Check the name or create one with: canup actions new ' + action);
  process.exit(1);
}

/** Local test result shape (extracted from subprocess __CANUP_RESULT__ marker) */
interface LocalTestResult {
  ok: boolean;
  data?: unknown;
  error?: { type: string; message: string; stack_trace?: string };
  duration_ms: number;
}

/**
 * Generate a Python wrapper script that imports and calls the handler.
 */
function buildPythonWrapper(
  scriptDir: string,
  moduleName: string,
  context: Record<string, unknown>,
  params: unknown,
): string {
  return `import json, sys, time, traceback
sys.path.insert(0, ${JSON.stringify(scriptDir)})
from ${moduleName} import handler
context = json.loads(${JSON.stringify(JSON.stringify(context))})
params = json.loads(${JSON.stringify(JSON.stringify(params))})
start = time.time()
try:
    result = handler(params, context)
    duration = round((time.time() - start) * 1000)
    print("\\n__CANUP_RESULT__" + json.dumps({"ok": True, "data": result, "duration_ms": duration}))
except Exception as e:
    duration = round((time.time() - start) * 1000)
    print("\\n__CANUP_RESULT__" + json.dumps({"ok": False, "error": {"type": type(e).__name__, "message": str(e), "stack_trace": traceback.format_exc()}, "duration_ms": duration}), file=sys.stderr)
    sys.exit(1)
`;
}

/**
 * Generate a Node.js wrapper script that imports and calls the handler.
 */
function buildNodeWrapper(
  absoluteScriptPath: string,
  context: Record<string, unknown>,
  params: unknown,
): string {
  return `const { performance } = await import('node:perf_hooks');
const scriptPath = ${JSON.stringify(absoluteScriptPath)};
const context = JSON.parse(${JSON.stringify(JSON.stringify(context))});
const params = JSON.parse(${JSON.stringify(JSON.stringify(params))});
const mod = await import(scriptPath);
const handler = mod.handler || mod.default;
if (typeof handler !== 'function') {
  console.error('__CANUP_RESULT__' + JSON.stringify({ ok: false, error: { type: 'ImportError', message: 'No handler or default export found' }, duration_ms: 0 }));
  process.exit(1);
}
const start = performance.now();
try {
  const result = await handler(params, context);
  const duration = Math.round(performance.now() - start);
  console.log('\\n__CANUP_RESULT__' + JSON.stringify({ ok: true, data: result, duration_ms: duration }));
} catch (e) {
  const duration = Math.round(performance.now() - start);
  console.error('\\n__CANUP_RESULT__' + JSON.stringify({ ok: false, error: { type: e.constructor.name, message: e.message, stack_trace: e.stack }, duration_ms: duration }));
  process.exit(1);
}
`;
}

/**
 * Run local test via subprocess.
 *
 * Generates a temp wrapper script, spawns the correct runtime,
 * streams stdout/stderr live, and extracts the __CANUP_RESULT__ marker.
 *
 * Local test never touches the API -- purely subprocess.
 */
async function runLocalTest(
  scriptPath: string,
  language: 'python' | 'nodejs-js' | 'nodejs-ts',
  params: unknown,
  context: Record<string, unknown>,
): Promise<void> {
  const timestamp = Date.now();
  const scriptDir = resolve(scriptPath, '..');
  let wrapperPath: string;
  let command: string;
  let args: string[];

  if (language === 'python') {
    const moduleName = pathParse(scriptPath).name;
    const wrapper = buildPythonWrapper(scriptDir, moduleName, context, params);
    wrapperPath = resolve(tmpdir(), `canup-test-${timestamp}.py`);
    writeFileSync(wrapperPath, wrapper);
    command = 'python3';
    args = [wrapperPath];
  } else {
    const wrapper = buildNodeWrapper(scriptPath, context, params);
    wrapperPath = resolve(tmpdir(), `canup-test-${timestamp}.mjs`);
    writeFileSync(wrapperPath, wrapper);
    // Resolve tsx binary directly — npx may download tsx into a temp HOME
    // and corrupt subprocess output with npm warnings
    const require = createRequire(import.meta.url);
    const tsxCliPath = require.resolve('tsx/cli');
    command = process.execPath;
    args = [tsxCliPath, wrapperPath];
  }

  try {
    const result = await new Promise<LocalTestResult>((resolvePromise, reject) => {
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: scriptDir,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stdout += text;
        // Stream non-result lines to terminal in real time
        const lines = text.split('\n');
        for (const line of lines) {
          if (line && !line.includes('__CANUP_RESULT__')) {
            process.stdout.write(line + '\n');
          }
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        stderr += text;
        // Stream non-result lines to terminal in real time
        const lines = text.split('\n');
        for (const line of lines) {
          if (line && !line.includes('__CANUP_RESULT__')) {
            process.stderr.write(line + '\n');
          }
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to start ${command}: ${err.message}`));
      });

      child.on('close', () => {
        // Extract __CANUP_RESULT__ from stdout or stderr
        const combined = stdout + stderr;
        const marker = '__CANUP_RESULT__';
        const markerIdx = combined.lastIndexOf(marker);

        if (markerIdx === -1) {
          reject(new Error('No test result received. Action may have crashed before returning.'));
          return;
        }

        try {
          const json = combined.substring(markerIdx + marker.length).trim();
          resolvePromise(JSON.parse(json) as LocalTestResult);
        } catch {
          reject(new Error('Failed to parse test result.'));
        }
      });
    });

    displayLocalTestResult(result);
  } finally {
    // Clean up temp wrapper
    try {
      unlinkSync(wrapperPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Run remote test via Lambda (--remote flag).
 *
 * Sends code to POST /v1/apps/:appId/actions/:slug/test for Lambda execution.
 * Deployed code is never affected.
 */
async function runRemoteTest(
  scriptPath: string,
  slug: string,
  language: 'python' | 'nodejs-js' | 'nodejs-ts',
  params: unknown,
  appId: string,
  apiKey: string,
): Promise<void> {
  const code = readFileSync(scriptPath, 'utf-8');
  const client = new CanupClient({ token: apiKey });

  // Normalize fine-grained language ('nodejs-js'/'nodejs-ts') to the API's
  // coarse enum ('python' | 'nodejs'). The fine-grained types are only needed
  // by runLocalTest() for subprocess selection (node vs npx tsx).
  const apiLanguage = language === 'python' ? 'python' : 'nodejs';

  const result = await withSpinner(
    `Testing ${slug} on Lambda...`,
    () => client.testAction(appId, slug, code, apiLanguage, params),
    'Test complete',
  );

  displayRemoteTestResult(result);
}

/**
 * Display remote test result (strict envelope from API).
 */
function displayRemoteTestResult(result: TestResult): void {
  if (result.ok) {
    // Show print output if any
    if (result.data.printOutput) {
      console.log(dim('Output:'));
      console.log(result.data.printOutput);
    }

    success('Test passed');
    if (result.data.result !== undefined && result.data.result !== null) {
      console.log(
        `Returned: ${JSON.stringify(result.data.result, null, 2)} ${dim(`(${formatDuration(result.data.durationMs)})`)}`,
      );
    } else {
      console.log(dim(`(${formatDuration(result.data.durationMs)})`));
    }
  } else {
    // Show print output if any
    if (result.error.printOutput) {
      console.log(dim('Output:'));
      console.log(result.error.printOutput);
    }

    error(`Test failed: ${result.error.type}: ${result.error.message}`);
    if (result.error.stackTrace) {
      console.error(dim(result.error.stackTrace));
    }
    process.exit(1);
  }
}

/**
 * Display local test result with formatted output.
 */
function displayLocalTestResult(result: LocalTestResult): void {
  if (result.ok) {
    success('Test passed');
    if (result.data !== undefined && result.data !== null) {
      console.log(
        `Returned: ${JSON.stringify(result.data, null, 2)} ${dim(`(${formatDuration(result.duration_ms)})`)}`,
      );
    } else {
      console.log(dim(`(${formatDuration(result.duration_ms)})`));
    }
  } else if (result.error) {
    error(`Test failed: ${result.error.type}: ${result.error.message}`);
    if (result.error.stack_trace) {
      console.error(dim(result.error.stack_trace));
    }
    process.exit(1);
  }
}

/**
 * Format milliseconds into a human-readable duration string.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Register the `test` subcommand under `canup actions`.
 *
 * Two execution modes:
 * - Local (default): spawns python3/node/tsx subprocess, streams output live
 * - Remote (--remote): sends code to Lambda via test API endpoint
 *
 * Neither mode modifies deployed code.
 */
export function registerActionsTestAction(actionsCommand: Command): void {
  actionsCommand
    .command('test <action>')
    .description('Test an action locally (subprocess) or remotely (Lambda)')
    .option('--params <json>', 'Parameters as JSON string or path to JSON file')
    .option('--context <json>', 'Override mock context values (JSON string)')
    .option('--remote', 'Test via Lambda instead of local subprocess')
    .action(
      async (action: string, opts: { params?: string; context?: string; remote?: boolean }) => {
        try {
          const { config, apiKey, canupDir } = requireProject();

          // Resolve the action file
          const actionPath = resolveActionFile(action, canupDir, config);
          const language = detectLanguage(actionPath);
          const slug = pathParse(actionPath).name;
          const params = parseParams(opts.params);

          if (opts.remote) {
            await runRemoteTest(actionPath, slug, language, params, config.appId, apiKey);
          } else {
            // Build mock context with defaults, overridable via --context
            const defaultContext: Record<string, unknown> = {
              user_id: 'test-user',
              brand_id: 'test-brand',
              app_id: config.appId,
              invocation_id: `test-${Date.now()}`,
            };
            const context = opts.context
              ? { ...defaultContext, ...(JSON.parse(opts.context) as Record<string, unknown>) }
              : defaultContext;

            await runLocalTest(actionPath, language, params, context);
          }
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          const message = err instanceof Error ? err.message : String(err);

          if (statusCode === 401) {
            error('Not authenticated.');
            hint('Run `canup login` to re-authenticate.');
            process.exit(1);
          }

          if (statusCode === 404) {
            error('Action not found on server.');
            hint(
              'Deploy the action first with `canup actions deploy`, or use local mode (without --remote).',
            );
            process.exit(1);
          }

          error(`Test failed: ${message}`);
          process.exit(1);
        }
      },
    );
}
