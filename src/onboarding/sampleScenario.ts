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
  baselineInterest: number;
  withOverpaymentInterest: number;
  interestSaved: number;
  monthsSaved: number;
}

export interface BalanceSeries {
  baseline: number[];
  withOverpayment: number[];
  initialBalance: number;
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
    baselineInterest: baseline.totalInterestPaid,
    withOverpaymentInterest: withOverpayment.totalInterestPaid,
    interestSaved: Math.max(0, baseline.totalInterestPaid - withOverpayment.totalInterestPaid),
    monthsSaved: Math.max(0, baseline.tableItems.length - withOverpayment.tableItems.length),
  };
}

/**
 * Returns subsampled balance arrays for the onboarding sparkline. Both arrays
 * are aligned to the same X axis (the baseline term, which is longer), so the
 * with-overpayment series is padded with zeros after its earlier payoff point.
 */
export function computeBalanceSeries(
  scenario: SampleScenario,
  points = 48,
): BalanceSeries {
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
  const withOver = getLoanCalculations(
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

  const baselineRem = baseline.loanChartRemainingArray;
  const withRem = withOver.loanChartRemainingArray;
  const total = baselineRem.length - 1;

  const sampleAt = (arr: number[], monthIndex: number): number => {
    if (monthIndex >= arr.length) return 0;
    return Math.max(0, arr[monthIndex] ?? 0);
  };

  const baselineSamples: number[] = [];
  const withSamples: number[] = [];
  for (let i = 0; i < points; i++) {
    const monthIndex = Math.round((i / (points - 1)) * total);
    baselineSamples.push(sampleAt(baselineRem, monthIndex));
    withSamples.push(sampleAt(withRem, monthIndex));
  }

  return {
    baseline: baselineSamples,
    withOverpayment: withSamples,
    initialBalance: scenario.loanAmount,
  };
}
