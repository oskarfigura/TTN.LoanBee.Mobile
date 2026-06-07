import { describe, expect, it } from '@jest/globals';
import {
  formatAmortisationPeriodLabel,
  formatIsoDate,
  formatPayoffDate,
  getLoanEndDate,
} from '@amortisation/dates';

// These helpers previously advanced dates with a bare setMonth, which overflows
// for end-of-month start dates (31 Jan + 1 month → 3 Mar). They now clamp to the
// target month's last day. See packages/amortisation/dates.ts.
describe('amortisation date helpers clamp end-of-month overflow', () => {
  it('getLoanEndDate clamps the day to the shorter target month', () => {
    expect(formatIsoDate(getLoanEndDate('2026-01-31', 0, 1))).toBe('2026-02-28');
    expect(formatIsoDate(getLoanEndDate('2028-01-31', 0, 1))).toBe('2028-02-29');
  });

  it('formatPayoffDate clamps instead of rolling into the following month', () => {
    expect(formatPayoffDate('2026-01-31', 1, 'en')).toBe('28th Feb 2026');
  });

  it('formatAmortisationPeriodLabel stays in the correct month', () => {
    // Period 2 = start + 1 month. 31 Jan must land in February, not March.
    expect(formatAmortisationPeriodLabel('2026-01-31', 2, 'en')).toBe('February 2026');
  });
});
