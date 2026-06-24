import { describe, test, expect } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { useIntl } from './use-intl.js';
import { creditsMessages } from './messages.js';

describe('useIntl', () => {
  test('returns IntlShape with locale en when no provider exists', () => {
    const { result } = renderHook(() => useIntl());
    expect(result.current.locale).toBe('en');
  });

  test('reads the locale from a parent react-intl provider', () => {
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(IntlProvider, { locale: 'fr', defaultLocale: 'en', children });
    const { result } = renderHook(() => useIntl(), { wrapper });
    expect(result.current.locale).toBe('fr');
  });

  test('formatMessage returns English defaultMessage text', () => {
    const { result } = renderHook(() => useIntl());
    const text = result.current.formatMessage(creditsMessages.exhaustedRefresh, {
      resetDate: 'June 1',
    });
    expect(text).toBe('Credits refresh June 1.');
  });
});
