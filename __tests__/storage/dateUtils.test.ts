import { describe, expect, it } from '@jest/globals';
import {
  addMonthsToIsoDate,
  formatFriendlyDate,
  formatFriendlyDateRange,
  formatIsoDate,
  isValidIsoDate,
} from '../../src/utils/date';

describe('date utils', () => {
  it('formats English date labels with ordinal days and friendly month names', () => {
    expect(formatFriendlyDate('2026-09-21', 'en')).toBe('21st Sept 2026');
    expect(formatFriendlyDate('2026-09-22', 'en-GB')).toBe('22nd Sept 2026');
    expect(formatFriendlyDate('2026-09-23', 'en-GB')).toBe('23rd Sept 2026');
    expect(formatFriendlyDate('2026-09-11', 'en-GB')).toBe('11th Sept 2026');
  });

  it('formats date ranges using the same friendly labels', () => {
    expect(formatFriendlyDateRange('2026-09-21', '2031-09-21', 'en')).toBe(
      '21st Sept 2026 - 21st Sept 2031',
    );
  });

  it('falls back to the original value when a date cannot be parsed', () => {
    expect(formatFriendlyDate('not-a-date', 'en')).toBe('not-a-date');
  });

  it('validates strict ISO calendar dates', () => {
    expect(isValidIsoDate('2026-06-01')).toBe(true);
    expect(isValidIsoDate('2026-02-31')).toBe(false);
    expect(isValidIsoDate('01/06/2026')).toBe(false);
  });

  it('formats picker dates as local ISO dates', () => {
    expect(formatIsoDate(new Date(2026, 5, 1))).toBe('2026-06-01');
  });

  describe('addMonthsToIsoDate', () => {
    it('keeps the same day for months that are long enough', () => {
      expect(addMonthsToIsoDate('2026-01-15', 1)).toBe('2026-02-15');
      expect(addMonthsToIsoDate('2026-06-30', 24)).toBe('2028-06-30');
    });

    it('clamps the day to the last day of a shorter target month', () => {
      // 31 Jan + 1 month must be 28 Feb, not 3 Mar (the bare setMonth overflow).
      expect(addMonthsToIsoDate('2026-01-31', 1)).toBe('2026-02-28');
      // Leap year keeps the 29th.
      expect(addMonthsToIsoDate('2028-01-31', 1)).toBe('2028-02-29');
      // 31 May + 1 month → 30 Jun.
      expect(addMonthsToIsoDate('2026-05-31', 1)).toBe('2026-06-30');
    });

    it('rolls across year boundaries', () => {
      expect(addMonthsToIsoDate('2026-11-30', 3)).toBe('2027-02-28');
    });

    it('returns the input unchanged when it cannot be parsed', () => {
      expect(addMonthsToIsoDate('not-a-date', 3)).toBe('not-a-date');
    });
  });
});
