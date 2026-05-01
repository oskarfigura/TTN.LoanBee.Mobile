import { describe, expect, it } from '@jest/globals';
import {
  canActivateDeal,
  getMortgageTrackerSummary,
  getTimelineWarnings,
  projectDeal,
} from '../../src/mortgage/tracker';
import { LoanGroup } from '../../src/types/SavedLoan';

const makeMortgage = (overrides: Partial<LoanGroup> = {}): LoanGroup => ({
  id: 'mortgage-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nickname: 'Home mortgage',
  lender: 'Halifax',
  category: 'mortgage',
  currency: 'GBP',
  status: 'tracked',
  pinnedToDashboard: true,
  deals: [
    {
      id: 'deal-current',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      name: '5-year Fixed',
      lender: 'Halifax',
      status: 'active',
      startDate: '2026-06-01',
      endDate: '2031-06-01',
      openingBalance: 240000,
      interestRate: 4.2,
      repaymentType: 'repayment',
      monthlyPayment: 1385,
      regularOverpayment: 150,
      remainingTermInYears: 25,
      remainingTermInMonths: 0,
    },
  ],
  events: [],
  formSnapshot: {
    loanAmount: 240000,
    interest: 4.2,
    termInYears: 25,
    termInMonths: 0,
    downPayment: 0,
    downPaymentType: 'CASH',
    desiredMonthlyPayment: null,
    additionalMonthlyPayment: 150,
    startDate: '2026-06-01',
    calculationType: 'TERM',
    currency: 'GBP',
  },
  resultSnapshot: {
    monthlyPayments: 1385,
    totalAmountPaid: 415500,
    totalInterestPaid: 175500,
    totalInterestPaidBaseline: 190000,
    termInYears: 25,
    termInMonths: 0,
    totalTermInMonths: 300,
  },
  ...overrides,
});

describe('mortgage tracker', () => {
  it('excludes draft deals from dashboard totals', () => {
    const loan = makeMortgage({
      deals: [
        makeMortgage().deals[0],
        {
          ...makeMortgage().deals[0],
          id: 'draft',
          name: 'Next Deal',
          status: 'draft',
          startDate: '2031-07-01',
          endDate: '2036-07-01',
          openingBalance: 200000,
        },
      ],
    });

    const summary = getMortgageTrackerSummary(loan, new Date('2026-07-01T00:00:00'));

    expect(summary.nextDraftDeal?.id).toBe('draft');
    expect(summary.currentDeal?.id).toBe('deal-current');
    expect(summary.originalBalance).toBe(240000);
  });

  it('applies lump overpayments and missed payments to active deal projections', () => {
    const loan = makeMortgage({
      events: [
        {
          id: 'overpay',
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
          dealId: 'deal-current',
          type: 'lumpOverpayment',
          date: '2026-07-01',
          amount: 5000,
        },
        {
          id: 'missed',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
          dealId: 'deal-current',
          type: 'missedPayment',
          date: '2026-08-01',
        },
      ],
    });

    const actual = projectDeal(loan.deals[0], loan.events, new Date('2026-09-01T00:00:00'), true);
    const baseline = projectDeal(loan.deals[0], loan.events, new Date('2026-09-01T00:00:00'), false);

    expect(actual.balance).toBeLessThan(baseline.balance);
    expect(actual.totalPaid).toBeGreaterThan(baseline.totalPaid);
  });

  it('uses bank-confirmed closing balance when a deal is completed', () => {
    const loan = makeMortgage({
      deals: [
        {
          ...makeMortgage().deals[0],
          status: 'completed',
          completion: {
            completedAt: '2031-06-01',
            closingBalance: 210000,
            feesAdded: 995,
          },
        },
      ],
    });

    const summary = getMortgageTrackerSummary(loan, new Date('2032-01-01T00:00:00'));

    expect(summary.currentBalance).toBe(210000);
    expect(summary.principalPaid).toBe(30000);
  });

  it('blocks activation of a draft next deal until the previous deal is completed', () => {
    const loan = makeMortgage({
      deals: [
        makeMortgage().deals[0],
        {
          ...makeMortgage().deals[0],
          id: 'next',
          status: 'draft',
          startDate: '2031-06-02',
          endDate: '2036-06-02',
        },
      ],
    });

    expect(canActivateDeal(loan, 'next')).toBe(false);
  });

  it('allows activation of a draft next deal after the previous deal is completed', () => {
    const previous = {
      ...makeMortgage().deals[0],
      status: 'completed' as const,
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 210000,
        feesAdded: 0,
      },
    };
    const loan = makeMortgage({
      deals: [
        previous,
        {
          ...previous,
          id: 'next',
          status: 'draft',
          startDate: '2031-06-02',
          endDate: '2036-06-02',
          completion: undefined,
        },
      ],
    });

    expect(canActivateDeal(loan, 'next')).toBe(true);
  });

  it('reports timeline warnings for gaps, overlaps, incomplete active deals, and blocked drafts', () => {
    const loan = makeMortgage({
      deals: [
        {
          ...makeMortgage().deals[0],
          id: 'past',
          status: 'completed',
          startDate: '2024-05-01',
          endDate: '2026-05-01',
          completion: {
            completedAt: '2026-05-01',
            closingBalance: 238000,
            feesAdded: 0,
          },
        },
        {
          ...makeMortgage().deals[0],
          id: 'overlap-source',
          status: 'completed',
          startDate: '2026-06-15',
          endDate: '2026-06-20',
          completion: {
            completedAt: '2026-06-20',
            closingBalance: 237000,
            feesAdded: 0,
          },
        },
        {
          ...makeMortgage().deals[0],
          startDate: '2026-06-18',
          endDate: '2026-07-01',
        },
        {
          ...makeMortgage().deals[0],
          id: 'draft',
          status: 'draft',
          startDate: '2026-07-01',
          endDate: '2031-07-01',
        },
      ],
    });

    const warnings = getTimelineWarnings(loan, new Date('2026-08-01T00:00:00'));

    expect(warnings.map(warning => warning.type)).toEqual(
      expect.arrayContaining(['gap', 'overlap', 'incompleteActiveDeal', 'draftBlocked']),
    );
  });
});
