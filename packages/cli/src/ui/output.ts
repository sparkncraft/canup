import chalk from 'chalk';

/**
 * Styled output helpers -- Vercel CLI-inspired minimal coloring.
 *
 * All CLI output styling goes through these helpers.
 * Do NOT import chalk directly in command files.
 */

/** Green checkmark + message */
export function success(msg: string): void {
  console.log(`${chalk.green('✓')} ${msg}`);
}

/** Red X + red message (to stderr) */
export function error(msg: string): void {
  console.error(`${chalk.red('✗')} ${chalk.red(msg)}`);
}

/** Gray indented hint text (to stderr so it doesn't pollute JSON output) */
export function hint(msg: string): void {
  console.error(`  ${chalk.gray(msg)}`);
}

/** Cyan info icon + message */
export function info(msg: string): void {
  console.log(`${chalk.cyan('ℹ')} ${msg}`);
}

/** Gray padded key + white value (for detail views like whoami) */
export function label(key: string, value: string): void {
  console.log(`  ${chalk.gray(key.padEnd(14))} ${value}`);
}

/** Yellow warning icon + message */
export function warn(msg: string): void {
  console.log(`${chalk.yellow('⚠')} ${msg}`);
}

/** Gray text helper */
export function dim(msg: string): string {
  return chalk.gray(msg);
}

/**
 * Simple column-aligned table. No heavy table library needed.
 * Headers in gray bold, rows in white.
 */
export function formatTable(headers: string[], rows: string[][]): string {
  // Calculate column widths
  const widths = headers.map((h, i) => {
    const maxRow = rows.reduce((max, row) => Math.max(max, (row[i] ?? '').length), 0);
    return Math.max(h.length, maxRow);
  });

  // Format header row
  const headerLine = headers.map((h, i) => chalk.gray.bold(h.padEnd(widths[i]))).join('  ');

  // Format data rows
  const dataLines = rows.map((row) =>
    row.map((cell, i) => (cell ?? '').padEnd(widths[i])).join('  '),
  );

  return [headerLine, ...dataLines].join('\n');
}
