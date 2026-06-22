import { describe, test, expect } from 'vitest';
import { getTranslations } from './translations.js';

const EXPECTED_LOCALES = [
  'ar',
  'de',
  'es',
  'es-419',
  'fr',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'nl',
  'pl',
  'pt-BR',
  'ro',
  'sv',
  'th',
  'tr',
  'vi',
];

// The locale-independent status lines guaranteed to be translated in every
// locale today (the app-name-attributed strings fall back to English until a
// dedicated translation pass — see translations.ts).
const TRANSLATED_MESSAGE_IDS = [
  'canup.credits.exhaustedRefresh',
  'canup.subscription.cancelScheduled',
  'canup.subscription.loggedInAs',
];

describe('translations', () => {
  test('all 18 non-English locales have translations', () => {
    for (const locale of EXPECTED_LOCALES) {
      const messages = getTranslations(locale);
      expect(Object.keys(messages).length, `${locale} should have translations`).toBeGreaterThan(0);
    }
  });

  test('each locale translates the non-attributed status lines', () => {
    for (const locale of EXPECTED_LOCALES) {
      const messages = getTranslations(locale);
      for (const id of TRANSLATED_MESSAGE_IDS) {
        expect(messages[id], `${locale} missing ${id}`).toBeDefined();
        expect(typeof messages[id], `${locale}/${id} should be string`).toBe('string');
      }
    }
  });

  test('getTranslations returns empty object for English', () => {
    expect(getTranslations('en')).toEqual({});
  });

  test('getTranslations returns empty object for unknown locale', () => {
    expect(getTranslations('xx-unknown')).toEqual({});
  });
});
