import { describe, test, expect } from 'vitest';
import { getTranslations } from './translations.js';
import { creditCounterMessages } from './messages.js';

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

const EXPECTED_MESSAGE_IDS = Object.values(creditCounterMessages).map(
  (m) => m.id,
);

describe('translations', () => {
  test('all 18 non-English locales have translations', () => {
    for (const locale of EXPECTED_LOCALES) {
      const messages = getTranslations(locale);
      expect(
        Object.keys(messages).length,
        `${locale} should have translations`,
      ).toBeGreaterThan(0);
    }
  });

  test('each locale has all 7 message IDs', () => {
    for (const locale of EXPECTED_LOCALES) {
      const messages = getTranslations(locale);
      for (const id of EXPECTED_MESSAGE_IDS) {
        expect(messages[id], `${locale} missing ${id}`).toBeDefined();
        expect(typeof messages[id], `${locale}/${id} should be string`).toBe(
          'string',
        );
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
