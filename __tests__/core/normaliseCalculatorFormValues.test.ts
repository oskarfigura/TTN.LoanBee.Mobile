import { describe, expect, it } from '@jest/globals';
import { normaliseCalculatorFormValues } from '@/shared/lib/hooks/normaliseCalculatorFormValues';

// Guards the contract every "open a calculation in the calculator" journey relies on:
// stored inputs (recent calc, draft session, or a saved loan's formSnapshot) must port
// into the form's input shape regardless of how the enums were serialised. A regression
// here silently breaks the calc-type tabs / down-payment toggle when a form is reopened.
describe('normaliseCalculatorFormValues', () => {
  it('passes lowercase recent/draft enums through unchanged', () => {
    const result = normaliseCalculatorFormValues({
      calculationType: 'term',
      downPaymentType: 'percent',
      interest: 4.5,
      loanAmount: 300000,
      currency: 'USD',
    });

    expect(result.calculationType).toBe('term');
    expect(result.downPaymentType).toBe('percent');
    expect(result.interest).toBe(4.5);
    expect(result.loanAmount).toBe(300000);
    expect(result.currency).toBe('USD');
  });

  it('lowercases UPPERCASE formSnapshot enums so they match the schema', () => {
    const result = normaliseCalculatorFormValues({
      calculationType: 'TERM',
      downPaymentType: 'PERCENT',
      interest: 3.99,
    });

    expect(result.calculationType).toBe('term');
    expect(result.downPaymentType).toBe('percent');
    expect(result.interest).toBe(3.99);
  });

  it('handles the PAYMENT / CASH variants too', () => {
    const result = normaliseCalculatorFormValues({
      calculationType: 'PAYMENT',
      downPaymentType: 'CASH',
    });

    expect(result.calculationType).toBe('payment');
    expect(result.downPaymentType).toBe('cash');
  });

  it('preserves null money fields (snapshots store them as null, not 0)', () => {
    const result = normaliseCalculatorFormValues({
      desiredMonthlyPayment: null,
      additionalMonthlyPayment: null,
    });

    expect(result.desiredMonthlyPayment).toBeNull();
    expect(result.additionalMonthlyPayment).toBeNull();
  });

  it('returns an empty object for null / non-object input', () => {
    expect(normaliseCalculatorFormValues(null)).toEqual({});
    expect(normaliseCalculatorFormValues(undefined)).toEqual({});
  });
});
