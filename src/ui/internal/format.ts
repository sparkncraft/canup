/**
 * Format an ISO-8601 date as a medium date (e.g. "Jun 1, 2026") in the given
 * locale. Returns null for null/empty input so callers can omit the line
 * entirely. Canva's Monetization Status guidance requires dates to be localized
 * for the user's locale and shown in a medium format — so callers pass the
 * Canva-selected locale (`intl.locale`), never the host default.
 */
export function formatDate(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(locale, { dateStyle: 'medium' });
}
