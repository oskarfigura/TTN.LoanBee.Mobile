import { describe, expect, it } from '@jest/globals';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { getEffectiveLoanAmount, getMinimumAmortisingPayment } from '@/shared/lib/utils/paymentValidation';

describe('paymentValidation', () => {
  it('calculates the effective loan amount for percentage down payments', () => {
    expect(getEffectiveLoanAmount(300000, 10, DownPaymentType.PERCENT)).toBe(270000);
  });

  it('calculates the effective loan amount for cash down payments', () => {
    expect(getEffectiveLoanAmount(300000, 25000, DownPaymentType.CASH)).toBe(275000);
  });

  it('returns the minimum payment that actually amortises within the schedule cap', () => {
    // 270k effective @ 3%. The old interest-only-plus-£1 floor returned 676, which
    // only reduced the balance by ~£1/mo and never paid the loan off.
    expect(getMinimumAmortisingPayment(300000, 3, 10, DownPaymentType.PERCENT)).toBe(701);
  });

  it('produces a fully-amortised schedule when paying exactly the minimum', () => {
    const minimum = getMinimumAmortisingPayment(300000, 3, 10, DownPaymentType.PERCENT);
    const result = getLoanCalculations(
      300000,
      3,
      0,
      0,
      minimum,
      LoanCalculationType.PAYMENT,
      10,
      DownPaymentType.PERCENT,
      0,
      '2026-01-01',
    );
    expect(result.isFullyAmortised).toBe(true);
    expect(result.remainingBalance).toBe(0);
  });

  it('accepts uppercase downPaymentType casing (stored snapshot form)', () => {
    expect(getEffectiveLoanAmount(300000, 10, 'PERCENT')).toBe(270000);
    expect(getEffectiveLoanAmount(300000, 25000, 'CASH')).toBe(275000);
  });

  it('clamps to 0 when down payment exceeds loan amount', () => {
    expect(getEffectiveLoanAmount(100, 500, DownPaymentType.CASH)).toBe(0);
  });
});
