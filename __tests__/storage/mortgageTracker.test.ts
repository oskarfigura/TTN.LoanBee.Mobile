import { describe, expect, it } from '@jest/globals';
import {
  canActivateDeal,
  getMortgageTrackerSummary,
  getTimelineWarnings,
  projectDeal,
  recalculateLaterDealOpeningBalances,
  removeDealAndRecalculateLater,
} from '../../src/mortgage/tracker';
import { removeMortgageEvent, upsertMortgageEvent } from '../../src/mortgage/events';
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

  it('blocks activation of a draft when an earlier draft is still in front of it', () => {
    const previous = {
      ...makeMortgage().deals[0],
      status: 'completed' as const,
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 210000,
        feesAdded: 0,
      },
    };
    const firstDraft = {
      ...previous,
      id: 'first-draft',
      status: 'draft' as const,
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      completion: undefined,
    };
    const secondDraft = {
      ...firstDraft,
      id: 'second-draft',
      startDate: '2036-06-03',
      endDate: '2041-06-03',
    };
    const loan = makeMortgage({
      deals: [previous, firstDraft, secondDraft],
    });

    expect(canActivateDeal(loan, 'second-draft')).toBe(false);
  });

  it('recalculates later deal opening balances from the previous closing balance', () => {
    const completed = {
      ...makeMortgage().deals[0],
      status: 'completed' as const,
      endDate: '2031-06-01',
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 205000,
        feesAdded: 0,
      },
    };
    const next = {
      ...completed,
      id: 'next',
      status: 'draft' as const,
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      openingBalance: 210000,
      completion: undefined,
    };
    const loan = makeMortgage({
      deals: [completed, next],
    });

    const updatedLoan = recalculateLaterDealOpeningBalances(loan, completed.id);

    expect(updatedLoan.deals.find(deal => deal.id === 'next')?.openingBalance).toBe(205000);
  });

  it('rebases later drafts after deleting an earlier draft', () => {
    const completed = {
      ...makeMortgage().deals[0],
      status: 'completed' as const,
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 205000,
        feesAdded: 0,
      },
    };
    const firstDraft = {
      ...completed,
      id: 'first-draft',
      status: 'draft' as const,
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      openingBalance: 205000,
      completion: undefined,
    };
    const secondDraft = {
      ...firstDraft,
      id: 'second-draft',
      startDate: '2036-06-03',
      endDate: '2041-06-03',
      openingBalance: 180000,
    };
    const loan = makeMortgage({
      deals: [completed, firstDraft, secondDraft],
    });

    const updatedLoan = removeDealAndRecalculateLater(loan, firstDraft.id);

    expect(updatedLoan.deals.map(deal => deal.id)).toEqual(['deal-current', 'second-draft']);
    expect(updatedLoan.deals.find(deal => deal.id === 'second-draft')?.openingBalance).toBe(205000);
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

  it('edits an event while preserving id and created date', () => {
    const loan = makeMortgage({
      events: [
        {
          id: 'event-1',
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
          dealId: 'deal-current',
          type: 'lumpOverpayment',
          date: '2026-07-01',
          amount: 5000,
        },
      ],
    });

    const updated = upsertMortgageEvent(loan, {
      ...loan.events[0],
      updatedAt: '2026-07-02T00:00:00.000Z',
      amount: 7000,
    });

    expect(updated.events).toHaveLength(1);
    expect(updated.events[0].id).toBe('event-1');
    expect(updated.events[0].createdAt).toBe('2026-07-01T00:00:00.000Z');
    expect(updated.events[0].updatedAt).toBe('2026-07-02T00:00:00.000Z');
    expect(updated.events[0].amount).toBe(7000);
  });

  it('deletes only the selected event', () => {
    const loan = makeMortgage({
      events: [
        {
          id: 'keep',
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
          dealId: 'deal-current',
          type: 'note',
          date: '2026-07-01',
          note: 'Keep this',
        },
        {
          id: 'remove',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
          dealId: 'deal-current',
          type: 'balanceCheckpoint',
          date: '2026-08-01',
          balance: 230000,
        },
      ],
    });

    const updated = removeMortgageEvent(loan, 'remove');

    expect(updated.events).toHaveLength(1);
    expect(updated.events[0].id).toBe('keep');
  });

  it('reflects edited and deleted events in mortgage projections', () => {
    const loan = makeMortgage({
      events: [
        {
          id: 'overpay',
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
          dealId: 'deal-current',
          type: 'lumpOverpayment',
          date: '2026-07-01',
          amount: 2000,
        },
      ],
    });

    const originalProjection = projectDeal(loan.deals[0], loan.events, new Date('2026-09-01T00:00:00'), true);
    const editedLoan = upsertMortgageEvent(loan, {
      ...loan.events[0],
      updatedAt: '2026-07-02T00:00:00.000Z',
      amount: 8000,
    });
    const editedProjection = projectDeal(editedLoan.deals[0], editedLoan.events, new Date('2026-09-01T00:00:00'), true);
    const deletedLoan = removeMortgageEvent(editedLoan, 'overpay');
    const deletedProjection = projectDeal(deletedLoan.deals[0], deletedLoan.events, new Date('2026-09-01T00:00:00'), true);

    expect(editedProjection.balance).toBeLessThan(originalProjection.balance);
    expect(deletedProjection.balance).toBeGreaterThan(editedProjection.balance);
  });
});
