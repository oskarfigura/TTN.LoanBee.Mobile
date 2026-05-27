import { describe, expect, it } from '@jest/globals';
import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import {
  getCalculationAppShareUrl,
  getCalculationWebShareUrl,
  getShareableCalculationValuesFromParams,
} from '@/share/calculationShareLink';

describe('calculationShareLink', () => {
  it('serializes term mode to the web-compatible share URL', () => {
    const url = getCalculationWebShareUrl({
      loanAmount: 250000,
      interest: 4.5,
      termInYears: 20,
      termInMonths: 3,
      downPayment: 15,
      downPaymentType: DownPaymentType.PERCENT,
      desiredMonthlyPayment: 0,
      additionalMonthlyPayment: 200,
      startDate: '2026-01-05',
      calculationType: LoanCalculationType.TERM,
      currency: 'GBP',
    });

    expect(url).toBe(
      'https://www.loanamortisationcalculator.com/?amount=250000&interest=4.5&downPayment=15&downPaymentType=percent&startDate=2026-01-05&mode=term&currency=GBP&years=20&months=3&extra=200',
    );
  });

  it('serializes payment mode and omits extra payment', () => {
    const url = getCalculationAppShareUrl({
      loanAmount: 180000,
      interest: 6.1,
      termInYears: 0,
      termInMonths: 0,
      downPayment: 25000,
      downPaymentType: DownPaymentType.CASH,
      desiredMonthlyPayment: 1750,
      additionalMonthlyPayment: 250,
      startDate: '2027-11-09',
      calculationType: LoanCalculationType.PAYMENT,
      currency: 'GBP',
    });

    expect(url).toBe(
      'loanbee://calculator/share?amount=180000&interest=6.1&downPayment=25000&downPaymentType=cash&startDate=2027-11-09&mode=payment&currency=GBP&source=mobile&share=1&payment=1750',
    );
  });

  it('preserves zero down payments in share URLs', () => {
    const url = getCalculationWebShareUrl({
      loanAmount: 120000,
      interest: 5,
      termInYears: 10,
      termInMonths: 0,
      downPayment: 0,
      downPaymentType: DownPaymentType.CASH,
      desiredMonthlyPayment: 0,
      additionalMonthlyPayment: 0,
      startDate: '2026-06-01',
      calculationType: LoanCalculationType.TERM,
      currency: 'USD',
    });

    expect(url).toContain('downPayment=0');
    expect(url).toContain('downPaymentType=cash');
  });

  it('parses shared payment mode params', () => {
    const values = getShareableCalculationValuesFromParams(new URLSearchParams({
      amount: '180000',
      interest: '6.1',
      years: '0',
      months: '0',
      downPayment: '25000',
      downPaymentType: 'cash',
      startDate: '2027-11-09',
      mode: 'payment',
      payment: '1750',
      currency: 'GBP',
      source: 'mobile',
      share: '1',
    }));

    expect(values.loanAmount).toBe(180000);
    expect(values.interest).toBe(6.1);
    expect(values.downPaymentType).toBe(DownPaymentType.CASH);
    expect(values.calculationType).toBe(LoanCalculationType.PAYMENT);
    expect(values.desiredMonthlyPayment).toBe(1750);
    expect(values.currency).toBe('GBP');
  });

  it('rejects loan amounts over the 100M cap (falls back to default)', () => {
    const values = getShareableCalculationValuesFromParams(new URLSearchParams({
      amount: '500000000',
      interest: '3',
      years: '10',
      months: '0',
      downPayment: '0',
      downPaymentType: 'percent',
      startDate: '2026-01-01',
      mode: 'term',
      currency: 'GBP',
    }));
    // 500M is above the 100M cap, so parseNumberParam discards it and falls
    // back to defaultShareValues.loanAmount.
    expect(values.loanAmount).toBe(300000);
  });

  it('rejects monthly payments over the 1M cap (falls back to default)', () => {
    const values = getShareableCalculationValuesFromParams(new URLSearchParams({
      amount: '300000',
      interest: '3',
      years: '0',
      months: '0',
      downPayment: '0',
      downPaymentType: 'percent',
      startDate: '2026-01-01',
      mode: 'payment',
      payment: '5000000',
      currency: 'GBP',
    }));
    // 5M is above the 1M payment cap → falls back to defaultShareValues.desiredMonthlyPayment (0),
    // then normaliseShareableCalculationValues bumps it to the calculated minimum.
    expect(values.desiredMonthlyPayment).toBeLessThanOrEqual(1_000_000);
  });

  it('accepts loan amounts at the 100M cap', () => {
    const values = getShareableCalculationValuesFromParams(new URLSearchParams({
      amount: '100000000',
      interest: '3',
      years: '10',
      months: '0',
      downPayment: '0',
      downPaymentType: 'percent',
      startDate: '2026-01-01',
      mode: 'term',
      currency: 'GBP',
    }));
    expect(values.loanAmount).toBe(100_000_000);
  });

  it('falls back for invalid values without producing unsafe payment inputs', () => {
    const values = getShareableCalculationValuesFromParams(new URLSearchParams({
      amount: 'nope',
      interest: '0',
      years: '0',
      months: '0',
      downPayment: '150',
      downPaymentType: 'percent',
      startDate: '2027-02-31',
      mode: 'payment',
      payment: '0',
      currency: 'CAD',
    }));

    expect(values.loanAmount).toBe(300000);
    expect(values.interest).toBe(3);
    expect(values.termInYears).toBe(0);
    expect(values.termInMonths).toBe(0);
    expect(values.downPayment).toBe(10);
    expect(values.calculationType).toBe(LoanCalculationType.PAYMENT);
    expect(values.desiredMonthlyPayment).toBeGreaterThan(0);
    expect(values.currency).toBe('GBP');
  });
});
