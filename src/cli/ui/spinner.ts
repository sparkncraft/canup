import chalk from 'chalk';
import ora from 'ora';
import type { Ora } from 'ora';

/**
 * Ora spinner wrapper with duration tracking.
 *
 * Provides a minimal Vercel-feel spinner experience with automatic
 * duration display on success.
 */

export interface Spinner {
  /** Update the spinner text */
  update(text: string): void;
  /** Stop with a green checkmark + text + gray duration */
  succeed(text: string): void;
  /** Stop with a red X + text */
  fail(text: string): void;
}

/**
 * Create a spinner with duration tracking.
 *
 * Usage:
 *   const spin = createSpinner('Deploying...')
 *   // ...do work...
 *   spin.succeed('Deployed')  // shows: ✓ Deployed (1.2s)
 */
export function createSpinner(text: string): Spinner {
  const startTime = Date.now();
  const spinner: Ora = ora({ text, color: 'cyan' }).start();

  function formatDuration(): string {
    const ms = Date.now() - startTime;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  return {
    update(newText: string) {
      spinner.text = newText;
    },
    succeed(successText: string) {
      spinner.succeed(`${successText} ${chalk.gray(`(${formatDuration()})`)}`);
    },
    fail(failText: string) {
      spinner.fail(failText);
    },
  };
}

/**
 * Async helper that runs a function with a spinner.
 *
 * Starts the spinner, runs fn, shows succeed/fail with duration.
 *
 * Usage:
 *   const result = await withSpinner('Deploying...', async () => {
 *     return await deploy()
 *   }, 'Deployed')
 */
export async function withSpinner<T>(
  text: string,
  fn: () => Promise<T>,
  successText?: string,
): Promise<T> {
  const spin = createSpinner(text);

  try {
    const result = await fn();
    spin.succeed(successText ?? text);
    return result;
  } catch (err) {
    spin.fail(text);
    throw err;
  }
}
