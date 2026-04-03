import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSdkIntl } from './use-sdk-intl.js';
import { creditCounterMessages } from './messages.js';

describe('useSdkIntl', () => {
  test('returns IntlShape with locale en when no provider exists', () => {
    const { result } = renderHook(() => useSdkIntl());
    expect(result.current.locale).toBe('en');
  });

  test('formatMessage returns English defaultMessage text', () => {
    const { result } = renderHook(() => useSdkIntl());
    const text = result.current.formatMessage(creditCounterMessages.exhausted);
    expect(text).toBe("You don't have enough credits left.");
  });
});
