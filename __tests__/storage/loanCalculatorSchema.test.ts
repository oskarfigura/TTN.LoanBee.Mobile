import { describe, expect, it } from '@jest/globals';
import {
  EXAMPLE_CALCULATOR_VALUES,
  LoanCalculatorFormInputValues,
  loanCalculatorSchema,
} from '@/shared/lib/hooks/loanCalculatorSchema';

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

const errorFor = (result: ReturnType<typeof parse>, field: string): string | undefined => {
  if (result.success) return undefined;
  return result.error.issues.find(issue => issue.path[0] === field)?.message;
};

const downPaymentError = (result: ReturnType<typeof parse>): string | undefined =>
  errorFor(result, 'downPayment');

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

describe('loanCalculatorSchema — term and payment refinements', () => {
  it('requires a non-zero term in TERM mode', () => {
    const result = parse({ calculationType: 'term', termInYears: 0, termInMonths: 0 });
    expect(errorFor(result, 'termInYears')).toBe('errors.termRequired');
  });

  it('requires a desired payment in PAYMENT mode', () => {
    const result = parse({ calculationType: 'payment', desiredMonthlyPayment: 0 });
    expect(errorFor(result, 'desiredMonthlyPayment')).toBe('errors.desiredPaymentRequired');
  });

  it('rejects a desired payment below the minimum amortising payment', () => {
    // 270k effective @ 3% → minimum amortising payment ≈ £701/mo, so £100 never amortises.
    const result = parse({ calculationType: 'payment', desiredMonthlyPayment: 100 });
    expect(errorFor(result, 'desiredMonthlyPayment')).toContain('errors.desiredPaymentMinimum');
  });

  it('rejects a desired payment that exceeds the loan balance', () => {
    const result = parse({ calculationType: 'payment', desiredMonthlyPayment: 500000 });
    expect(errorFor(result, 'desiredMonthlyPayment')).toBe('errors.desiredPaymentExceeds');
  });

  it('rejects an additional payment that exceeds the loan balance in TERM mode', () => {
    const result = parse({ calculationType: 'term', additionalMonthlyPayment: 500000 });
    expect(errorFor(result, 'additionalMonthlyPayment')).toBe('errors.additionalPaymentExceeds');
  });
});

describe('EXAMPLE_CALCULATOR_VALUES (first-run prefill)', () => {
  it('uses the intended example mortgage figures', () => {
    expect(EXAMPLE_CALCULATOR_VALUES).toMatchObject({
      category: 'mortgage',
      loanAmount: 250000,
      interest: 5,
      termInYears: 25,
      downPayment: 10,
      downPaymentType: 'percent',
    });
  });

  it('is a valid set of calculator inputs', () => {
    // Completed with the non-prefilled defaults the form supplies, the example must pass the
    // schema — a brand-new user can hit Calculate immediately without a validation error.
    const result = loanCalculatorSchema.safeParse({ ...baseValues, ...EXAMPLE_CALCULATOR_VALUES });
    expect(result.success).toBe(true);
  });
});
