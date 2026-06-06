import { describe, expect, it } from '@jest/globals';
import {
  computePhasedRemainingArray,
  computePhasedTotals,
} from '@/loans/phasedAmortisation';
import { getLoanCalculations } from '@/core/amortisation';

const INTEREST = 5;
const START = '2024-01-01';

// A 10-year £120k repayment loan as the baseline schedule every test phases against.
const baseResult = getLoanCalculations(
  120000, INTEREST, 10, 0, 0, 'term', 0, 'percent', 0, START,
);

const phased = (lumpSums: { date: string; amount: number }[]) =>
  computePhasedTotals({ baseResult, interest: INTEREST, startDate: START, lumpSums });

const remaining = (lumpSums: { date: string; amount: number }[]) =>
  computePhasedRemainingArray({ baseResult, interest: INTEREST, startDate: START, lumpSums });

const sumInterestThroughMonth = (months: number): number =>
  baseResult.tableItems
    .slice(0, months)
    .reduce((total, row) => total + parseFloat(row.interest), 0);

describe('computePhasedTotals', () => {
  it('returns the baseline totals when there are no lump sums', () => {
    expect(phased([])).toEqual({
      totalInterestPaid: baseResult.totalInterestPaid,
      totalTermInMonths: baseResult.tableItems.length,
      monthlyPayments: baseResult.monthlyPayments,
    });
  });

  it('ignores zero-amount and unparseable lump sums', () => {
    expect(phased([{ date: START, amount: 0 }, { date: 'not-a-date', amount: 5000 }]))
      .toEqual(phased([]));
  });

  it('shortens the term and cuts interest for a mid-term lump, keeping the monthly fixed', () => {
    const result = phased([{ date: '2026-01-01', amount: 20000 }]);

    expect(result.totalTermInMonths).toBeLessThan(baseResult.tableItems.length);
    expect(result.totalInterestPaid).toBeLessThan(baseResult.totalInterestPaid);
    expect(result.monthlyPayments).toBe(baseResult.monthlyPayments);
  });

  it('stops at the lump month when a lump clears the balance', () => {
    // month index 12 (2025-01-01 is 12 months after the 2024-01-01 start).
    const result = phased([{ date: '2025-01-01', amount: 500000 }]);

    expect(result.totalTermInMonths).toBe(12);
    expect(result.totalInterestPaid).toBeCloseTo(sumInterestThroughMonth(12), 2);
  });

  it('stacks multiple lumps for a larger reduction than one alone', () => {
    const one = phased([{ date: '2026-01-01', amount: 20000 }]);
    const two = phased([
      { date: '2026-01-01', amount: 20000 },
      { date: '2028-01-01', amount: 20000 },
    ]);

    expect(two.totalInterestPaid).toBeLessThan(one.totalInterestPaid);
    expect(two.totalTermInMonths).toBeLessThan(one.totalTermInMonths);
  });

  it('skips a lump dated after the loan is paid off', () => {
    // 130 months out — beyond the 120-month schedule, so it is a no-op.
    expect(phased([{ date: '2034-11-01', amount: 20000 }])).toEqual(phased([]));
  });

  // Regression: a lump that leaves a residual smaller than one monthly payment.
  // getLoanCalculations' final-row branch overshoots here, emitting an extra
  // negative "refund" row — which used to add a phantom month to the term.
  describe('residual smaller than one payment (B1)', () => {
    const monthly = baseResult.monthlyPayments;
    const lumpMonthIndex = 100; // 100 months after START is 2032-05-01.
    const lumpDate = '2032-05-01';
    const balanceBeforeLump = parseFloat(baseResult.tableItems[lumpMonthIndex - 1].ending);
    // Leave roughly half a payment outstanding so the next month clears it.
    const lump = balanceBeforeLump - monthly * 0.5;

    it('clears in exactly one further month with no phantom refund row', () => {
      const result = phased([{ date: lumpDate, amount: lump }]);

      expect(result.totalTermInMonths).toBe(lumpMonthIndex + 1);
      expect(result.totalInterestPaid).toBeGreaterThan(0);
    });

    it('remaining-balance series has no upward spike and ends at zero', () => {
      const array = remaining([{ date: lumpDate, amount: lump }]);

      expect(array[array.length - 1]).toBe(0);
      for (let i = 1; i < array.length; i += 1) {
        expect(array[i]).toBeLessThanOrEqual(array[i - 1]);
      }
    });
  });
});

describe('computePhasedRemainingArray', () => {
  it('returns a copy of the baseline remaining array when there are no lumps', () => {
    const array = remaining([]);
    expect(array).toEqual(baseResult.loanChartRemainingArray);
    expect(array).not.toBe(baseResult.loanChartRemainingArray);
  });

  it('drops the balance at the lump month and never increases afterwards', () => {
    const array = remaining([{ date: '2026-01-01', amount: 20000 }]);

    expect(array[array.length - 1]).toBe(0);
    for (let i = 1; i < array.length; i += 1) {
      expect(array[i]).toBeLessThanOrEqual(array[i - 1]);
    }
    // The phased payoff happens earlier than the baseline's full term.
    expect(array.length).toBeLessThan(baseResult.loanChartRemainingArray.length);
  });

  it('ends immediately once a lump clears the balance', () => {
    const array = remaining([{ date: '2025-01-01', amount: 500000 }]);
    expect(array[array.length - 1]).toBe(0);
    // index 0 is the opening balance, then 12 monthly points up to the lump.
    expect(array.length).toBe(13);
  });
});
