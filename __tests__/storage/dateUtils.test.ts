import { describe, expect, it } from '@jest/globals';
import {
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
});
