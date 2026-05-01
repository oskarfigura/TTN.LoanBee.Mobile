import { describe, expect, it } from '@jest/globals';
import { buildSavedLoanResultParams } from '../../src/results/loanResultRoute';
import { SavedLoan } from '../../src/types/SavedLoan';

const loan: SavedLoan = {
  id: 'loan-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nickname: 'Home',
  category: 'mortgage',
  currency: 'GBP',
  formSnapshot: {
    loanAmount: 250000,
    interest: 4,
    termInYears: 25,
    termInMonths: 0,
    downPayment: 10,
    downPaymentType: 'PERCENT',
    desiredMonthlyPayment: null,
    additionalMonthlyPayment: 100,
    startDate: '2026-01-01',
    calculationType: 'TERM',
    currency: 'GBP',
  },
  resultSnapshot: {
    monthlyPayments: 1200,
    totalAmountPaid: 360000,
    totalInterestPaid: 110000,
    totalInterestPaidBaseline: 120000,
    termInYears: 23,
    termInMonths: 2,
    totalTermInMonths: 278,
  },
};

describe('saved loan result params', () => {
  it('passes a saved loan snapshot into result routing', () => {
    const params = buildSavedLoanResultParams(loan);

    expect(params.mode).toBe('saved');
    expect(params.savedLoanId).toBe('loan-1');
    expect(params.currency).toBe('GBP');
    expect(JSON.parse(params.savedLoan)).toEqual(loan);
  });
});
