import { type Context, createContext, useContext, useMemo } from 'react';
import { createIntl, createIntlCache, type IntlShape } from 'react-intl';
import { getTranslations } from './translations.js';

const FALLBACK_CONTEXT = createContext<IntlShape | null>(null);

/**
 * react-intl stores its context at window.__REACT_INTL_CONTEXT__ in browser.
 * Since react-intl is a peer dep that evaluates before this module, the global
 * is already set by the time this runs. Falls back to a dummy context (returns null)
 * when react-intl hasn't initialized or in SSR.
 */
function getIntlContext(): Context<IntlShape | null> {
  if (typeof window !== 'undefined' && '__REACT_INTL_CONTEXT__' in window) {
    // react-intl types as Context<IntlShape>; widen to allow null for the fallback path.
    // Safe because we only read via useContext, never provide.
    return window.__REACT_INTL_CONTEXT__ as Context<IntlShape | null>;
  }
  return FALLBACK_CONTEXT;
}

const intlContext = getIntlContext();
const cache = createIntlCache();

/**
 * Returns an IntlShape with SDK-owned translations for the current locale.
 * Locale is auto-detected from the parent AppI18nProvider.
 * Falls back to English ('en') when no provider exists.
 */
export function useIntl(): IntlShape {
  const parentIntl = useContext(intlContext);
  const locale = parentIntl?.locale ?? 'en';

  return useMemo(
    () => createIntl({ locale, defaultLocale: 'en', messages: getTranslations(locale) }, cache),
    [locale],
  );
}
