import { describe, expect, test } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { creditKey, queryClient } from './query.js';

describe('query', () => {
  test('queryClient is a QueryClient with correct defaults', () => {
    expect(queryClient).toBeInstanceOf(QueryClient);

    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(true);
    expect(defaults.queries?.retry).toBe(1);
  });

  test('safety-net poll is visible-tab-only and at most every 5 minutes', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.refetchIntervalInBackground).toBe(false);
    expect(defaults.queries?.refetchInterval).toBe(5 * 60_000);
  });

  test('creditKey returns ["credits", action] tuple', () => {
    expect(creditKey('my-action')).toEqual(['credits', 'my-action']);
  });
});
