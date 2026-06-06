import { describe, expect, it } from '@jest/globals';
import {
  LoanCalculatorFormInputValues,
  loanCalculatorSchema,
} from '@/hooks/loanCalculatorSchema';

const baseValues: LoanCalculatorFormInputValues = {
  loanAmount: 300000,
  interest: 3,
  termInYears: 10,
  termInMonths: 0,
  downPayment: 10,
  downPaymentType: 'percent',
  desiredMonthlyPayment: 0,
  additionalMonthlyPayment: 0,
  startDate: '2024-01-01',
  calculationType: 'term',
  currency: 'GBP',
};

const parse = (overrides: Partial<LoanCalculatorFormInputValues>) =>
  loanCalculatorSchema.safeParse({ ...baseValues, ...overrides });

const downPaymentError = (result: ReturnType<typeof parse>): string | undefined => {
  if (result.success) return undefined;
  return result.error.issues.find(issue => issue.path[0] === 'downPayment')?.message;
};

describe('loanCalculatorSchema — down payment vs loan amount (B2)', () => {
  it('accepts the default 10% down payment', () => {
    expect(parse({}).success).toBe(true);
  });

  it('rejects a 100% down payment (leaves nothing to amortise)', () => {
    const result = parse({ downPaymentType: 'percent', downPayment: 100 });
    expect(result.success).toBe(false);
    expect(downPaymentError(result)).toBe('errors.downPaymentPercent');
  });

  it('accepts 99% but rejects anything from 100% upward', () => {
    expect(parse({ downPaymentType: 'percent', downPayment: 99 }).success).toBe(true);
    expect(parse({ downPaymentType: 'percent', downPayment: 100.01 }).success).toBe(false);
  });

  it('rejects a cash down payment equal to the loan amount', () => {
    const result = parse({ downPaymentType: 'cash', downPayment: 300000 });
    expect(result.success).toBe(false);
    expect(downPaymentError(result)).toBe('errors.downPaymentCash');
  });

  it('accepts a cash down payment below the loan amount', () => {
    expect(parse({ downPaymentType: 'cash', downPayment: 50000 }).success).toBe(true);
  });
});
