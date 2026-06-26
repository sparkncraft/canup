import { describe, test, expect } from 'vitest';
import { getTranslations } from './translations.js';
import { billingMessages, creditsMessages, subscriptionMessages } from './messages.js';

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

// Every message the SDK ships, derived from the definitions so coverage can't
// silently drift when a message is added.
const ALL_MESSAGES: { id: string; defaultMessage: string }[] = [
  ...Object.values(creditsMessages),
  ...Object.values(subscriptionMessages),
  ...Object.values(billingMessages),
];

// The one message that uses an ICU select (the cadence-attributed remaining
// balance); its `{...}` blocks aren't simple argument placeholders, so it gets a
// dedicated structural check below.
const SELECT_MESSAGE_ID = 'canup.credits.remaining';

/** Simple `{name}` argument placeholders referenced by a message. */
function placeholders(message: string): Set<string> {
  return new Set([...message.matchAll(/\{([a-zA-Z]+)\}/g)].map((m) => m[1]));
}

describe('translations', () => {
  test('all 18 non-English locales have translations', () => {
    for (const locale of EXPECTED_LOCALES) {
      const messages = getTranslations(locale);
      expect(Object.keys(messages).length, `${locale} should have translations`).toBeGreaterThan(0);
    }
  });

  test('every message is translated in every locale', () => {
    for (const locale of EXPECTED_LOCALES) {
      const messages = getTranslations(locale);
      for (const { id } of ALL_MESSAGES) {
        expect(messages[id], `${locale} missing ${id}`).toBeDefined();
        expect(typeof messages[id], `${locale}/${id} should be a string`).toBe('string');
      }
    }
  });

  test('each translation preserves the same {placeholders} as the English source', () => {
    for (const locale of EXPECTED_LOCALES) {
      const messages = getTranslations(locale);
      for (const { id, defaultMessage } of ALL_MESSAGES) {
        if (id === SELECT_MESSAGE_ID) continue; // handled structurally below
        expect(placeholders(messages[id]), `${locale}/${id}`).toEqual(placeholders(defaultMessage));
      }
    }
  });

  test('the remaining-balance select keeps its ICU structure and placeholders in every locale', () => {
    for (const locale of EXPECTED_LOCALES) {
      const msg = getTranslations(locale)[SELECT_MESSAGE_ID];
      expect(msg, `${locale} missing ${SELECT_MESSAGE_ID}`).toContain('{interval, select,');
      for (const arm of ['daily {', 'weekly {', 'monthly {', 'other {']) {
        expect(msg, `${locale} missing select arm "${arm}"`).toContain(arm);
      }
      // Count + attribution placeholders must survive into the select arms.
      for (const ph of ['{remaining}', '{quota}', '{appName}']) {
        expect(msg, `${locale}/${SELECT_MESSAGE_ID} missing ${ph}`).toContain(ph);
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
