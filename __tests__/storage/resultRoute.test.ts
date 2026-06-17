import { beforeEach, describe, expect, it } from '@jest/globals';
import { getDraftResultSession } from '@/shared/domain/results/draftResultStore';
import {
  beginDraftResult,
  buildSavedLoanResultParams,
  getResultForSavedLoan,
  getResultForFormValues,
  getBaselineResultForSavedLoan,
  getBaselineResultForFormValues,
} from '@/shared/domain/results/loanResultRoute';
import { recentCalculationsStorage } from '@/shared/lib/storage/recentCalculations';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';

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

beforeEach(() => {
  recentCalculationsStorage.clear();
});

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
      interest: 4.2,
      termInYears: 10,
      termInMonths: 0,
      downPayment: 0,
      downPaymentType: 'cash' as const,
      desiredMonthlyPayment: 0,
      additionalMonthlyPayment: 250,
      startDate: '2026-01-01',
      calculationType: 'term' as const,
    };

    const params = beginDraftResult(result, formValues, 'USD');
    const session = getDraftResultSession<typeof formValues>(params.draftId);
    const recent = recentCalculationsStorage.getById(params.recentId);

    expect(params.mode).toBe('draft');
    expect(params.currency).toBe('USD');
    expect(params.draftId).toMatch(/^draft_/);
    expect(params.recentId).toMatch(/^recent_/);
    expect(session).toMatchObject({
      id: params.draftId,
      result,
      formValues,
      currency: 'USD',
    });
    expect(recent).toMatchObject({
      id: params.recentId,
      currency: 'USD',
      formValues,
    });
    expect(recent?.category).toBeUndefined();
    expect(typeof session?.createdAt).toBe('number');
  });
});

describe('baseline (no-overpayment) result', () => {
  const last = (arr: number[]) => arr[arr.length - 1];

  it('pays off slower without the overpayment, so the baseline runs longer', () => {
    const overpaid = getResultForSavedLoan(loan);
    const baseline = getBaselineResultForSavedLoan(loan);

    // Removing the £100/mo overpayment means the loan takes more months to clear.
    expect(baseline.loanChartRemainingArray.length).toBeGreaterThan(
      overpaid.loanChartRemainingArray.length,
    );
    // And total interest is higher than the scenario with overpayments.
    expect(baseline.totalInterestPaid).toBeGreaterThan(overpaid.totalInterestPaid);
  });

  it('matches the scenario when there is no overpayment to strip', () => {
    const form = {
      currency: 'GBP' as const,
      loanAmount: 200000,
      interest: 4,
      termInYears: 25,
      termInMonths: 0,
      downPayment: 0,
      downPaymentType: 'cash' as const,
      desiredMonthlyPayment: 0,
      additionalMonthlyPayment: 0,
      startDate: '2026-01-01',
      calculationType: 'term' as const,
    };

    const result = getResultForFormValues(form);
    const baseline = getBaselineResultForFormValues(form);

    expect(baseline.loanChartRemainingArray).toEqual(result.loanChartRemainingArray);
    expect(last(baseline.loanChartRemainingArray)).toBe(last(result.loanChartRemainingArray));
  });
});
