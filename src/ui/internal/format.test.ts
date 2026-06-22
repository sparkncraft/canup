import { describe, expect, test } from 'vitest';
import { formatDate } from './format.js';

describe('formatDate', () => {
  test('returns null for null input', () => {
    expect(formatDate(null)).toBeNull();
  });

  test('returns null for an empty string', () => {
    expect(formatDate('')).toBeNull();
  });

  test('formats an ISO date as a medium date including the year', () => {
    const out = formatDate('2026-06-15T00:00:00.000Z');
    expect(out).toBeTruthy();
    // The year is the load-bearing fix: the prior short format dropped it.
    expect(out).toContain('2026');
  });
});
