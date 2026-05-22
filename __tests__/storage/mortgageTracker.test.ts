import { describe, expect, it } from '@jest/globals';
import {
  buildNextDealDraft,
  canDeleteDeal,
  canActivateDeal,
  canEditDeal,
  canEditInitialDeal,
  CURRENT_STATE_PROJECTION_DEAL_ID,
  formatDealDuration,
  generateDefaultDealName,
  getDealOverpaymentImpact,
  getMortgageTermInMonths,
  getMortgageTrackerSummary,
  getNextDealStartDate,
  getPublishedDeals,
  getRemainingMortgageTermInMonths,
  getTimelineWarnings,
  normaliseDealChain,
  projectDeal,
  recalculateLaterDealOpeningBalances,
  removeDealAndRecalculateLater,
  removeLaterDealsAndEvents,
  withMortgageTermInMonths,
} from '../../src/mortgage/tracker';
import { buildMortgageProjection } from '../../src/mortgage/projection';
import { removeMortgageEvent, upsertMortgageEvent } from '../../src/mortgage/events';
import { buildSavedLoanDisplayDetails, buildSavedLoanSummary } from '../../src/loans/loanInsightSummary';
import { getResultForSavedLoan } from '../../src/results/loanResultRoute';
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

  it('keeps saved list and mortgage summary display details in sync with the current deal', () => {
    const loan = makeMortgage({
      lender: 'Original Bank',
      deals: [{
        ...makeMortgage().deals[0],
        lender: 'Current Bank',
        interestRate: 5.1,
        monthlyPayment: 1525,
      }],
    });
    const asOf = new Date('2026-07-01T00:00:00');
    const displayDetails = buildSavedLoanDisplayDetails(loan, asOf);
    const savedSummary = buildSavedLoanSummary(
      loan,
      getResultForSavedLoan(loan),
      asOf,
      'en',
    );

    expect(displayDetails.currentDeal?.id).toBe('deal-current');
    expect(displayDetails.lender).toBe('Current Bank');
    expect(savedSummary.metrics).toEqual(expect.arrayContaining([
      { labelKey: 'results.monthlyPayment', value: '£1,525.00' },
      { labelKey: 'calculator.interestRate', value: '5.1%' },
    ]));
  });

  it('formats saved-loan summary amounts using the loan currency', () => {
    const loan = makeMortgage({
      currency: 'PLN',
      formSnapshot: {
        ...makeMortgage().formSnapshot,
        currency: 'GBP',
      },
    });
    const asOf = new Date('2026-07-01T00:00:00');
    const savedSummary = buildSavedLoanSummary(
      loan,
      getResultForSavedLoan(loan),
      asOf,
      'pl',
    );

    expect(savedSummary.hero.value.startsWith('zł')).toBe(true);
    expect(savedSummary.metrics).toEqual(expect.arrayContaining([
      { labelKey: 'results.monthlyPayment', value: 'zł1,385.00' },
      { labelKey: 'results.totalInterest', value: expect.stringMatching(/^zł/) },
      { labelKey: 'results.totalCost', value: expect.stringMatching(/^zł/) },
    ]));
  });

  it('projects a saved mortgage without deal history from the current-state snapshot', () => {
    const loan = makeMortgage({
      deals: [],
      formSnapshot: {
        ...makeMortgage().formSnapshot,
        loanAmount: 300000,
        downPayment: 60000,
        downPaymentType: 'CASH',
      },
    });

    const summary = getMortgageTrackerSummary(loan, new Date('2026-07-15T12:00:00Z'));
    const projection = buildMortgageProjection(loan, new Date('2026-07-15T12:00:00Z'));

    expect(summary.currentDeal).toBeUndefined();
    expect(summary.originalBalance).toBe(240000);
    expect(summary.currentBalance).toBeLessThan(240000);
    expect(projection.publishedDealCount).toBe(0);
    expect(projection.dealSegments[0]?.dealId).toBe(CURRENT_STATE_PROJECTION_DEAL_ID);
    expect(projection.dealSegments[0]?.isCurrent).toBe(true);
    expect(projection.points.length).toBeGreaterThan(0);
  });

  it('treats a marker-backed estimate deal as the saved mortgage estimate', () => {
    const loan = makeMortgage({
      deals: [{
        ...makeMortgage().deals[0],
        name: '25-year Fixed',
        endDate: '2051-06-01',
        source: 'estimate',
      }],
    });

    const summary = getMortgageTrackerSummary(loan, new Date('2026-07-15T12:00:00Z'));
    const projection = buildMortgageProjection(loan, new Date('2026-07-15T12:00:00Z'));

    expect(getPublishedDeals(loan)).toHaveLength(0);
    expect(summary.currentDeal).toBeUndefined();
    expect(projection.publishedDealCount).toBe(0);
    expect(projection.dealSegments[0]?.dealId).toBe(CURRENT_STATE_PROJECTION_DEAL_ID);
  });

  it('treats an old unmarked single full-term deal as estimate-backed', () => {
    const loan = makeMortgage({
      deals: [{
        ...makeMortgage().deals[0],
        name: '25-year Fixed',
        endDate: '2051-06-01',
      }],
    });

    const summary = getMortgageTrackerSummary(loan, new Date('2026-07-15T12:00:00Z'));
    const displayDetails = buildSavedLoanDisplayDetails(loan, new Date('2026-07-15T12:00:00Z'));

    expect(getPublishedDeals(loan)).toHaveLength(0);
    expect(summary.currentDeal).toBeUndefined();
    expect(displayDetails.currentDeal).toBeUndefined();
    expect(displayDetails.lender).toBe('Halifax');
  });

  it('keeps an explicit user deal visible even when it spans the full mortgage term', () => {
    const loan = makeMortgage({
      deals: [{
        ...makeMortgage().deals[0],
        name: '25-year Fixed',
        endDate: '2051-06-01',
        source: 'userDeal',
      }],
    });

    const summary = getMortgageTrackerSummary(loan, new Date('2026-07-15T12:00:00Z'));

    expect(getPublishedDeals(loan)).toHaveLength(1);
    expect(summary.currentDeal?.name).toBe('25-year Fixed');
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

  it('does not apply lump sums scheduled later in the same month as the as-of date', () => {
    const loan = makeMortgage({
      events: [
        {
          id: 'late-overpay',
          createdAt: '2026-09-30T00:00:00.000Z',
          updatedAt: '2026-09-30T00:00:00.000Z',
          dealId: 'deal-current',
          type: 'lumpOverpayment',
          date: '2026-09-30',
          amount: 5000,
        },
      ],
    });
    const asOf = new Date('2026-09-01T00:00:00');

    const actual = projectDeal(loan.deals[0], loan.events, asOf, true);
    const withoutFutureLump = projectDeal(loan.deals[0], [], asOf, true);

    expect(actual.balance).toBe(withoutFutureLump.balance);
    expect(actual.totalPaid).toBe(withoutFutureLump.totalPaid);
  });

  it('keeps current balance anchored to the current deal before future deals begin', () => {
    const currentDeal = makeMortgage().deals[0];
    const nextDeal = {
      ...currentDeal,
      id: 'deal-next',
      name: 'Tracker follow-up',
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      openingBalance: 210000,
      additionalBorrowing: 25000,
    };
    const loan = makeMortgage({
      deals: [currentDeal, nextDeal],
    });
    const asOf = new Date('2026-09-01T00:00:00');

    const summary = getMortgageTrackerSummary(loan, asOf);
    const currentProjection = projectDeal(currentDeal, loan.events, asOf, true);

    expect(summary.currentBalance).toBeCloseTo(currentProjection.balance, 2);
    expect(summary.principalPaid).toBeCloseTo(240000 - currentProjection.balance, 2);
    expect(summary.balanceProgress).toBeCloseTo((240000 - currentProjection.balance) / 240000, 4);
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

  it('returns an existing draft instead of creating a second draft', () => {
    const completed = {
      ...makeMortgage().deals[0],
      status: 'completed' as const,
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 205000,
        feesAdded: 0,
      },
    };
    const draft = {
      ...completed,
      id: 'draft',
      status: 'draft' as const,
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      openingBalance: 205000,
      completion: undefined,
    };
    const loan = makeMortgage({
      deals: [completed, draft],
    });

    const nextDraft = buildNextDealDraft(loan, 'new-draft', '2031-01-01T00:00:00.000Z');

    expect(nextDraft.id).toBe('draft');
  });

  it('builds the next draft without a date gap and calculates the remaining-term payment', () => {
    const completed = {
      ...makeMortgage().deals[0],
      status: 'completed' as const,
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 205000,
        feesAdded: 0,
      },
    };
    const loan = makeMortgage({ deals: [completed] });

    const draft = buildNextDealDraft(loan, 'next', '2031-06-01T00:00:00.000Z');

    expect(draft.startDate).toBe(getNextDealStartDate(completed));
    expect(draft.openingBalance).toBe(205000);
    expect(draft.remainingTermInYears).toBe(20);
    expect(draft.remainingTermInMonths).toBe(0);
    expect(draft.monthlyPayment).toBeGreaterThan(1200);
  });

  it('rebases a draft after completing the current deal', () => {
    const current = makeMortgage().deals[0];
    const draft = {
      ...current,
      id: 'draft',
      status: 'draft' as const,
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      openingBalance: 210000,
    };
    const completedCurrent = {
      ...current,
      status: 'completed' as const,
      completion: {
        completedAt: '2030-12-15',
        closingBalance: 215000,
        feesAdded: 0,
      },
    };
    const loan = makeMortgage({
      deals: [completedCurrent, draft],
    });

    const updatedLoan = normaliseDealChain(loan, completedCurrent.id);
    const updatedDraft = updatedLoan.deals.find(deal => deal.id === 'draft');

    expect(updatedDraft?.startDate).toBe('2030-12-16');
    expect(updatedDraft?.endDate).toBe('2035-12-16');
    expect(updatedDraft?.openingBalance).toBe(215000);
  });

  it('only deletes the latest chronological deal', () => {
    const completed = {
      ...makeMortgage().deals[0],
      status: 'completed' as const,
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 205000,
        feesAdded: 0,
      },
    };
    const latest = {
      ...completed,
      id: 'latest',
      status: 'draft' as const,
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      completion: undefined,
    };
    const loan = makeMortgage({
      deals: [completed, latest],
      events: [{
        id: 'event-latest',
        createdAt: '2031-07-01T00:00:00.000Z',
        updatedAt: '2031-07-01T00:00:00.000Z',
        dealId: 'latest',
        type: 'note',
        date: '2031-07-01',
        note: 'Draft note',
      }],
    });

    expect(canDeleteDeal(loan, completed.id)).toBe(false);
    expect(removeDealAndRecalculateLater(loan, completed.id)).toBe(loan);

    const updatedLoan = removeDealAndRecalculateLater(loan, latest.id);

    expect(updatedLoan.deals.map(deal => deal.id)).toEqual(['deal-current']);
    expect(updatedLoan.events).toHaveLength(0);
  });

  it('does not delete the sole first deal', () => {
    const loan = makeMortgage({
      events: [{
        id: 'event-current',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        dealId: 'deal-current',
        type: 'note',
        date: '2026-07-01',
        note: 'Current note',
      }],
    });

    const updatedLoan = removeDealAndRecalculateLater(loan, 'deal-current');

    expect(canDeleteDeal(loan, 'deal-current')).toBe(false);
    expect(updatedLoan).toBe(loan);
    expect(updatedLoan.deals).toHaveLength(1);
    expect(updatedLoan.events).toHaveLength(1);
  });

  it('generates default deal names from duration and repayment type', () => {
    expect(generateDefaultDealName(2, 0, 'repayment')).toBe('2-year Fixed');
    expect(generateDefaultDealName(5, 0, 'repayment')).toBe('5-year Fixed');
    expect(generateDefaultDealName(2, 0, 'interestOnly')).toBe('2-year Interest Only');
    expect(generateDefaultDealName(0, 6, 'repayment')).toBe('6-month Fixed');
    expect(generateDefaultDealName(2, 6, 'interestOnly')).toBe('2y 6m Interest Only');
    expect(generateDefaultDealName(0, 0, 'repayment')).toBe('Fixed deal');
    expect(generateDefaultDealName(0, 0, 'interestOnly')).toBe('Interest Only deal');
  });

  it('uses generateDefaultDealName when seeding the next deal draft', () => {
    const completed = {
      ...makeMortgage().deals[0],
      status: 'completed' as const,
      repaymentType: 'interestOnly' as const,
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 205000,
        feesAdded: 0,
      },
    };
    const loan = makeMortgage({ deals: [completed] });

    const draft = buildNextDealDraft(loan, 'next', '2031-06-01T00:00:00.000Z');

    expect(draft.name).toBe('5-year Interest Only');
    expect(draft.repaymentType).toBe('interestOnly');
  });

  it('formats deal durations for years, half-years, mixed terms, and months', () => {
    expect(formatDealDuration(36, 'en')).toBe('3 years');
    expect(formatDealDuration(30, 'en')).toBe('2.5 years');
    expect(formatDealDuration(18, 'en')).toBe('18 months');
    expect(formatDealDuration(27, 'en')).toBe('2 years 3 months');
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

  it('aggregates completed and active deals into mortgage projection charts and schedule', () => {
    const completed = {
      ...makeMortgage().deals[0],
      id: 'completed',
      status: 'completed' as const,
      startDate: '2026-06-01',
      endDate: '2031-06-01',
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 210000,
        feesAdded: 0,
      },
    };
    const active = {
      ...makeMortgage().deals[0],
      id: 'active',
      status: 'active' as const,
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      openingBalance: 210000,
      interestRate: 3.8,
      monthlyPayment: 1300,
      regularOverpayment: 200,
      completion: undefined,
    };
    const loan = makeMortgage({
      deals: [completed, active],
      events: [
        {
          id: 'active-overpay',
          createdAt: '2031-08-01T00:00:00.000Z',
          updatedAt: '2031-08-01T00:00:00.000Z',
          dealId: 'active',
          type: 'lumpOverpayment',
          date: '2031-08-01',
          amount: 5000,
        },
        {
          id: 'active-checkpoint',
          createdAt: '2031-09-01T00:00:00.000Z',
          updatedAt: '2031-09-01T00:00:00.000Z',
          dealId: 'active',
          type: 'balanceCheckpoint',
          date: '2031-09-01',
          balance: 202000,
        },
      ],
    });

    const projection = buildMortgageProjection(loan, new Date('2031-10-01T00:00:00'));

    expect(projection.publishedDealCount).toBe(2);
    expect(projection.points.some(point => point.dealId === 'completed')).toBe(true);
    expect(projection.points.some(point => point.dealId === 'active')).toBe(true);
    expect(projection.currentBalance).toBeLessThan(202000);
    expect(projection.loanChartMonthlyArray.length).toBe(projection.tableItems.length + 1);
    expect(projection.overpaymentSavingsEstimate).toBeGreaterThan(0);
    expect(projection.dealSegments.map(segment => segment.dealId)).toEqual(['completed', 'active']);
    expect(projection.dealSegments.find(segment => segment.dealId === 'active')?.isCurrent).toBe(true);
    expect(projection.tableItems.some(item => item.dealName === '5-year Fixed')).toBe(true);
  });

  it('excludes draft deals from mortgage projection totals and chart points', () => {
    const draft = {
      ...makeMortgage().deals[0],
      id: 'draft',
      status: 'draft' as const,
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      openingBalance: 999999,
      interestRate: 12,
    };
    const loan = makeMortgage({
      deals: [makeMortgage().deals[0], draft],
    });

    const projection = buildMortgageProjection(loan, new Date('2026-10-01T00:00:00'));

    expect(projection.publishedDealCount).toBe(1);
    expect(projection.draftDealCount).toBe(1);
    expect(projection.points.some(point => point.dealId === 'draft')).toBe(false);
    expect(projection.loanChartRemainingArray).not.toContain(999999);
  });

  it('removes later deals and their events when correcting a completed deal', () => {
    const completed = {
      ...makeMortgage().deals[0],
      id: 'completed',
      status: 'completed' as const,
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 205000,
        feesAdded: 0,
      },
    };
    const next = {
      ...completed,
      id: 'next',
      status: 'active' as const,
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      openingBalance: 205000,
      completion: undefined,
    };
    const loan = makeMortgage({
      deals: [completed, next],
      events: [
        {
          id: 'keep',
          createdAt: '2030-01-01T00:00:00.000Z',
          updatedAt: '2030-01-01T00:00:00.000Z',
          dealId: 'completed',
          type: 'note',
          date: '2030-01-01',
          note: 'Historic note',
        },
        {
          id: 'remove',
          createdAt: '2032-01-01T00:00:00.000Z',
          updatedAt: '2032-01-01T00:00:00.000Z',
          dealId: 'next',
          type: 'lumpOverpayment',
          date: '2032-01-01',
          amount: 1000,
        },
      ],
    });

    const corrected = removeLaterDealsAndEvents(loan, completed.id);

    expect(corrected.deals.map(deal => deal.id)).toEqual(['completed']);
    expect(corrected.events.map(event => event.id)).toEqual(['keep']);
  });

  it('seeds the next draft with zero additional borrowing', () => {
    const completed = {
      ...makeMortgage().deals[0],
      status: 'completed' as const,
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 205000,
        feesAdded: 0,
      },
    };
    const loan = makeMortgage({ deals: [completed] });

    const draft = buildNextDealDraft(loan, 'next', '2031-06-01T00:00:00.000Z');

    expect(draft.additionalBorrowing).toBe(0);
    expect(draft.openingBalance).toBe(205000);
  });

  it('preserves additional borrowing across normalisation when an earlier deal changes', () => {
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
      openingBalance: 205000 + 30000,
      additionalBorrowing: 30000,
      completion: undefined,
    };
    const loan = makeMortgage({ deals: [completed, next] });

    const updated = recalculateLaterDealOpeningBalances(loan, completed.id);
    const updatedNext = updated.deals.find(deal => deal.id === 'next');

    expect(updatedNext?.additionalBorrowing).toBe(30000);
    expect(updatedNext?.openingBalance).toBe(205000 + 30000);
  });

  it('locks the initial deal once a second deal exists', () => {
    const singleDealLoan = makeMortgage();
    expect(canEditInitialDeal(singleDealLoan)).toBe(true);

    const twoDealLoan = makeMortgage({
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
    expect(canEditInitialDeal(twoDealLoan)).toBe(false);
  });

  it('allows editing only the latest chronological deal', () => {
    const initial = {
      ...makeMortgage().deals[0],
      id: 'initial',
      status: 'completed' as const,
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 205000,
        feesAdded: 0,
      },
    };
    const active = {
      ...makeMortgage().deals[0],
      id: 'active',
      status: 'active' as const,
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      openingBalance: 205000,
      completion: undefined,
    };
    const draft = {
      ...active,
      id: 'draft',
      status: 'draft' as const,
      startDate: '2036-06-03',
      endDate: '2041-06-03',
    };
    const loan = makeMortgage({ deals: [initial, active, draft] });

    expect(canEditDeal(loan, 'initial')).toBe(false);
    expect(canEditDeal(loan, 'active')).toBe(false);
    expect(canEditDeal(loan, 'draft')).toBe(true);
  });

  it('updates the total mortgage term and recomputes remaining term', () => {
    const loan = makeMortgage({ mortgageTermInMonths: 25 * 12 });
    const extended = withMortgageTermInMonths(loan, 40 * 12);

    expect(getMortgageTermInMonths(extended)).toBe(40 * 12);
    const remainingAtStart = getRemainingMortgageTermInMonths(extended, extended.formSnapshot.startDate);
    expect(remainingAtStart).toBe(40 * 12);
  });

  it('counts additional borrowing in mortgage tracker summary so principal paid stays accurate', () => {
    const completed = {
      ...makeMortgage().deals[0],
      id: 'completed',
      status: 'completed' as const,
      startDate: '2026-06-01',
      endDate: '2031-06-01',
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 200000,
        feesAdded: 0,
      },
    };
    const remortgage = {
      ...makeMortgage().deals[0],
      id: 'remortgage',
      status: 'active' as const,
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      openingBalance: 230000,
      additionalBorrowing: 30000,
      completion: undefined,
    };
    const loan = makeMortgage({ deals: [completed, remortgage] });

    const summary = getMortgageTrackerSummary(loan, new Date('2031-06-15T00:00:00'));

    expect(summary.originalBalance).toBe(240000);
    expect(summary.currentBalance).toBeCloseTo(230000, 0);
    expect(summary.principalPaid).toBeCloseTo(40000, 0);
  });

  it('reports zero overpayment impact for a deal without overpayments', () => {
    const loan = makeMortgage({
      deals: [
        {
          ...makeMortgage().deals[0],
          regularOverpayment: 0,
        },
      ],
    });

    const impact = getDealOverpaymentImpact(loan.deals[0], loan.events);

    expect(impact.hasOverpayments).toBe(false);
    expect(impact.totalOverpayments).toBe(0);
    expect(impact.interestSaved).toBe(0);
    expect(impact.extraPrincipalRepaid).toBe(0);
  });

  it('reports interest saved and extra principal repaid for an active deal with overpayments', () => {
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
      ],
    });

    const impact = getDealOverpaymentImpact(loan.deals[0], loan.events);

    expect(impact.hasOverpayments).toBe(true);
    expect(impact.totalOverpayments).toBeGreaterThan(5000);
    expect(impact.interestSaved).toBeGreaterThan(0);
    expect(impact.extraPrincipalRepaid).toBeGreaterThan(0);
  });

  it('reports interest saved for a completed deal by ignoring the bank-confirmed override on the baseline', () => {
    const completed = {
      ...makeMortgage().deals[0],
      status: 'completed' as const,
      startDate: '2026-06-01',
      endDate: '2031-06-01',
      regularOverpayment: 150,
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 200000,
        feesAdded: 0,
      },
    };
    const loan = makeMortgage({ deals: [completed] });

    const impact = getDealOverpaymentImpact(completed, loan.events);

    expect(impact.hasOverpayments).toBe(true);
    // 5y × £150/mo = £9,000 of regular overpayments on a 240k @ 4.2% mortgage. A regression
    // that produces near-zero savings would silently pass against `> 0`; pin a lower bound.
    expect(impact.totalOverpayments).toBeCloseTo(9000, 0);
    expect(impact.extraPrincipalRepaid).toBeGreaterThan(8000);
    expect(impact.interestSaved).toBeGreaterThan(800);
  });

  it('excludes regular overpayment months when the user missed payments or had a payment holiday', () => {
    const baseDeal = makeMortgage().deals[0];
    const loan = makeMortgage({
      events: [
        {
          id: 'missed-1',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
          dealId: baseDeal.id,
          type: 'missedPayment',
          date: '2026-08-15',
        },
        {
          id: 'holiday-1',
          createdAt: '2026-09-01T00:00:00.000Z',
          updatedAt: '2026-09-01T00:00:00.000Z',
          dealId: baseDeal.id,
          type: 'paymentHoliday',
          date: '2026-09-15',
        },
      ],
    });

    // Deal runs 2026-06-01 to 2031-06-01 = 60 months, 2 skipped → 58 effective × £150 = £8,700.
    const impact = getDealOverpaymentImpact(baseDeal, loan.events);

    expect(impact.totalOverpayments).toBeCloseTo(150 * 58, 0);
  });

  it('omits events tied to draft deals from recent activity', () => {
    const draft = {
      ...makeMortgage().deals[0],
      id: 'draft',
      status: 'draft' as const,
      startDate: '2031-07-01',
      endDate: '2036-07-01',
    };
    const loan = makeMortgage({
      deals: [makeMortgage().deals[0], draft],
      events: [
        {
          id: 'active-note',
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
          dealId: 'deal-current',
          type: 'note',
          date: '2026-07-01',
          note: 'On active deal',
        },
        {
          id: 'draft-note',
          createdAt: '2031-07-15T00:00:00.000Z',
          updatedAt: '2031-07-15T00:00:00.000Z',
          dealId: 'draft',
          type: 'note',
          date: '2031-07-15',
          note: 'Stale draft note',
        },
      ],
    });

    const summary = getMortgageTrackerSummary(loan, new Date('2026-08-01T00:00:00'));

    expect(summary.recentEvents.map(event => event.id)).toEqual(['active-note']);
  });

  it('does not attribute fees added to interest in completed deal projection', () => {
    const withoutFees = {
      ...makeMortgage().deals[0],
      id: 'no-fees',
      status: 'completed' as const,
      startDate: '2026-06-01',
      endDate: '2031-06-01',
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 200000,
        feesAdded: 0,
      },
    };
    const withFees = {
      ...withoutFees,
      id: 'with-fees',
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 200995,
        feesAdded: 995,
      },
    };

    const projectionWithoutFees = buildMortgageProjection(
      makeMortgage({ deals: [withoutFees] }),
      new Date('2032-01-01T00:00:00'),
    );
    const projectionWithFees = buildMortgageProjection(
      makeMortgage({ deals: [withFees] }),
      new Date('2032-01-01T00:00:00'),
    );

    expect(projectionWithFees.totalInterestPaid).toBeCloseTo(projectionWithoutFees.totalInterestPaid, 1);
  });

  it('exposes additional borrowing total and corrected principal paid in mortgage projection', () => {
    const completed = {
      ...makeMortgage().deals[0],
      id: 'completed',
      status: 'completed' as const,
      startDate: '2026-06-01',
      endDate: '2031-06-01',
      completion: {
        completedAt: '2031-06-01',
        closingBalance: 200000,
        feesAdded: 0,
      },
    };
    const remortgage = {
      ...makeMortgage().deals[0],
      id: 'remortgage',
      status: 'active' as const,
      startDate: '2031-06-02',
      endDate: '2036-06-02',
      openingBalance: 225000,
      additionalBorrowing: 25000,
      monthlyPayment: 1400,
      regularOverpayment: 0,
      completion: undefined,
    };
    const loan = makeMortgage({ deals: [completed, remortgage] });

    const projection = buildMortgageProjection(loan, new Date('2031-08-01T00:00:00'));

    expect(projection.additionalBorrowingTotal).toBe(25000);
    expect(projection.totalPrincipalPaid).toBeGreaterThan(0);
    expect(projection.currentBalance).toBeLessThanOrEqual(225000);
  });
});
