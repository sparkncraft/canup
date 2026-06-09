/**
 * Format milliseconds into a human-readable duration string.
 * Sub-second values render as `<n>ms`; longer ones as `<n.n>s`.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
