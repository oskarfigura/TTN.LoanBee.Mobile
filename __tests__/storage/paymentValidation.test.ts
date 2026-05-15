import { describe, expect, it } from '@jest/globals';
import { DownPaymentType } from '@/core/DownPaymentType';
import { getEffectiveLoanAmount, getMinimumAmortisingPayment } from '@/utils/paymentValidation';

describe('paymentValidation', () => {
  it('calculates the effective loan amount for percentage down payments', () => {
    expect(getEffectiveLoanAmount(300000, 10, DownPaymentType.PERCENT)).toBe(270000);
  });

  it('calculates the effective loan amount for cash down payments', () => {
    expect(getEffectiveLoanAmount(300000, 25000, DownPaymentType.CASH)).toBe(275000);
  });

  it('returns the minimum payment needed to reduce the balance', () => {
    expect(getMinimumAmortisingPayment(300000, 3, 10, DownPaymentType.PERCENT)).toBe(676);
  });
});
