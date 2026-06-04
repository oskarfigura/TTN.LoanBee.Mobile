import { describe, expect, it } from '@jest/globals';
import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { buildCalculationSharePayload } from '@/share/calculationShareMessage';
import { LoanResult } from '@/results/loanResultRoute';

const result = {
  amount: 250000,
  downPayment: 25000,
  monthlyPayments: 1319.59,
  totalInterestPaid: 91678.42,
  totalAmountPaid: 316678.42,
  tableItems: [],
  loanChartMonthlyArray: [],
  loanChartInterestArray: [],
  loanChartRemainingArray: [],
  loanChartLabelArray: [],
  termInYears: 20,
  termInMonths: 0,
  startDate: '2026-01-01',
} as unknown as LoanResult;

const t = (key: string, options?: Record<string, string>) => (
  options?.amount ? `${key}:${options.amount}` : key
);

describe('calculation share message', () => {
  it('builds the shared payload used by result and saved detail screens', () => {
    const payload = buildCalculationSharePayload({
      result,
      currency: 'GBP',
      t,
      formValues: {
        loanAmount: 250000,
        interest: 4.5,
        termInYears: 20,
        termInMonths: 0,
        downPayment: 10,
        downPaymentType: DownPaymentType.PERCENT,
        desiredMonthlyPayment: 0,
        additionalMonthlyPayment: 200,
        startDate: '2026-01-01',
        calculationType: LoanCalculationType.TERM,
        currency: 'GBP',
      },
    });

    expect(payload.title).toBe('share.title');
    expect(payload.message).toContain('share.intro\n');
    expect(payload.url).toBe(
      'https://www.loanamortisationcalculator.com/?amount=250000&interest=4.5&downPayment=10&downPaymentType=percent&startDate=2026-01-01&mode=term&currency=GBP&years=20&months=0&extra=200',
    );
    expect(payload.message).toContain('share.monthlyPayment:£1,319.59');
    expect(payload.message).toContain('share.totalInterest:£91,678.42');
    expect(payload.message).toContain('share.totalCost:£316,678.42');
    expect(payload.message.endsWith(payload.url)).toBe(true);
  });

  it('normalizes saved-loan snapshot enum casing before sharing', () => {
    const payload = buildCalculationSharePayload({
      result,
      currency: 'GBP',
      t,
      formValues: {
        loanAmount: 120000,
        interest: 5,
        termInYears: 10,
        termInMonths: 0,
        downPayment: 0,
        downPaymentType: 'CASH',
        desiredMonthlyPayment: null,
        additionalMonthlyPayment: null,
        startDate: '2026-06-01',
        calculationType: 'TERM',
        currency: 'GBP',
      },
    });

    expect(payload.url).toContain('downPaymentType=cash');
    expect(payload.url).toContain('mode=term');
  });

  it('uses loan-specific share copy when sharing a saved loan', () => {
    const payload = buildCalculationSharePayload({
      result,
      currency: 'GBP',
      category: 'loan',
      t,
      formValues: {
        loanAmount: 120000,
        interest: 5,
        termInYears: 10,
        termInMonths: 0,
        downPayment: 0,
        downPaymentType: DownPaymentType.CASH,
        desiredMonthlyPayment: 0,
        additionalMonthlyPayment: 0,
        startDate: '2026-06-01',
        calculationType: LoanCalculationType.TERM,
        currency: 'GBP',
      },
    });

    expect(payload.title).toBe('share.titleLoan');
    expect(payload.message.startsWith('share.introLoan\n')).toBe(true);
  });

  it('uses mortgage-specific share copy when sharing a saved mortgage', () => {
    const payload = buildCalculationSharePayload({
      result,
      currency: 'GBP',
      category: 'mortgage',
      t,
      formValues: {
        loanAmount: 250000,
        interest: 4.5,
        termInYears: 20,
        termInMonths: 0,
        downPayment: 10,
        downPaymentType: DownPaymentType.PERCENT,
        desiredMonthlyPayment: 0,
        additionalMonthlyPayment: 200,
        startDate: '2026-01-01',
        calculationType: LoanCalculationType.TERM,
        currency: 'GBP',
      },
    });

    expect(payload.title).toBe('share.titleMortgage');
    expect(payload.message.startsWith('share.introMortgage\n')).toBe(true);
  });
});
