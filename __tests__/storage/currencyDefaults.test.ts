import { describe, expect, it } from '@jest/globals';
import { languageToCurrency } from '@/shared/domain/currency/defaults';

// languageToCurrency sets the default currency for every new calculation and the
// global default (via getDefaultCurrency / useLocale), so the pl -> PLN contract
// and the GBP fallback are worth pinning.
describe('languageToCurrency', () => {
  it('maps Polish language codes to PLN', () => {
    expect(languageToCurrency('pl')).toBe('PLN');
  });

  it('maps a Polish locale with a region suffix to PLN', () => {
    expect(languageToCurrency('pl-PL')).toBe('PLN');
  });

  it('is case-insensitive on the language subtag', () => {
    expect(languageToCurrency('PL')).toBe('PLN');
    expect(languageToCurrency('PL-pl')).toBe('PLN');
  });

  it('defaults English locales to GBP', () => {
    expect(languageToCurrency('en')).toBe('GBP');
    expect(languageToCurrency('en-GB')).toBe('GBP');
    expect(languageToCurrency('en-US')).toBe('GBP');
  });

  it('falls back to GBP for any unmapped language', () => {
    expect(languageToCurrency('de')).toBe('GBP');
    expect(languageToCurrency('fr-FR')).toBe('GBP');
    expect(languageToCurrency('')).toBe('GBP');
  });
});
