import { describe, expect, it } from '@jest/globals';
import { buildInitialDeal } from '../../src/loans/loanGroupFactory';
import { LoanGroup } from '../../src/types/SavedLoan';

const makeMortgage = (overrides: Partial<LoanGroup> = {}): LoanGroup => ({
  id: 'mortgage-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nickname: 'Home',
  lender: 'Halifax',
  category: 'mortgage',
  currency: 'GBP',
  mortgageTermInMonths: 420,
  status: 'tracked',
  pinnedToDashboard: false,
  deals: [],
  events: [],
  formSnapshot: {
    loanAmount: 300000,
    interest: 4.2,
    termInYears: 35,
    termInMonths: 0,
    downPayment: 0,
    downPaymentType: 'CASH',
    desiredMonthlyPayment: null,
    additionalMonthlyPayment: null,
    startDate: '2026-01-01',
    calculationType: 'TERM',
    currency: 'GBP',
  },
  resultSnapshot: {
    monthlyPayments: 1295,
    totalAmountPaid: 543900,
    totalInterestPaid: 243900,
    totalInterestPaidBaseline: 243900,
    termInYears: 35,
    termInMonths: 0,
    totalTermInMonths: 420,
  },
  ...overrides,
});

describe('loanGroupFactory', () => {
  it('builds the first mortgage deal with a separate current deal duration', () => {
    const deal = buildInitialDeal('deal-1', makeMortgage(), {
      name: '5-year fixed',
      durationInMonths: 60,
      source: 'userDeal',
    });

    expect(deal.name).toBe('5-year fixed');
    expect(deal.startDate).toBe('2026-01-01');
    expect(deal.endDate).toBe('2031-01-01');
    expect(deal.remainingTermInYears).toBe(35);
    expect(deal.remainingTermInMonths).toBe(0);
    expect(deal.source).toBe('userDeal');
  });

  it('marks bare-bones first mortgage deals as estimate-backed by default', () => {
    const deal = buildInitialDeal('deal-1', makeMortgage());

    expect(deal.endDate).toBe('2061-01-01');
    expect(deal.source).toBe('estimate');
  });
});
