import { describe, expect, it } from '@jest/globals';
import {
  buildScenarioRemainingArray,
  computeLoanOverpayments,
} from '@/shared/domain/loans/loanOverpaymentCalc';
import { computeLoanWithEvents } from '@/shared/domain/loans/loanScenario';
import { LoanFormSnapshot, SavedLoan } from '@/shared/domain/types/SavedLoan';

const form: LoanFormSnapshot = {
  loanAmount: 250000,
  interest: 4.5,
  termInYears: 25,
  termInMonths: 0,
  downPayment: 10,
  downPaymentType: 'PERCENT',
  desiredMonthlyPayment: null,
  additionalMonthlyPayment: 0,
  startDate: '2026-01-01',
  calculationType: 'TERM',
  currency: 'GBP',
};

const makeLoan = (): SavedLoan => ({
  id: 'loan-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nickname: 'Home',
  category: 'loan',
  currency: 'GBP',
  status: 'tracked',
  pinnedToDashboard: false,
  deals: [],
  events: [],
  formSnapshot: form,
  resultSnapshot: {
    monthlyPayments: 0,
    totalAmountPaid: 0,
    totalInterestPaid: 0,
    totalInterestPaidBaseline: 0,
    termInYears: 0,
    termInMonths: 0,
    totalTermInMonths: 0,
  },
});

describe('loan overpayment calculations', () => {
  it('applies lump sums made in the same calendar month as the loan start', () => {
    const baseline = computeLoanOverpayments(form, 0, []);
    const scenario = computeLoanOverpayments(form, 0, [
      { date: '2026-01-15', amount: 10000 },
    ]);

    expect(scenario.interestSaved).toBeGreaterThan(0);
    expect(scenario.monthsSaved).toBeGreaterThan(0);
    expect(scenario.scenario.totalInterestPaid).toBeLessThan(baseline.scenario.totalInterestPaid);
  });

  it('drops the balance immediately in the scenario chart for same-month lump sums', () => {
    const balances = buildScenarioRemainingArray(form, 0, [
      { date: '2026-01-15', amount: 10000 },
    ]);

    expect(balances[0]).toBe(215000);
    expect(balances[1]).toBeLessThan(balances[0]);
  });

  it('includes same-month lump sums in saved-loan scenario calculations', () => {
    const loan = makeLoan();
    loan.events = [{
      id: 'event-1',
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
      type: 'lumpOverpayment',
      date: '2026-01-15',
      amount: 10000,
    }];

    const scenario = computeLoanWithEvents(loan);

    expect(scenario.totalInterestPaid).toBeLessThan(computeLoanWithEvents(makeLoan()).totalInterestPaid);
    expect(scenario.totalTermInMonths).toBeLessThan(computeLoanWithEvents(makeLoan()).totalTermInMonths);
  });
});
