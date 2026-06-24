import { describe, expect, test } from 'vitest';
import { formatDate } from './format.js';

describe('formatDate', () => {
  test('returns null for null input', () => {
    expect(formatDate(null, 'en-US')).toBeNull();
  });

  test('returns null for an empty string', () => {
    expect(formatDate('', 'en-US')).toBeNull();
  });

  test('formats an ISO date as a medium date including the year', () => {
    const out = formatDate('2026-06-15T00:00:00.000Z', 'en-US');
    expect(out).toContain('2026');
    // Medium format uses the short month name in en-US, not a numeric month.
    expect(out).toContain('Jun');
  });

  test('renders the date in the given locale, not the host default', () => {
    const iso = '2026-06-15T00:00:00.000Z';
    // de-DE medium format ("15.06.2026") differs from en-US ("Jun 15, 2026"),
    // proving the locale argument drives formatting.
    expect(formatDate(iso, 'de-DE')).not.toBe(formatDate(iso, 'en-US'));
  });
});
