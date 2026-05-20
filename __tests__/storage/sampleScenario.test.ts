import { describe, it, expect } from '@jest/globals';
import {
  computeSampleSavings,
  getSampleScenario,
} from '../../src/onboarding/sampleScenario';
import { CurrencyCode } from '../../src/currency/currencies';

describe('sampleScenario', () => {
  const currencies: CurrencyCode[] = ['GBP', 'EUR', 'USD', 'PLN'];

  describe('getSampleScenario', () => {
    it.each(currencies)('returns a mortgage-shaped scenario for %s', currency => {
      const s = getSampleScenario(currency);
      expect(s.loanAmount).toBeGreaterThanOrEqual(100_000);
      expect(s.interest).toBeGreaterThan(0);
      expect(s.interest).toBeLessThan(15);
      expect(s.termInYears).toBeGreaterThanOrEqual(20);
      expect(s.additionalMonthlyPayment).toBeGreaterThan(0);
    });

    it('falls back to GBP for an unrecognised currency code', () => {
      // The signature is typed to CurrencyCode but the impl defends against
      // unexpected runtime values (e.g. a stale stored locale).
      const s = getSampleScenario('XYZ' as CurrencyCode);
      const gbp = getSampleScenario('GBP');
      expect(s).toEqual(gbp);
    });
  });

  describe('computeSampleSavings', () => {
    it.each(currencies)('produces meaningful savings for %s', currency => {
      const { interestSaved, monthsSaved } = computeSampleSavings(
        getSampleScenario(currency),
      );
      expect(interestSaved).toBeGreaterThan(0);
      expect(monthsSaved).toBeGreaterThan(0);
    });

    it('GBP scenario saves a believable amount and time', () => {
      // Sanity-check the headline scenario so a future tweak to the maths
      // engine or the GBP sample doesn't silently shift the onboarding stat.
      const { interestSaved, monthsSaved } = computeSampleSavings(
        getSampleScenario('GBP'),
      );
      expect(interestSaved).toBeGreaterThan(20_000);
      expect(interestSaved).toBeLessThan(80_000);
      expect(monthsSaved).toBeGreaterThan(36);
      expect(monthsSaved).toBeLessThan(120);
    });
  });
});
