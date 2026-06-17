import { describe, expect, it } from '@jest/globals';
import { computeLoanWithEvents } from '@/shared/domain/loans/loanScenario';
import { computeLoanOverpayments } from '@/shared/domain/loans/loanOverpaymentCalc';
import { LoanGroup } from '@/shared/domain/types/SavedLoan';

const baseLoan: LoanGroup = {
  id: 'loan-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  nickname: 'Test',
  category: 'loan',
  currency: 'GBP',
  status: 'tracked',
  pinnedToDashboard: false,
  deals: [],
  events: [
    { id: 'e1', createdAt: '', updatedAt: '', type: 'lumpOverpayment', date: '2024-07-01', amount: 5000 },
    { id: 'e2', createdAt: '', updatedAt: '', type: 'lumpOverpayment', date: '2025-01-01', amount: 2500 },
  ],
  formSnapshot: {
    loanAmount: 300000,
    interest: 3,
    termInYears: 10,
    termInMonths: 0,
    downPayment: 10,
    downPaymentType: 'PERCENT',
    desiredMonthlyPayment: null,
    additionalMonthlyPayment: 100,
    startDate: '2024-01-01',
    calculationType: 'TERM',
    currency: 'GBP',
  },
  resultSnapshot: {
    monthlyPayments: 2700,
    totalAmountPaid: 320000,
    totalInterestPaid: 50000,
    totalInterestPaidBaseline: 60000,
    termInYears: 10,
    termInMonths: 0,
    totalTermInMonths: 120,
  },
};

describe('phased amortisation — dedupe consistency', () => {
  it('loanScenario and loanOverpaymentCalc produce identical scenario totals for identical inputs', () => {
    const lumpSums = baseLoan.events
      .filter(e => e.type === 'lumpOverpayment')
      .map(e => ({ date: e.date, amount: e.amount ?? 0 }));

    const fromScenario = computeLoanWithEvents(baseLoan, baseLoan.formSnapshot.additionalMonthlyPayment ?? 0);
    const fromOverpayments = computeLoanOverpayments(
      baseLoan.formSnapshot,
      baseLoan.formSnapshot.additionalMonthlyPayment ?? 0,
      lumpSums,
    ).scenario;

    expect(fromScenario.totalInterestPaid).toBeCloseTo(fromOverpayments.totalInterestPaid, 2);
    expect(fromScenario.totalTermInMonths).toBe(fromOverpayments.totalTermInMonths);
    expect(fromScenario.monthlyPayments).toBeCloseTo(fromOverpayments.monthlyPayments, 2);
  });

  it('ignores deal-scoped lump events when computing whole-loan scenarios', () => {
    const withDealScopedLump: LoanGroup = {
      ...baseLoan,
      events: [
        ...baseLoan.events,
        {
          id: 'deal-scoped',
          createdAt: '',
          updatedAt: '',
          dealId: 'deal-current',
          type: 'lumpOverpayment',
          date: '2024-08-01',
          amount: 25_000,
        },
      ],
    };
    const lumpSums = baseLoan.events
      .filter(e => e.type === 'lumpOverpayment' && !e.dealId)
      .map(e => ({ date: e.date, amount: e.amount ?? 0 }));
    const fromScenario = computeLoanWithEvents(withDealScopedLump, withDealScopedLump.formSnapshot.additionalMonthlyPayment ?? 0);
    const fromOverpayments = computeLoanOverpayments(
      withDealScopedLump.formSnapshot,
      withDealScopedLump.formSnapshot.additionalMonthlyPayment ?? 0,
      lumpSums,
    ).scenario;

    expect(fromScenario.totalInterestPaid).toBeCloseTo(fromOverpayments.totalInterestPaid, 2);
    expect(fromScenario.totalTermInMonths).toBe(fromOverpayments.totalTermInMonths);
  });

  it('returns the unmodified base schedule when there are no lump sums', () => {
    const noLumpsLoan: LoanGroup = { ...baseLoan, events: [] };
    const result = computeLoanWithEvents(noLumpsLoan, 0);
    expect(result.totalTermInMonths).toBe(120);
  });

  it('ignores lump sums with invalid dates instead of falling back to today', () => {
    const withBadDate: LoanGroup = {
      ...baseLoan,
      events: [
        { id: 'bad', createdAt: '', updatedAt: '', type: 'lumpOverpayment', date: 'not-a-date', amount: 1000 },
      ],
    };
    const result = computeLoanWithEvents(withBadDate, 0);
    expect(result.totalTermInMonths).toBe(120);
  });

  it('handles a lump sum that pays off the loan completely', () => {
    const payoffLoan: LoanGroup = {
      ...baseLoan,
      events: [
        { id: 'payoff', createdAt: '', updatedAt: '', type: 'lumpOverpayment', date: '2024-06-01', amount: 1_000_000 },
      ],
    };
    const result = computeLoanWithEvents(payoffLoan, 0);
    expect(result.totalTermInMonths).toBeLessThan(120);
  });
});
