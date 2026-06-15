import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TestResult } from '@canup/types';
import { success, error, dim } from '../../ui/output.js';
import { formatDuration } from '../../lib/format.js';

/**
 * Parse the `--params` option: an inline JSON string, a path to a JSON file,
 * or empty (`{}`). Exits with a helpful message on malformed input.
 */
export function parseParams(paramsArg?: string): unknown {
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
 * Render a {@link TestResult} envelope from the action test endpoint. `run` and
 * `test --remote` share the same output; only the success/failure wording
 * differs. Exits the process on failure.
 */
export function displayTestResult(
  result: TestResult,
  labels: { success: string; failure: string },
): void {
  if (result.ok) {
    if (result.data.printOutput) {
      console.log(dim('Output:'));
      console.log(result.data.printOutput);
    }

    success(labels.success);
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

    error(`${labels.failure}: ${result.error.type}: ${result.error.message}`);
    if (result.error.stackTrace) {
      console.error(dim(result.error.stackTrace));
    }
    process.exit(1);
  }
}
