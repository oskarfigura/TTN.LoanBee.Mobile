import { describe, it, expect } from '@jest/globals';
import {
  getLoanCalculations,
  calculateDownPayment,
  calculateMinPayment,
  calculateMonthlyPayments,
  calculateTerm,
  getTableItems,
} from '@/shared/domain/core/amortisation';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';

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
    expect(calculateMinPayment(100000, 3)).toBe(251);
  });

  it('returns 1 when interest is 0 (just the +1 guard)', () => {
    expect(calculateMinPayment(100000, 0)).toBe(1);
  });

  it('rounds up fractional payments', () => {
    expect(calculateMinPayment(100000, 1)).toBe(85);
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

  it('produces NaN for 0% interest (known limitation; validation rejects 0% upstream)', () => {
    const result = calculateMonthlyPayments(0, 10, 0, 270000);
    expect(isNaN(result)).toBe(true);
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

// ─── safety cap ──────────────────────────────────────────────────────────────
// Input validation (form schema + share-link clamping) is the real boundary.
// These tests assert the in-engine cap stops a non-convergent loop, so a
// validation bypass cannot OOM the app.

describe('getTableItems safety cap', () => {
  const MAX_ROWS = 110 * 12;

  it('terminates at the cap when payment is less than interest', () => {
    // 100000 @ 12%/yr → monthlyInterest 1% → interest portion = £1000. Pay £500.
    // Without the cap this loop never converges.
    const result = getTableItems(100000, 0.01, 500, 0);
    expect(result.tableItems.length).toBeLessThanOrEqual(MAX_ROWS);
  });

  it('terminates at the cap when payment exactly equals interest', () => {
    const result = getTableItems(100000, 0.01, 1000, 0);
    expect(result.tableItems.length).toBeLessThanOrEqual(MAX_ROWS);
  });

  it('terminates at the cap for worst-case validated inputs (100M @ 100% at min payment)', () => {
    // At the schema maximums (loan 100M, interest 100%) the validated minimum
    // payment is barely above interest, so principal pays down trivially slowly.
    // The cap is what stops this from being a multi-second/OOM operation.
    const amount = 100_000_000;
    const monthlyInterest = 100 / 100 / 12;
    const minPayment = Math.ceil(amount * monthlyInterest + 1);
    const result = getTableItems(amount, monthlyInterest, minPayment, 0);
    expect(result.tableItems.length).toBeLessThanOrEqual(MAX_ROWS);
  });
});
