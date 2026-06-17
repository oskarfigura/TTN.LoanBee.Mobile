import { describe, expect, it } from '@jest/globals';
import {
  createDealOverpaymentScope,
  createLoanOverpaymentScope,
} from '@/shared/domain/loans/overpaymentScope';
import {
  buildScenarioRemainingArray,
  computeLoanOverpayments,
} from '@/shared/domain/loans/loanOverpaymentCalc';
import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import {
  getDealOverpaymentImpact,
  normaliseDealChain,
} from '@/shared/domain/mortgage/tracker';
import { buildMortgageProjection } from '@/shared/domain/mortgage/projection';
import { LoanDeal, LoanFormSnapshot, MortgageEvent, SavedLoan } from '@/shared/domain/types/SavedLoan';
import { monthsBetween } from '@/shared/lib/utils/date';

const loanForm: LoanFormSnapshot = {
  loanAmount: 250000,
  interest: 4.5,
  termInYears: 25,
  termInMonths: 0,
  downPayment: 10,
  downPaymentType: 'PERCENT',
  desiredMonthlyPayment: null,
  additionalMonthlyPayment: 200,
  startDate: '2026-01-01',
  calculationType: 'TERM',
  currency: 'GBP',
};

const loanLump: MortgageEvent = {
  id: 'lump-loan',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  type: 'lumpOverpayment',
  date: '2027-01-01',
  amount: 8000,
};

const makeLoan = (overrides: Partial<SavedLoan> = {}): SavedLoan => ({
  id: 'loan-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nickname: 'Car loan',
  category: 'loan',
  currency: 'GBP',
  status: 'tracked',
  pinnedToDashboard: false,
  deals: [],
  events: [loanLump],
  formSnapshot: loanForm,
  resultSnapshot: {
    monthlyPayments: 0,
    totalAmountPaid: 0,
    totalInterestPaid: 0,
    totalInterestPaidBaseline: 0,
    termInYears: 0,
    termInMonths: 0,
    totalTermInMonths: 0,
  },
  ...overrides,
});

const dealLump: MortgageEvent = {
  id: 'lump-deal',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  dealId: 'deal-current',
  type: 'lumpOverpayment',
  date: '2027-06-01',
  amount: 10000,
};

const strayLump: MortgageEvent = {
  id: 'lump-stray',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  dealId: 'other-deal',
  type: 'lumpOverpayment',
  date: '2027-07-01',
  amount: 5000,
};

const makeDeal = (): LoanDeal => ({
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
});

const makeMortgage = (overrides: Partial<SavedLoan> = {}): SavedLoan => ({
  id: 'mortgage-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nickname: 'Home mortgage',
  lender: 'Halifax',
  category: 'mortgage',
  currency: 'GBP',
  status: 'tracked',
  pinnedToDashboard: true,
  deals: [makeDeal()],
  events: [dealLump, strayLump],
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

describe('createLoanOverpaymentScope', () => {
  it('reads the monthly overpayment and loan-level lump events', () => {
    const scope = createLoanOverpaymentScope(makeLoan());
    expect(scope.monthlyAmount).toBe(200);
    expect(scope.lumpEvents.map(e => e.id)).toEqual(['lump-loan']);
    expect(scope.currency).toBe('GBP');
    expect(scope.labels.titleKey).toBe('overpayments.title');
  });

  it('excludes deal-scoped lumps from a loan scope', () => {
    const scope = createLoanOverpaymentScope(makeLoan({
      events: [loanLump, { ...dealLump, dealId: 'deal-x' }],
    }));
    expect(scope.lumpEvents.map(e => e.id)).toEqual(['lump-loan']);
  });

  it('bannerImpact mirrors computeLoanOverpayments (months-saved secondary)', () => {
    const scope = createLoanOverpaymentScope(makeLoan());
    const engine = computeLoanOverpayments(loanForm, 200, [{ date: '2027-01-01', amount: 8000 }]);
    expect(scope.bannerImpact).toEqual({
      interestSaved: engine.interestSaved,
      secondary: { kind: 'monthsSaved', value: engine.monthsSaved },
    });
  });

  it('hides the banner when there are no overpayments', () => {
    const scope = createLoanOverpaymentScope(makeLoan({
      events: [],
      formSnapshot: { ...loanForm, additionalMonthlyPayment: 0 },
    }));
    expect(scope.bannerImpact).toBeNull();
    expect(scope.chartData).toBeNull();
  });

  it('chartData baseline/scenario arrays match the engines', () => {
    const scope = createLoanOverpaymentScope(makeLoan());
    const baseline = getLoanCalculations(
      loanForm.loanAmount, loanForm.interest, loanForm.termInYears, loanForm.termInMonths,
      0, 'term', loanForm.downPayment, 'percent', 0, loanForm.startDate,
    );
    expect(scope.chartData?.baselineRemaining).toEqual(baseline.loanChartRemainingArray);
    expect(scope.chartData?.scenarioRemaining).toEqual(
      buildScenarioRemainingArray(loanForm, 200, [{ date: '2027-01-01', amount: 8000 }]),
    );
  });

  it('applySaveMonthly writes the form value and rebuilds the result snapshot', () => {
    const updated = createLoanOverpaymentScope(makeLoan()).applySaveMonthly(300);
    expect(updated.formSnapshot.additionalMonthlyPayment).toBe(300);
    const combined = computeLoanOverpayments(loanForm, 300, [{ date: '2027-01-01', amount: 8000 }]);
    expect(updated.resultSnapshot.totalInterestPaid).toBe(combined.scenario.totalInterestPaid);
    expect(updated.resultSnapshot.totalTermInMonths).toBe(combined.scenario.totalTermInMonths);
  });

  it('applyRemoveMonthly clears the monthly overpayment', () => {
    const updated = createLoanOverpaymentScope(makeLoan()).applyRemoveMonthly();
    expect(updated.formSnapshot.additionalMonthlyPayment).toBeNull();
  });

  it('applySaveLump appends a loan-level lump event', () => {
    const updated = createLoanOverpaymentScope(makeLoan()).applySaveLump('2028-01-01', 5000, null);
    const lumps = updated.events.filter(e => e.type === 'lumpOverpayment' && !e.dealId);
    expect(lumps).toHaveLength(2);
    expect(lumps.some(e => e.amount === 5000 && e.date === '2028-01-01')).toBe(true);
  });

  it('applySaveLump edits an existing lump in place', () => {
    const updated = createLoanOverpaymentScope(makeLoan()).applySaveLump('2027-03-01', 9000, loanLump);
    const edited = updated.events.find(e => e.id === 'lump-loan');
    expect(edited?.amount).toBe(9000);
    expect(edited?.date).toBe('2027-03-01');
    expect(updated.events.filter(e => e.type === 'lumpOverpayment')).toHaveLength(1);
  });

  it('applyDeleteLump removes the event', () => {
    const updated = createLoanOverpaymentScope(makeLoan()).applyDeleteLump('lump-loan');
    expect(updated.events.find(e => e.id === 'lump-loan')).toBeUndefined();
  });

  it('computeLumpImpact stacks a prospective lump on top of existing lumps', () => {
    const scope = createLoanOverpaymentScope(makeLoan());
    const expected = computeLoanOverpayments(loanForm, 200, [
      { date: '2027-01-01', amount: 8000 },
      { date: '2028-01-01', amount: 5000 },
    ]);
    expect(scope.computeLumpImpact(5000, '2028-01-01')).toEqual({
      interestSaved: expected.interestSaved,
      secondary: { kind: 'monthsSaved', value: expected.monthsSaved },
    });
  });

  it('computeLumpImpact swaps the edited lump for its prospective value', () => {
    const scope = createLoanOverpaymentScope(makeLoan());
    const expected = computeLoanOverpayments(loanForm, 200, [
      { date: '2027-03-01', amount: 9000 },
    ]);
    expect(scope.computeLumpImpact(9000, '2027-03-01', 'lump-loan')).toEqual({
      interestSaved: expected.interestSaved,
      secondary: { kind: 'monthsSaved', value: expected.monthsSaved },
    });
  });
});

describe('createDealOverpaymentScope', () => {
  it('reads the deal regular overpayment and only this deal\'s lumps', () => {
    const loan = makeMortgage();
    const scope = createDealOverpaymentScope(loan, loan.deals[0]);
    expect(scope.monthlyAmount).toBe(150);
    expect(scope.lumpEvents.map(e => e.id)).toEqual(['lump-deal']);
    expect(scope.labels.subtitle).toBe('5-year Fixed');
    expect(scope.labels.monthlyCurrencySymbol).toBe('£');
  });

  it('bannerImpact mirrors getDealOverpaymentImpact (extra-principal secondary)', () => {
    const loan = makeMortgage();
    const scope = createDealOverpaymentScope(loan, loan.deals[0]);
    const engine = getDealOverpaymentImpact(loan.deals[0], loan.events);
    expect(scope.bannerImpact).toEqual({
      interestSaved: engine.interestSaved,
      secondary: { kind: 'extraPrincipal', value: engine.extraPrincipalRepaid },
    });
  });

  it('chartData spans the whole mortgage, isolating this deal\'s overpayments', () => {
    const loan = makeMortgage();
    const deal = loan.deals[0];
    const scope = createDealOverpaymentScope(loan, deal);

    const scenario = buildMortgageProjection(loan).loanChartRemainingArray;
    const baselineLoan: SavedLoan = {
      ...loan,
      deals: loan.deals.map(d => (d.id === deal.id ? { ...d, regularOverpayment: 0 } : d)),
      events: loan.events.filter(e => !(e.dealId === deal.id && e.type === 'lumpOverpayment')),
    };
    const baseline = buildMortgageProjection(normaliseDealChain(baselineLoan, deal.id)).loanChartRemainingArray;

    expect(scope.chartData).toEqual({ baselineRemaining: baseline, scenarioRemaining: scenario });
    // The curve now covers the full remaining mortgage term, not just the deal window.
    const dealWindowMonths = monthsBetween(deal.startDate, deal.endDate);
    expect(scope.chartData!.baselineRemaining.length).toBeGreaterThan(dealWindowMonths);
  });

  it('applySaveMonthly updates the deal regular overpayment', () => {
    const loan = makeMortgage();
    const updated = createDealOverpaymentScope(loan, loan.deals[0]).applySaveMonthly(250);
    expect(updated.deals.find(d => d.id === 'deal-current')?.regularOverpayment).toBe(250);
  });

  it('applySaveLump adds a deal-scoped lump event', () => {
    const loan = makeMortgage();
    const updated = createDealOverpaymentScope(loan, loan.deals[0]).applySaveLump('2028-06-01', 6000, null);
    const dealLumps = updated.events.filter(e => e.type === 'lumpOverpayment' && e.dealId === 'deal-current');
    expect(dealLumps).toHaveLength(2);
    expect(dealLumps.some(e => e.amount === 6000)).toBe(true);
  });

  it('applyDeleteLump removes the event', () => {
    const loan = makeMortgage();
    const updated = createDealOverpaymentScope(loan, loan.deals[0]).applyDeleteLump('lump-deal');
    expect(updated.events.find(e => e.id === 'lump-deal')).toBeUndefined();
  });
});
