import { useContext, useMemo } from 'react';
import { createIntl, createIntlCache, IntlContext, type IntlShape } from 'react-intl';
import { getTranslations } from './translations.js';

const cache = createIntlCache();

/**
 * Returns an IntlShape carrying the SDK's own translations for the locale the
 * host app is using.
 *
 * The locale comes from react-intl's own `IntlContext` — the context the host's
 * `<AppI18nProvider>` / `<IntlProvider>` populates. react-intl keeps a single
 * shared instance of that context (it dedupes copies via a window global
 * internally) and re-exports it, so this reads the live locale even if a
 * consumer's bundler ends up with a duplicate react-intl. The context defaults to
 * `null`, so we fall back to English when no provider is present (or during SSR).
 */
export function useIntl(): IntlShape {
  // react-intl types the context value as non-null for its own `useIntl`, but the
  // no-provider default is genuinely `null` — reflect that so the fallback is real.
  const parentIntl: IntlShape | null = useContext(IntlContext);
  const locale = parentIntl?.locale ?? 'en';

  return useMemo(
    () => createIntl({ locale, defaultLocale: 'en', messages: getTranslations(locale) }, cache),
    [locale],
  );
}
