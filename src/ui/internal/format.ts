/**
 * Format an ISO-8601 date as a localized medium date *including the year*
 * (e.g. "Jun 1, 2026"). Returns null for null/empty input so callers can omit
 * the line entirely. Canva's Monetization Status guidance requires the year —
 * the prior short format dropped it.
 */
export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
