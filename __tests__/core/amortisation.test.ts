import { describe, it, expect } from '@jest/globals';
import {
  getLoanCalculations,
  calculateDownPayment,
  calculateMinPayment,
  calculateMonthlyPayments,
  calculateTerm,
  getTableItems,
} from '../../src/core/amortisation';
import { DownPaymentType } from '../../src/core/DownPaymentType';
import { LoanCalculationType } from '../../src/core/LoanCalculationType';

// ─── calculateDownPayment ────────────────────────────────────────────────────

describe('calculateDownPayment', () => {
  it('returns the value unchanged for CASH type', () => {
    expect(calculateDownPayment(300000, 30000, DownPaymentType.CASH)).toBe(30000);
  });

  it('calculates 10% of loan amount for PERCENT type', () => {
    expect(calculateDownPayment(300000, 10, DownPaymentType.PERCENT)).toBe(30000);
  });

  it('calculates 20% correctly', () => {
    expect(calculateDownPayment(500000, 20, DownPaymentType.PERCENT)).toBe(100000);
  });

  it('returns 0 for 0% down payment', () => {
    expect(calculateDownPayment(300000, 0, DownPaymentType.PERCENT)).toBe(0);
  });

  it('returns 0 for 0 cash down payment', () => {
    expect(calculateDownPayment(300000, 0, DownPaymentType.CASH)).toBe(0);
  });
});

// ─── calculateMinPayment ─────────────────────────────────────────────────────

describe('calculateMinPayment', () => {
  it('calculates minimum payment for standard inputs', () => {
    // 100000 @ 3% → interest portion £250/mo; buffer floor is £10
    expect(calculateMinPayment(100000, 3)).toBe(260);
  });

  it('returns the £10 floor when interest is 0', () => {
    expect(calculateMinPayment(100000, 0)).toBe(10);
  });

  it('rounds up fractional payments', () => {
    // 100000 @ 1% → £83.33/mo + £10 buffer = £93.33 → 94
    expect(calculateMinPayment(100000, 1)).toBe(94);
  });

  it('scales the buffer at large balances so principal is always meaningful', () => {
    // 1B @ 100% → interest ≈ 8.33M/mo; 0.1% buffer ≈ £8333
    const interestPortion = Math.ceil((1_000_000_000 * 1) / 12);
    const result = calculateMinPayment(1_000_000_000, 100);
    expect(result - interestPortion).toBeGreaterThanOrEqual(8000);
  });
});

// ─── calculateMonthlyPayments ────────────────────────────────────────────────

describe('calculateMonthlyPayments', () => {
  it('calculates monthly payment for standard 10-year loan at 3%', () => {
    const result = calculateMonthlyPayments(0.0025, 10, 0, 270000);
    expect(result).toBeCloseTo(2607.14, 0);
  });

  it('calculates monthly payment for 1 year at 5%', () => {
    const r = 5 / 100 / 12;
    const result = calculateMonthlyPayments(r, 1, 0, 12000);
    expect(result).toBeCloseTo(1027.29, 0);
  });

  it('handles mixed years and months term (1 year 6 months)', () => {
    const result = calculateMonthlyPayments(0.0025, 1, 6, 100000);
    expect(result).toBeGreaterThan(0);
    const result24 = calculateMonthlyPayments(0.0025, 2, 0, 100000);
    expect(result).toBeGreaterThan(result24);
  });

  it('returns principal / months for 0% interest (zero-interest guard)', () => {
    const result = calculateMonthlyPayments(0, 10, 0, 270000);
    expect(result).toBeCloseTo(270000 / 120, 5);
  });

  it('returns 0 when term is 0 (defensive guard)', () => {
    expect(calculateMonthlyPayments(0.0025, 0, 0, 270000)).toBe(0);
  });
});

// ─── calculateTerm ───────────────────────────────────────────────────────────

describe('calculateTerm', () => {
  it('recovers ~120 months for standard 10-year loan', () => {
    const monthly = calculateMonthlyPayments(0.0025, 10, 0, 270000);
    const result = calculateTerm(0.0025, monthly, 270000);
    expect(result).toBeCloseTo(120, 0);
  });

  it('returns a shorter term for a higher monthly payment', () => {
    const monthly = calculateMonthlyPayments(0.0025, 10, 0, 270000);
    const longTerm = calculateTerm(0.0025, monthly, 270000);
    const shortTerm = calculateTerm(0.0025, 3500, 270000);
    expect(shortTerm).toBeLessThan(longTerm);
  });
});

// ─── getTableItems ───────────────────────────────────────────────────────────

describe('getTableItems', () => {
  const AMOUNT = 270000;
  const MONTHLY_INTEREST = 0.0025;
  const MONTHLY_PAYMENT = calculateMonthlyPayments(MONTHLY_INTEREST, 10, 0, AMOUNT);
  const DOWN_PAYMENT = 30000;

  const result = getTableItems(
    AMOUNT,
    MONTHLY_INTEREST,
    MONTHLY_PAYMENT,
    DOWN_PAYMENT
  );

  it('produces exactly 120 table rows for a 10-year loan', () => {
    expect(result.tableItems).toHaveLength(120);
  });

  it('first row opening balance equals the loan amount', () => {
    expect(parseFloat(result.tableItems[0].remaining)).toBeCloseTo(AMOUNT, 0);
  });

  it('first row interest = amount * monthlyInterest', () => {
    expect(parseFloat(result.tableItems[0].interest)).toBeCloseTo(675, 0);
  });

  it('first row principal = monthlyPayment - interest', () => {
    expect(parseFloat(result.tableItems[0].principal)).toBeCloseTo(
      MONTHLY_PAYMENT - 675,
      0
    );
  });

  it('last row ending balance is approximately zero', () => {
    const lastRow = result.tableItems[result.tableItems.length - 1];
    expect(parseFloat(lastRow.ending)).toBeCloseTo(0, 0);
  });

  it('total interest paid is positive and less than the loan amount', () => {
    expect(result.totalInterestPaid).toBeGreaterThan(0);
    expect(result.totalInterestPaid).toBeLessThan(AMOUNT);
  });

  it('termInYears and termInMonths derived from table length (120 rows = 10yr 0mo)', () => {
    expect(result.termInYears).toBe(10);
    expect(result.termInMonths).toBe(0);
  });

  it('chart accumulative arrays have an initial 0-entry (length = tableItems.length + 1)', () => {
    expect(result.loanChartMonthlyArray.length).toBe(result.tableItems.length + 1);
    expect(result.loanChartInterestArray.length).toBe(result.tableItems.length + 1);
    expect(result.loanChartRemainingArray.length).toBe(result.tableItems.length + 1);
  });

  it('chart label array is always 1 shorter than tableItems', () => {
    expect(result.loanChartLabelArray.length).toBe(result.tableItems.length - 1);
  });

  it('totalAmountPaid includes original amount, down payment, and interest', () => {
    const expected = AMOUNT + DOWN_PAYMENT + result.totalInterestPaid;
    expect(result.totalAmountPaid).toBeCloseTo(expected, 1);
  });
});

// ─── getLoanCalculations (integration) ───────────────────────────────────────

describe('getLoanCalculations', () => {
  it('golden path: £300k loan, 3%, 10yr, 10% down payment', () => {
    const result = getLoanCalculations(
      300000, 3, 10, 0, 0,
      LoanCalculationType.TERM, 10, DownPaymentType.PERCENT, 0, '2024-01-01'
    );

    expect(result.downPayment).toBe(30000);
    expect(result.amount).toBe(300000);
    expect(result.monthlyPayments).toBeCloseTo(2607.14, 0);
    expect(result.tableItems).toHaveLength(120);
    expect(result.totalInterestPaid).toBeGreaterThan(0);
    expect(result.startDate).toBe('2024-01-01');
  });

  it('additional monthly payment reduces the number of payments', () => {
    const base = getLoanCalculations(
      300000, 3, 10, 0, 0,
      LoanCalculationType.TERM, 10, DownPaymentType.PERCENT, 0, '2024-01-01'
    );
    const withExtra = getLoanCalculations(
      300000, 3, 10, 0, 0,
      LoanCalculationType.TERM, 10, DownPaymentType.PERCENT, 500, '2024-01-01'
    );
    expect(withExtra.tableItems.length).toBeLessThan(base.tableItems.length);
  });

  it('cash down payment is used directly (not as a percentage)', () => {
    const result = getLoanCalculations(
      300000, 3, 10, 0, 0,
      LoanCalculationType.TERM, 50000, DownPaymentType.CASH, 0, '2024-01-01'
    );
    expect(result.downPayment).toBe(50000);
  });

  it('zero down payment leaves loan amount unchanged', () => {
    const result = getLoanCalculations(
      300000, 3, 10, 0, 0,
      LoanCalculationType.TERM, 0, DownPaymentType.PERCENT, 0, '2024-01-01'
    );
    expect(result.downPayment).toBe(0);
    expect(result.monthlyPayments).toBeGreaterThan(2604.74);
  });

  it('PAYMENT calculation type uses desired monthly payment directly', () => {
    const result = getLoanCalculations(
      300000, 3, 0, 0, 3000,
      LoanCalculationType.PAYMENT, 10, DownPaymentType.PERCENT, 0, '2024-01-01'
    );
    expect(result.monthlyPayments).toBe(3000);
  });
});

// ─── termination guards ──────────────────────────────────────────────────────

describe('getTableItems termination guards', () => {
  it('returns empty schedule when payment is less than interest (no infinite loop)', () => {
    // 100000 @ 12%/yr → monthlyInterest 1% → interest portion = £1000. Pay £500.
    // Without the guard this would never terminate.
    const result = getTableItems(100000, 0.01, 500, 0);
    expect(result.tableItems).toEqual([]);
    expect(result.totalInterestPaid).toBe(0);
  });

  it('returns empty schedule when payment exactly equals interest', () => {
    const result = getTableItems(100000, 0.01, 1000, 0);
    expect(result.tableItems).toEqual([]);
  });

  it('returns empty schedule when monthlyPayments is NaN', () => {
    const result = getTableItems(100000, 0.0025, Number.NaN, 0);
    expect(result.tableItems).toEqual([]);
  });

  it('returns empty schedule when amount is 0', () => {
    const result = getTableItems(0, 0.0025, 1000, 0);
    expect(result.tableItems).toEqual([]);
  });
});
