import { describe, expect, it } from '@jest/globals';
import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';

// Every chart (RepaymentBarChart, CumulativeAreaChart, MortgageBalanceChart,
// LoanBreakdownDonut, OverpaymentsComparisonChart) plots the parallel arrays and
// totals produced by getLoanCalculations. These tests assert the invariants those
// charts depend on, so a regression in the engine surfaces as a data-correctness
// failure rather than a silently wrong chart.

const calc = (amount: number, interest: number, years: number, additionalMonthly = 0) =>
  getLoanCalculations(
    amount,
    interest,
    years,
    0,
    0,
    LoanCalculationType.TERM,
    0,
    DownPaymentType.CASH,
    additionalMonthly,
    '2024-01-01',
  );

const isNonDecreasing = (values: number[]) =>
  values.every((value, index) => index === 0 || value >= values[index - 1] - 1e-6);

const isNonIncreasing = (values: number[]) =>
  values.every((value, index) => index === 0 || value <= values[index - 1] + 1e-6);

const cases = [
  { name: '£200k mortgage, 5%, 25 years', amount: 200000, interest: 5, years: 25 },
  { name: '£10k personal loan, 8%, 3 years', amount: 10000, interest: 8, years: 3 },
  { name: 'large £2m loan, 4%, 30 years', amount: 2000000, interest: 4, years: 30 },
];

describe.each(cases)('chart data integrity — $name', ({ amount, interest, years }) => {
  const result = calc(amount, interest, years);
  const { loanChartMonthlyArray: paid, loanChartInterestArray: interestPaid, loanChartRemainingArray: remaining } = result;

  it('keeps the three plotted series the same length with correct starting anchors', () => {
    expect(interestPaid.length).toBe(paid.length);
    expect(remaining.length).toBe(paid.length);
    // One leading entry (month 0) plus one per amortisation row.
    expect(paid.length).toBe(result.tableItems.length + 1);
    expect(paid[0]).toBe(0);
    expect(interestPaid[0]).toBe(0);
    expect(remaining[0]).toBe(amount);
  });

  it('accumulates payments and interest without ever decreasing', () => {
    expect(isNonDecreasing(paid)).toBe(true);
    expect(isNonDecreasing(interestPaid)).toBe(true);
  });

  it('draws the remaining balance down to zero without dipping negative', () => {
    expect(isNonIncreasing(remaining)).toBe(true);
    expect(Math.min(...remaining)).toBeGreaterThanOrEqual(0);
    expect(remaining[remaining.length - 1]).toBe(0);
  });

  it('matches the final cumulative interest to the reported total interest', () => {
    expect(interestPaid[interestPaid.length - 1]).toBeCloseTo(result.totalInterestPaid, 2);
  });

  it('upholds paid = interest + principal repaid at every plotted point', () => {
    paid.forEach((paidToDate, index) => {
      const principalRepaid = amount - remaining[index];
      expect(Math.abs(paidToDate - (interestPaid[index] + principalRepaid))).toBeLessThanOrEqual(0.05);
    });
  });
});

describe('chart data integrity — overpayment scenario vs baseline', () => {
  const baseline = calc(200000, 5, 25, 0);
  const scenario = calc(200000, 5, 25, 300);

  it('clears the balance in no more months than the baseline', () => {
    expect(scenario.loanChartRemainingArray.length).toBeLessThanOrEqual(baseline.loanChartRemainingArray.length);
  });

  it('keeps the scenario balance at or below the baseline at every shared point', () => {
    scenario.loanChartRemainingArray.forEach((value, index) => {
      expect(value).toBeLessThanOrEqual(baseline.loanChartRemainingArray[index] + 1e-6);
    });
  });

  it('saves interest overall', () => {
    expect(scenario.totalInterestPaid).toBeLessThan(baseline.totalInterestPaid);
  });
});
