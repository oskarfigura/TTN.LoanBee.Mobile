import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

type LocaleValue = string | number | boolean | null | LocaleValue[] | { [key: string]: LocaleValue };

const readLocale = (name: string): Record<string, LocaleValue> => (
  JSON.parse(readFileSync(join(__dirname, '../../src/shared/lib/i18n/locales', name), 'utf8'))
);

const flatten = (value: LocaleValue, prefix = ''): Record<string, string> => {
  if (Array.isArray(value)) {
    return Object.fromEntries(value.flatMap((item, index) => Object.entries(flatten(item, `${prefix}.${index}`))));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, child]) => (
        Object.entries(flatten(child, prefix ? `${prefix}.${key}` : key))
      )),
    );
  }

  return { [prefix]: String(value) };
};

const interpolationTokens = (value: string): string[] => (
  [...value.matchAll(/{{\s*([^},\s]+).*?}}/g)].map(match => match[1]).sort()
);

describe('i18n locale resources', () => {
  it('keeps English and Polish locale keys aligned with matching interpolation tokens', () => {
    const en = flatten(readLocale('en.json'));
    const pl = flatten(readLocale('pl.json'));

    expect(Object.keys(pl).sort()).toEqual(Object.keys(en).sort());

    for (const key of Object.keys(en)) {
      expect(interpolationTokens(pl[key])).toEqual(interpolationTokens(en[key]));
    }
  });

  it('keeps the Polish About FAQ translated item-for-item', () => {
    const en = readLocale('en.json') as { about: { faqItems: LocaleValue[] } };
    const pl = readLocale('pl.json') as { about: { faqItems: LocaleValue[] } };

    expect(pl.about.faqItems).toHaveLength(en.about.faqItems.length);
  });
});
