import { describe, expect, it } from '@jest/globals';
import {
  buildTrackedMortgageFromForm,
  deriveTrackSeedFromLoan,
  TrackMortgageFormValues,
} from '@/shared/domain/mortgage/trackBuilder';
import { buildMortgageProjection } from '@/shared/domain/mortgage/projection';
import { getCurrentDeal, getPublishedDeals } from '@/shared/domain/mortgage/tracker';
import { monthsBetween } from '@/shared/lib/utils/date';
import { LOAN_GROUP_SCHEMA_VERSION, LoanGroup } from '@/shared/domain/types/SavedLoan';

const baseValues = (overrides: Partial<TrackMortgageFormValues> = {}): TrackMortgageFormValues => ({
  nickname: 'Family home',
  lender: 'Halifax',
  currency: 'GBP',
  currentBalance: 180000,
  interestRate: 4.5,
  repaymentType: 'repayment',
  remainingTermInMonths: 264, // 22 years
  startDate: '2026-06-01',
  ...overrides,
});

describe('buildTrackedMortgageFromForm', () => {
  it('anchors a single active, tracked, pinned deal at the current balance', () => {
    const loan = buildTrackedMortgageFromForm(baseValues());

    expect(loan.status).toBe('tracked');
    expect(loan.pinnedToDashboard).toBe(true);
    expect(loan.category).toBe('mortgage');
    expect(loan.currency).toBe('GBP');
    expect(loan.deals).toHaveLength(1);

    const [deal] = loan.deals;
    expect(deal.status).toBe('active');
    expect(deal.source).toBe('userDeal');
    expect(deal.openingBalance).toBe(180000);
    expect(deal.startDate).toBe('2026-06-01');
    expect(getCurrentDeal(loan)?.id).toBe(deal.id);
  });

  it('maps the remaining term onto the loan term and a derived monthly payment', () => {
    const loan = buildTrackedMortgageFromForm(baseValues());

    expect(loan.mortgageTermInMonths).toBe(264);
    expect(loan.formSnapshot.termInYears).toBe(22);
    expect(loan.formSnapshot.termInMonths).toBe(0);
    expect(loan.deals[0].monthlyPayment).toBeGreaterThan(0);
    // current balance is the input, never derived
    expect(loan.formSnapshot.loanAmount).toBe(180000);
  });

  it('amortises an interest-only deal as balance * monthly rate', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({ repaymentType: 'interestOnly' }));
    const expected = +(180000 * (4.5 / 100 / 12)).toFixed(2);
    expect(loan.deals[0].monthlyPayment).toBeCloseTo(expected, 2);
  });

  it('uses the deal-end date for the fixed period when provided', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({ dealEndDate: '2028-06-01' }));
    expect(loan.deals[0].endDate).toBe('2028-06-01');
    expect(monthsBetween(loan.deals[0].startDate, loan.deals[0].endDate)).toBe(24);
    // term to payoff is unchanged by the fixed-deal window
    expect(loan.mortgageTermInMonths).toBe(264);
  });

  it('anchors a past-dated mortgage as one active historic deal', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({
      currentBalance: 250000,
      startDate: '2019-06-01',
      dealEndDate: '2021-06-01',
      remainingTermInMonths: 300,
    }));

    expect(loan.category).toBe('mortgage');
    expect(loan.deals).toHaveLength(1);
    expect(loan.deals[0]).toMatchObject({
      status: 'active',
      startDate: '2019-06-01',
      endDate: '2021-06-01',
      openingBalance: 250000,
      source: 'userDeal',
    });
    expect(getCurrentDeal(loan)?.id).toBe(loan.deals[0].id);

    const projection = buildMortgageProjection(loan);
    expect(projection.totalAmountPaid).toBeGreaterThan(0);
    expect(projection.currentBalance).toBeGreaterThanOrEqual(0);
  });

  it('runs the deal to payoff when no deal-end date is given', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({ dealEndDate: undefined }));
    expect(monthsBetween(loan.deals[0].startDate, loan.deals[0].endDate)).toBe(264);
  });

  it('names the current deal by its fixed period, not the whole mortgage term', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({
      startDate: '2026-06-01',
      dealEndDate: '2031-06-01', // 5-year fix
      remainingTermInMonths: 264, // 22-year term
    }));

    expect(loan.deals[0].name).toBe('5-year Fixed');
  });

  it('builds a tracked loan as one repayment deal without a fixed-deal period', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({
      category: 'loan',
      dealEndDate: '2028-06-01',
      regularOverpayment: 75,
      lumpOverpayments: [{ date: '2026-07-01', amount: 500 }],
    }));

    expect(loan.category).toBe('loan');
    expect(loan.deals).toHaveLength(1);
    expect(monthsBetween(loan.deals[0].startDate, loan.deals[0].endDate)).toBe(264);
    expect(loan.deals[0].source).toBeUndefined();
    expect(loan.events).toHaveLength(1);
    expect(loan.events[0].dealId).toBeUndefined();
    expect(loan.formSnapshot.additionalMonthlyPayment).toBe(75);
  });

  it('records prior overpayments as events and a regular monthly overpayment', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({
      regularOverpayment: 150,
      lumpOverpayments: [
        { date: '2026-07-01', amount: 5000 },
        { date: 'not-a-date', amount: 1000 }, // dropped
        { date: '2026-08-01', amount: 0 }, // dropped
      ],
    }));

    expect(loan.deals[0].regularOverpayment).toBe(150);
    expect(loan.formSnapshot.additionalMonthlyPayment).toBe(150);
    const lumpEvents = loan.events.filter(e => e.type === 'lumpOverpayment');
    expect(lumpEvents).toHaveLength(1);
    expect(lumpEvents[0]).toMatchObject({ amount: 5000, date: '2026-07-01', dealId: loan.deals[0].id });
  });

  it('populates a result snapshot from the projection', () => {
    const loan = buildTrackedMortgageFromForm(baseValues());

    expect(loan.resultSnapshot.totalTermInMonths).toBe(264);
    expect(loan.resultSnapshot.monthlyPayments).toBeGreaterThan(0);
    expect(loan.resultSnapshot.totalInterestPaid).toBeGreaterThan(0);
    expect(loan.resultSnapshot.totalAmountPaid).toBeGreaterThan(loan.resultSnapshot.totalInterestPaid);
  });

  it('produces a deal the tracker treats as published and projectable', () => {
    const loan = buildTrackedMortgageFromForm(baseValues());
    expect(getPublishedDeals(loan)).toHaveLength(1);

    const projection = buildMortgageProjection(loan);
    expect(projection.currentBalance).toBeGreaterThan(0);
    expect(projection.currentBalance).toBeLessThanOrEqual(180000);
    expect(projection.totalInterestPaid).toBeGreaterThan(0);
  });

  it('derives the borrowed balance from price minus deposit and records the deposit', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({
      propertyValue: 300000,
      deposit: 60000,
      currentBalance: 240000, // price − deposit, computed by the form
    }));

    // Snapshot mirrors a calculator-saved mortgage: price as loanAmount, deposit as a cash down payment.
    expect(loan.formSnapshot.loanAmount).toBe(300000);
    expect(loan.formSnapshot.downPayment).toBe(60000);
    expect(loan.formSnapshot.downPaymentType).toBe('CASH');
    // The deal (and therefore the projection) opens at the borrowed amount.
    expect(loan.deals[0].openingBalance).toBe(240000);
  });

  it('records the deposit without double-counting it in the amortisation', () => {
    const withDeposit = buildTrackedMortgageFromForm(baseValues({
      propertyValue: 300000,
      deposit: 60000,
      currentBalance: 240000,
    }));
    const balanceOnly = buildTrackedMortgageFromForm(baseValues({ currentBalance: 240000 }));

    expect(withDeposit.resultSnapshot.totalInterestPaid)
      .toBeCloseTo(balanceOnly.resultSnapshot.totalInterestPaid, 2);
    expect(buildMortgageProjection(withDeposit).currentBalance)
      .toBeCloseTo(buildMortgageProjection(balanceOnly).currentBalance, 2);
  });

  it('leaves loanAmount as the balance and deposit at zero when none is supplied (from-today / loans)', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({ currentBalance: 200000 }));

    expect(loan.formSnapshot.loanAmount).toBe(200000);
    expect(loan.formSnapshot.downPayment).toBe(0);
  });

  it('reuses a supplied id and createdAt (resume/finalise a draft in place)', () => {
    const loan = buildTrackedMortgageFromForm(baseValues(), { id: 'fixed-id', createdAt: '2020-01-01T00:00:00.000Z' });
    expect(loan.id).toBe('fixed-id');
    expect(loan.createdAt).toBe('2020-01-01T00:00:00.000Z');
  });
});

describe('deriveTrackSeedFromLoan', () => {
  it('seeds today-anchored values from the loan projection and current deal', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({ startDate: '2026-06-01' }));
    const seed = deriveTrackSeedFromLoan(loan, '2026-06-01');

    // Current balance is the loan's projected balance, not the original opening figure.
    expect(seed.currentBalance).toBe(buildMortgageProjection(loan).currentBalance);
    expect(seed.nickname).toBe('Family home');
    expect(seed.lender).toBe('Halifax');
    expect(seed.currency).toBe('GBP');
    expect(seed.interestRate).toBe(4.5);
    expect(seed.repaymentType).toBe('repayment');
  });

  it('measures remaining term from today and amortises the balance for a past-dated loan', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({ startDate: '2020-06-01', remainingTermInMonths: 264 }));
    const seed = deriveTrackSeedFromLoan(loan, '2026-06-01');

    // Remaining-from-today, not the full original term…
    expect(seed.remainingTermInMonths).toBeGreaterThan(0);
    expect(seed.remainingTermInMonths).toBeLessThan(264);
    // …and the balance has amortised down from the original opening balance.
    expect(seed.currentBalance).toBeGreaterThan(0);
    expect(seed.currentBalance).toBeLessThan(180000);
  });

  it('carries the current deal overpayments into the seed', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({
      startDate: '2026-06-01',
      regularOverpayment: 150,
      lumpOverpayments: [{ date: '2026-07-01', amount: 5000 }],
    }));
    const seed = deriveTrackSeedFromLoan(loan, '2026-06-01');

    expect(seed.regularOverpayment).toBe(150);
    expect(seed.lumpOverpayments).toEqual([{ date: '2026-07-01', amount: 5000 }]);
  });

  it('surfaces a still-future deal end date but drops one already in the past', () => {
    const loan = buildTrackedMortgageFromForm(baseValues({ startDate: '2026-06-01', dealEndDate: '2028-06-01' }));

    expect(deriveTrackSeedFromLoan(loan, '2026-06-01').dealEndDate).toBe('2028-06-01');
    expect(deriveTrackSeedFromLoan(loan, '2030-01-01').dealEndDate).toBeUndefined();
  });

  it('falls back to captured figures and zeros for a pristine draft with no deals', () => {
    const pristineDraft: LoanGroup = {
      schemaVersion: LOAN_GROUP_SCHEMA_VERSION,
      id: 'draft-1',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      nickname: 'WIP',
      category: 'mortgage',
      currency: 'GBP',
      status: 'draft',
      pinnedToDashboard: false,
      deals: [],
      events: [],
      formSnapshot: {
        loanAmount: 0,
        interest: 0,
        termInYears: 0,
        termInMonths: 0,
        downPayment: 0,
        downPaymentType: 'CASH',
        desiredMonthlyPayment: null,
        additionalMonthlyPayment: null,
        startDate: '2026-06-01',
        calculationType: 'TERM',
        currency: 'GBP',
      },
      resultSnapshot: {
        monthlyPayments: 0,
        totalAmountPaid: 0,
        totalInterestPaid: 0,
        totalInterestPaidBaseline: 0,
        termInYears: 0,
        termInMonths: 0,
        totalTermInMonths: 0,
      },
    };

    const seed = deriveTrackSeedFromLoan(pristineDraft, '2026-06-01');

    expect(seed.currentBalance).toBe(0);
    expect(seed.interestRate).toBe(0);
    expect(seed.remainingTermInMonths).toBe(0);
    expect(seed.repaymentType).toBe('repayment');
    expect(seed.dealEndDate).toBeUndefined();
    expect(seed.lumpOverpayments).toEqual([]);
  });
});
