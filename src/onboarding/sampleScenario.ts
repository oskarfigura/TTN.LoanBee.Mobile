import { CurrencyCode } from '@/currency/currencies';
import { getLoanCalculations } from '@/core/amortisation';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { DownPaymentType } from '@/core/DownPaymentType';

/**
 * Per-currency mortgage scenarios used by the onboarding guide and the
 * "Try it now" prefill on the home screen. The two flows share this module so
 * the savings number shown on slide 1 is the same number the calculator will
 * confirm after the user taps the CTA.
 *
 * Figures are illustrative — picked to be mortgage-shaped and produce a
 * meaningful overpayment saving for each locale's typical rate environment.
 */

export interface SampleScenario {
  loanAmount: number;
  interest: number;
  termInYears: number;
  additionalMonthlyPayment: number;
}

const SAMPLES: Record<CurrencyCode, SampleScenario> = {
  GBP: { loanAmount: 200000, interest: 4.5, termInYears: 25, additionalMonthlyPayment: 200 },
  EUR: { loanAmount: 200000, interest: 3.5, termInYears: 25, additionalMonthlyPayment: 200 },
  USD: { loanAmount: 300000, interest: 6.5, termInYears: 30, additionalMonthlyPayment: 300 },
  PLN: { loanAmount: 500000, interest: 7.5, termInYears: 25, additionalMonthlyPayment: 500 },
};

export function getSampleScenario(currency: CurrencyCode): SampleScenario {
  return SAMPLES[currency] ?? SAMPLES.GBP;
}

export interface SampleSavings {
  interestSaved: number;
  monthsSaved: number;
}

export function computeSampleSavings(scenario: SampleScenario): SampleSavings {
  const startDate = new Date().toISOString().split('T')[0];
  const baseline = getLoanCalculations(
    scenario.loanAmount,
    scenario.interest,
    scenario.termInYears,
    0,
    0,
    LoanCalculationType.TERM,
    0,
    DownPaymentType.PERCENT,
    0,
    startDate,
  );
  const withOverpayment = getLoanCalculations(
    scenario.loanAmount,
    scenario.interest,
    scenario.termInYears,
    0,
    0,
    LoanCalculationType.TERM,
    0,
    DownPaymentType.PERCENT,
    scenario.additionalMonthlyPayment,
    startDate,
  );
  return {
    interestSaved: Math.max(0, baseline.totalInterestPaid - withOverpayment.totalInterestPaid),
    monthsSaved: Math.max(0, baseline.tableItems.length - withOverpayment.tableItems.length),
  };
}
