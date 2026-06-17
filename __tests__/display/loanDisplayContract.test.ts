import { describe, expect, it } from '@jest/globals';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { CURRENCIES } from '@/shared/domain/currency/currencies';
import { formatCurrency } from '@/shared/domain/currency/format';
import {
  buildAmortisationDisplayRows,
  buildCalculationDisplayContract,
  buildSavedLoanDisplayContract,
} from '@/shared/domain/loans/loanDisplayContract';
import { buildScenarioRemainingArray, computeLoanOverpayments } from '@/shared/domain/loans/loanOverpaymentCalc';
import { buildInitialDeal, buildResultSnapshot, normaliseFormSnapshot } from '@/shared/domain/loans/loanGroupFactory';
import { getMortgageTrackerSummary } from '@/shared/domain/mortgage/tracker';
import { getResultForSavedLoan } from '@/shared/domain/results/loanResultRoute';
import { LoanGroup } from '@/shared/domain/types/SavedLoan';
import { monthsBetween } from '@/shared/lib/utils/date';

const findMetric = (
  metrics: Array<{ id: string; value: string; labelKey: string }>,
  id: string,
) => metrics.find(metric => metric.id === id);

const parseDisplayAmount = (value: string): number => (
  Number(value.replace(/[^\d.-]/g, ''))
);

const makeCalculationResult = ({
  currency = 'GBP',
  additionalMonthlyPayment = 0,
  calculationType = LoanCalculationType.TERM,
  desiredMonthlyPayment = 0,
}: {
  currency?: 'GBP' | 'PLN';
  additionalMonthlyPayment?: number;
  calculationType?: LoanCalculationType;
  desiredMonthlyPayment?: number;
} = {}) => {
  const result = getLoanCalculations(
    300000,
    3.5,
    calculationType === LoanCalculationType.TERM ? 25 : 0,
    0,
    desiredMonthlyPayment,
    calculationType,
    10,
    DownPaymentType.PERCENT,
    additionalMonthlyPayment,
    '2026-01-01',
  );

  return { result, currency };
};

const makeMortgage = (overrides: Partial<LoanGroup> = {}): LoanGroup => {
  const formSnapshot = normaliseFormSnapshot({
    loanAmount: 240000,
    interest: 4.2,
    termInYears: 25,
    termInMonths: 0,
    downPayment: 0,
    downPaymentType: DownPaymentType.CASH,
    desiredMonthlyPayment: null,
    additionalMonthlyPayment: 150,
    startDate: '2026-06-01',
    calculationType: LoanCalculationType.TERM,
  }, 'GBP');
  const result = getLoanCalculations(
    formSnapshot.loanAmount,
    formSnapshot.interest,
    formSnapshot.termInYears,
    formSnapshot.termInMonths,
    formSnapshot.desiredMonthlyPayment ?? 0,
    formSnapshot.calculationType.toLowerCase(),
    formSnapshot.downPayment,
    formSnapshot.downPaymentType.toLowerCase(),
    formSnapshot.additionalMonthlyPayment ?? 0,
    formSnapshot.startDate,
  );
  const baseline = getLoanCalculations(
    formSnapshot.loanAmount,
    formSnapshot.interest,
    formSnapshot.termInYears,
    formSnapshot.termInMonths,
    formSnapshot.desiredMonthlyPayment ?? 0,
    formSnapshot.calculationType.toLowerCase(),
    formSnapshot.downPayment,
    formSnapshot.downPaymentType.toLowerCase(),
    0,
    formSnapshot.startDate,
  );
  const createdAt = '2026-01-01T00:00:00.000Z';
  const loanBase: LoanGroup = {
    id: 'mortgage-1',
    createdAt,
    updatedAt: createdAt,
    nickname: 'Home mortgage',
    lender: 'Halifax',
    category: 'mortgage',
    currency: 'GBP',
    status: 'tracked',
    pinnedToDashboard: true,
    deals: [],
    events: [],
    formSnapshot,
    resultSnapshot: buildResultSnapshot(result, baseline.totalInterestPaid),
  };
  const loan = {
    ...loanBase,
    deals: [
      buildInitialDeal('deal-current', loanBase, { source: 'userDeal', durationInMonths: 60 }),
    ],
    ...overrides,
  };

  return loan;
};

describe('loan display contract', () => {
  it('builds semantic calculator figures for the result summary', () => {
    const { result } = makeCalculationResult();
    const contract = buildCalculationDisplayContract({
      result,
      startDate: '2026-01-01',
      currency: 'GBP',
      locale: 'en',
    });
    const keyMetrics = contract.sections.find(section => section.id === 'keyMetrics')?.metrics ?? [];
    const loanDetails = contract.sections.find(section => section.id === 'loanDetails')?.metrics ?? [];

    expect(contract.summary.hero).toEqual({
      id: 'monthlyPayment',
      labelKey: 'results.monthlyPayment',
      value: '£1,351.68',
    });
    expect(findMetric(keyMetrics, 'payoffDate')?.value).toBe('1st Jan 2051');
    expect(findMetric(keyMetrics, 'totalInterest')?.value).toBe('£135,505.09');
    expect(findMetric(keyMetrics, 'totalCost')?.value).toBe('£435,505.09');
    expect(findMetric(loanDetails, 'loanAmount')?.value).toBe('£300,000.00');
    expect(findMetric(loanDetails, 'interestRate')?.value).toBe('3.5%');
    expect(findMetric(loanDetails, 'additionalMonthlyPayment')).toBeUndefined();
  });

  it('uses the selected currency and only shows additional payment when present', () => {
    const { result } = makeCalculationResult({
      currency: 'PLN',
      additionalMonthlyPayment: 250,
    });
    const contract = buildCalculationDisplayContract({
      result,
      startDate: '2026-01-01',
      currency: 'PLN',
      locale: 'pl',
      additionalMonthlyPayment: 250,
    });
    const loanDetails = contract.sections.find(section => section.id === 'loanDetails')?.metrics ?? [];

    expect(contract.summary.hero.value).toBe('1601,68 zł');
    expect(findMetric(loanDetails, 'additionalMonthlyPayment')).toEqual({
      id: 'additionalMonthlyPayment',
      labelKey: 'calculator.additionalPayment',
      value: '250,00 zł',
    });
  });

  it('formats calculator figures with every supported currency symbol', () => {
    const { result } = makeCalculationResult();

    CURRENCIES.forEach(currency => {
      const contract = buildCalculationDisplayContract({
        result,
        startDate: '2026-01-01',
        currency: currency.code,
        locale: 'en',
      });
      const totalCost = contract.sections
        .flatMap(section => section.metrics)
        .find(metric => metric.id === 'totalCost');

      expect(contract.summary.hero.value.includes(currency.symbol)).toBe(true);
      expect(totalCost?.value.includes(currency.symbol)).toBe(true);
    });
  });

  it('supports payment-mode calculations without changing the display contract shape', () => {
    const { result } = makeCalculationResult({
      calculationType: LoanCalculationType.PAYMENT,
      desiredMonthlyPayment: 1800,
    });
    const contract = buildCalculationDisplayContract({
      result,
      startDate: '2026-03-01',
      currency: 'GBP',
      locale: 'en',
    });

    expect(contract.summary.hero.value).toBe('£1,800.00');
    expect(contract.totalMonths).toBe(result.tableItems.length);
    expect(contract.sections.find(section => section.id === 'keyMetrics')?.metrics.map(metric => metric.id)).toEqual([
      'monthlyPayment',
      'payoffDate',
      'totalInterest',
      'totalCost',
    ]);
  });

  it('uses saved-loan currency and active deal values for mortgage dashboard figures', () => {
    const base = makeMortgage();
    const loan = makeMortgage({
      currency: 'PLN',
      formSnapshot: {
        ...base.formSnapshot,
        currency: 'GBP',
      },
      deals: [{
        ...base.deals[0],
        lender: 'Current Bank',
        interestRate: 5.1,
        monthlyPayment: 1525,
      }],
    });
    const contract = buildSavedLoanDisplayContract({
      loan,
      result: getResultForSavedLoan(loan),
      asOf: new Date('2026-07-01T00:00:00Z'),
      locale: 'pl',
    });

    expect(contract.dashboardMetrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'currentBalance', value: expect.stringMatching(/zł$/) }),
      { id: 'monthlyPayment', labelKey: 'results.monthlyPayment', value: '1525,00 zł' },
      expect.objectContaining({ id: 'payoffDate' }),
    ]));
    expect(contract.summary.metrics).toEqual(expect.arrayContaining([
      { id: 'monthlyPayment', labelKey: 'results.monthlyPayment', value: '1525,00 zł' },
      { id: 'interestRate', labelKey: 'calculator.interestRate', value: '5.1%' },
      expect.objectContaining({ id: 'totalInterest', value: expect.stringMatching(/zł$/) }),
      expect.objectContaining({ id: 'totalCost', value: expect.stringMatching(/zł$/) }),
    ]));
  });

  it('excludes draft deals from saved mortgage display metrics', () => {
    const base = makeMortgage();
    const loan = makeMortgage({
      deals: [
        {
          ...base.deals[0],
          id: 'active-deal',
          status: 'active',
          monthlyPayment: 1525,
          interestRate: 5.1,
        },
        {
          ...base.deals[0],
          id: 'draft-deal',
          name: 'Future draft',
          status: 'draft',
          startDate: '2031-06-01',
          endDate: '2036-06-01',
          monthlyPayment: 9999,
          interestRate: 9.9,
        },
      ],
    });
    const contract = buildSavedLoanDisplayContract({
      loan,
      result: getResultForSavedLoan(loan),
      asOf: new Date('2026-07-01T00:00:00Z'),
      locale: 'en',
    });

    expect(contract.summary.metrics).toEqual(expect.arrayContaining([
      { id: 'monthlyPayment', labelKey: 'results.monthlyPayment', value: '£1,525.00' },
      { id: 'interestRate', labelKey: 'calculator.interestRate', value: '5.1%' },
    ]));
    expect(contract.summary.metrics).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ value: '£9,999.00' }),
      expect.objectContaining({ value: '9.9%' }),
    ]));
  });

  it('reflects mortgage checkpoint and skipped-payment events in current-balance display', () => {
    const base = makeMortgage();
    const noEventContract = buildSavedLoanDisplayContract({
      loan: base,
      result: getResultForSavedLoan(base),
      asOf: new Date('2026-09-01T00:00:00Z'),
      locale: 'en',
    });
    const eventLoan = makeMortgage({
      events: [
        {
          id: 'checkpoint',
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
          dealId: 'deal-current',
          type: 'balanceCheckpoint',
          date: '2026-07-01',
          balance: 235000,
        },
        {
          id: 'holiday',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
          dealId: 'deal-current',
          type: 'paymentHoliday',
          date: '2026-08-01',
        },
      ],
    });
    const eventContract = buildSavedLoanDisplayContract({
      loan: eventLoan,
      result: getResultForSavedLoan(eventLoan),
      asOf: new Date('2026-09-01T00:00:00Z'),
      locale: 'en',
    });
    const trackerSummary = getMortgageTrackerSummary(eventLoan, new Date('2026-09-01T00:00:00Z'));

    expect(eventContract.summary.hero).toEqual({
      id: 'currentBalance',
      labelKey: 'mortgage.currentBalance',
      value: formatCurrency(trackerSummary.currentBalance, eventLoan.currency),
    });
    expect(parseDisplayAmount(eventContract.summary.hero.value)).not.toBe(
      parseDisplayAmount(noEventContract.summary.hero.value),
    );
  });

  it('exposes overpayment savings through the saved-loan progress contract', () => {
    const loan = makeMortgage({
      category: 'loan',
      deals: [],
    });
    const contract = buildSavedLoanDisplayContract({
      loan,
      result: getResultForSavedLoan(loan),
      asOf: new Date('2026-07-01T00:00:00Z'),
      locale: 'en',
    });

    expect(contract.summary.progress?.savingsAmount).toMatch(/^£/);
    expect(contract.summary.progress?.interestSaved).toBeGreaterThan(0);
    expect(contract.summary.progress?.metrics.map(metric => metric.id)).toEqual([
      'currentBalance',
      'paidSoFar',
    ]);
  });

  it('derives saved-loan overpayment savings from live overpayments instead of stale snapshots', () => {
    const base = makeMortgage();
    const lump = {
      id: 'loan-lump',
      createdAt: '2027-01-01T00:00:00.000Z',
      updatedAt: '2027-01-01T00:00:00.000Z',
      type: 'lumpOverpayment' as const,
      date: '2027-01-01',
      amount: 8000,
    };
    const loan = makeMortgage({
      category: 'loan',
      deals: [],
      events: [lump],
      resultSnapshot: {
        ...base.resultSnapshot,
        totalInterestPaid: 10,
        totalInterestPaidBaseline: 10,
        totalTermInMonths: 999,
      },
    });
    const expected = computeLoanOverpayments(
      loan.formSnapshot,
      loan.formSnapshot.additionalMonthlyPayment ?? 0,
      [{ date: lump.date, amount: lump.amount }],
    );
    const asOf = new Date('2027-07-01T00:00:00Z');
    const expectedRemaining = buildScenarioRemainingArray(
      loan.formSnapshot,
      loan.formSnapshot.additionalMonthlyPayment ?? 0,
      [{ date: lump.date, amount: lump.amount }],
    );
    const expectedBalance = expectedRemaining[monthsBetween(loan.formSnapshot.startDate, asOf)] ?? 0;
    const contract = buildSavedLoanDisplayContract({
      loan,
      result: getResultForSavedLoan(loan),
      asOf,
      locale: 'en',
    });
    const currentBalance = contract.summary.progress?.metrics.find(metric => metric.id === 'currentBalance');

    expect(contract.summary.progress?.interestSaved).toBeCloseTo(expected.interestSaved, 2);
    expect(contract.summary.progress?.termSavedMonths).toBe(expected.monthsSaved);
    expect(contract.summary.progress?.caption.values?.total).toBe(expected.scenario.totalTermInMonths);
    expect(parseDisplayAmount(currentBalance?.value ?? '')).toBeCloseTo(expectedBalance, 0);
  });

  it('omits overpayment savings and marks old paid-down loans as completed', () => {
    const base = makeMortgage();
    const loan = makeMortgage({
      category: 'loan',
      deals: [],
      formSnapshot: {
        ...base.formSnapshot,
        additionalMonthlyPayment: 0,
      },
      resultSnapshot: {
        ...base.resultSnapshot,
        totalInterestPaidBaseline: base.resultSnapshot.totalInterestPaid,
      },
    });
    const contract = buildSavedLoanDisplayContract({
      loan,
      result: getResultForSavedLoan(loan),
      asOf: new Date('2060-01-01T00:00:00Z'),
      locale: 'en',
    });

    expect(contract.summary.progress?.savingsAmount).toBeUndefined();
    expect(contract.summary.progress?.interestSaved).toBeUndefined();
    expect(contract.summary.progress?.caption.key).toBe('saved.completed');
    expect(contract.summary.progress?.value).toBe(1);
  });

  it('falls back to current-state projection for old mortgages without published deals', () => {
    const loan = makeMortgage({ deals: [] });
    const contract = buildSavedLoanDisplayContract({
      loan,
      result: getResultForSavedLoan(loan),
      asOf: new Date('2026-07-01T00:00:00Z'),
      locale: 'en',
    });

    expect(contract.summary.hero.labelKey).toBe('mortgage.currentBalance');
    expect(contract.summary.hero.value.startsWith('£')).toBe(true);
    expect(contract.dashboardMetrics.map(metric => metric.id)).toEqual([
      'currentBalance',
      'monthlyPayment',
      'payoffDate',
    ]);
  });

  it('builds display-ready amortisation rows with period labels and formatted currency columns', () => {
    const rows = buildAmortisationDisplayRows({
      items: [
        {
          itemNo: 1,
          remaining: '250000',
          principal: '715.48',
          interest: '812.50',
          ending: '249284.52',
        },
        {
          itemNo: 2,
          remaining: '249284.52',
          principal: '717.81',
          interest: '810.17',
          ending: '248566.71',
        },
      ],
      startDate: '2026-01-01',
      currency: 'GBP',
      language: 'en',
    });

    expect(rows[0]).toEqual({
      id: '1',
      itemNo: 1,
      period: 'January 2026',
      metrics: [
        { id: 'openingBalance', labelKey: 'results.openingBalance', value: '£250,000.00' },
        { id: 'principal', labelKey: 'results.principal', value: '£715.48' },
        { id: 'interest', labelKey: 'results.interest', value: '£812.50' },
        { id: 'closingBalance', labelKey: 'results.closingBalance', value: '£249,284.52' },
      ],
    });
    expect(rows[1].period).toBe('February 2026');
    expect(findMetric(rows[1].metrics, 'closingBalance')?.value).toBe('£248,566.71');
  });

  it('handles amortisation rows with explicit dates and invalid schedule start dates', () => {
    const rows = buildAmortisationDisplayRows({
      items: [
        {
          itemNo: 7,
          remaining: '1000',
          principal: '100',
          interest: '25',
          ending: '900',
        },
        {
          itemNo: 8,
          date: '2026-04-01',
          remaining: '900',
          principal: '100',
          interest: '20',
          ending: '800',
        },
      ],
      startDate: 'not-a-date',
      currency: 'EUR',
      language: 'en',
    });

    expect(rows[0].period).toBe('7');
    expect(rows[1].period).toBe('April 2026');
    expect(findMetric(rows[0].metrics, 'openingBalance')?.value).toBe('€1,000.00');
    expect(findMetric(rows[1].metrics, 'closingBalance')?.value).toBe('€800.00');
  });
});
