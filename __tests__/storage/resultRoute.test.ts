import { describe, expect, it } from '@jest/globals';
import { getDraftResultSession } from '../../src/results/draftResultStore';
import {
  buildDraftResultParams,
  buildSavedLoanResultParams,
  getResultForSavedLoan,
} from '../../src/results/loanResultRoute';
import { SavedLoan } from '../../src/types/SavedLoan';

const loan: SavedLoan = {
  id: 'loan-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nickname: 'Home',
  category: 'mortgage',
  currency: 'GBP',
  status: 'tracked',
  pinnedToDashboard: true,
  dashboardOrder: 1,
  deals: [
    {
      id: 'deal-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      name: 'Initial deal',
      status: 'active',
      startDate: '2026-01-01',
      endDate: '2049-03-01',
      openingBalance: 225000,
      interestRate: 4,
      repaymentType: 'repayment',
      monthlyPayment: 1200,
      regularOverpayment: 100,
      remainingTermInYears: 25,
      remainingTermInMonths: 0,
    },
  ],
  events: [],
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

  it('creates a retrievable draft result session for draft routing', () => {
    const result = getResultForSavedLoan(loan);
    const formValues = {
      currency: 'USD',
      loanAmount: 180000,
      additionalMonthlyPayment: 250,
    };

    const params = buildDraftResultParams(result, formValues, 'USD');
    const session = getDraftResultSession<typeof formValues>(params.draftId);

    expect(params.mode).toBe('draft');
    expect(params.currency).toBe('USD');
    expect(params.draftId).toMatch(/^draft_/);
    expect(session).toMatchObject({
      id: params.draftId,
      result,
      formValues,
      currency: 'USD',
    });
    expect(typeof session?.createdAt).toBe('number');
  });
});
