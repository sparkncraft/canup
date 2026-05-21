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

  test('creditKey returns ["credits", action] tuple', () => {
    expect(creditKey('my-action')).toEqual(['credits', 'my-action']);
  });
});
