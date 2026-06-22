import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIntl } from './use-intl.js';
import { creditsMessages } from './messages.js';

describe('useIntl', () => {
  test('returns IntlShape with locale en when no provider exists', () => {
    const { result } = renderHook(() => useIntl());
    expect(result.current.locale).toBe('en');
  });

  test('formatMessage returns English defaultMessage text', () => {
    const { result } = renderHook(() => useIntl());
    const text = result.current.formatMessage(creditsMessages.exhaustedRefresh, {
      resetDate: 'June 1',
    });
    expect(text).toBe('Credits refresh June 1.');
  });
});
