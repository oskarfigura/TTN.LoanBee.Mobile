import { describe, expect, it } from '@jest/globals';
import {
  DownPaymentType,
  LoanCalculationType,
  buildAmortisationCsv,
  buildCalculationDisplayContract,
  formatPayoffDate,
  getCalculationShareSearchParams,
  getLoanCalculations,
  getShareableCalculationValuesFromParams,
  getTableItems,
} from '@amortisation';

describe('packages/amortisation contract', () => {
  it('calculates the canonical term-mode golden path', () => {
    const result = getLoanCalculations(
      300000,
      3.5,
      25,
      0,
      0,
      LoanCalculationType.TERM,
      10,
      DownPaymentType.PERCENT,
      0,
      '2026-01-01',
    );

    expect(result.monthlyPayments).toBeCloseTo(1351.68, 2);
    expect(result.tableItems).toHaveLength(300);
    expect(result.totalInterestPaid).toBe(135505.09);
    expect(result.totalAmountPaid).toBe(435505.09);
  });

  it('calculates payment mode and derives the resulting term from the schedule', () => {
    const result = getLoanCalculations(
      300000,
      3.5,
      0,
      0,
      1800,
      LoanCalculationType.PAYMENT,
      10,
      DownPaymentType.PERCENT,
      0,
      '2026-03-01',
    );

    expect(result.monthlyPayments).toBe(1800);
    expect(result.tableItems.length).toBeGreaterThan(0);
    expect(result.termInYears * 12 + result.termInMonths).toBe(result.tableItems.length);
  });

  it('normalises unsafe shared params to mobile-canonical limits', () => {
    const values = getShareableCalculationValuesFromParams(new URLSearchParams({
      amount: '500000000',
      interest: '0',
      years: '0',
      months: '12',
      downPayment: '150',
      downPaymentType: 'percent',
      startDate: '2027-02-31',
      mode: 'payment',
      payment: '0',
      currency: 'CAD',
    }));

    expect(values.loanAmount).toBe(300000);
    expect(values.interest).toBe(3);
    expect(values.termInMonths).toBe(0);
    expect(values.downPayment).toBe(10);
    expect(values.calculationType).toBe(LoanCalculationType.PAYMENT);
    expect(values.desiredMonthlyPayment).toBeGreaterThan(0);
    expect(values.currency).toBe('GBP');
  });

  it('serializes share params with explicit currency and mobile-safe month range', () => {
    const params = getCalculationShareSearchParams({
      loanAmount: 250000,
      interest: 4.5,
      termInYears: 20,
      termInMonths: 11,
      downPayment: 15,
      downPaymentType: DownPaymentType.PERCENT,
      desiredMonthlyPayment: 0,
      additionalMonthlyPayment: 200,
      startDate: '2026-01-05',
      calculationType: LoanCalculationType.TERM,
      currency: 'GBP',
    });

    expect(params.toString()).toBe(
      'amount=250000&interest=4.5&downPayment=15&downPaymentType=percent&startDate=2026-01-05&mode=term&currency=GBP&years=20&months=11&extra=200',
    );
  });

  it('builds canonical display values', () => {
    const result = getLoanCalculations(
      300000,
      3.5,
      25,
      0,
      0,
      LoanCalculationType.TERM,
      10,
      DownPaymentType.PERCENT,
      250,
      '2026-01-01',
    );
    const contract = buildCalculationDisplayContract({
      result,
      startDate: '2026-01-01',
      currency: 'PLN',
      locale: 'pl',
      additionalMonthlyPayment: 250,
    });

    expect(contract.summary.hero.value).toBe('1601,68 zł');
    expect(contract.sections[0].metrics.map(metric => metric.id)).toEqual([
      'monthlyPayment',
      'payoffDate',
      'totalInterest',
      'totalCost',
    ]);
    expect(contract.sections[1].metrics).toEqual(expect.arrayContaining([
      { id: 'additionalMonthlyPayment', labelKey: 'calculator.additionalPayment', value: '250,00 zł' },
    ]));
  });

  it('formats payoff dates and CSV rows consistently', () => {
    const result = getLoanCalculations(
      120000,
      5,
      10,
      0,
      0,
      LoanCalculationType.TERM,
      0,
      DownPaymentType.CASH,
      0,
      '2026-06-01',
    );
    const csv = buildAmortisationCsv({
      items: result.tableItems.slice(0, 1),
      startDate: '2026-06-01',
      language: 'en',
      headers: {
        period: 'Period',
        openingBalance: 'Opening',
        principal: 'Principal',
        interest: 'Interest',
        closingBalance: 'Closing',
      },
    });

    expect(formatPayoffDate('2026-06-01', 120, 'en')).toBe('1st Jun 2036');
    expect(csv).toBe('\uFEFFPeriod,Opening,Principal,Interest,Closing\nJune 2026,120000.00,772.79,500.00,119227.21');
  });

  it('caps non-converging schedules', () => {
    const result = getTableItems(100000, 0.01, 500, 0);

    expect(result.tableItems.length).toBeLessThanOrEqual(110 * 12);
  });
});
