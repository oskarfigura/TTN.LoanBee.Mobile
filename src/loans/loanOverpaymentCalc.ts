import { getLoanCalculations } from '@/core/amortisation';
import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { LoanFormSnapshot } from '@/types/SavedLoan';
import {
  LumpSumEntry,
  PhasedAmortisationResult,
  computePhasedRemainingArray,
  computePhasedTotals,
} from './phasedAmortisation';

export type { LumpSumEntry };

export type OverpaymentTotals = PhasedAmortisationResult;

export type OverpaymentResult = {
  baseline: OverpaymentTotals;
  scenario: OverpaymentTotals;
  interestSaved: number;
  monthsSaved: number;
};

const toCalcType = (s: string): LoanCalculationType =>
  s.toLowerCase() as LoanCalculationType;

const toDpType = (s: string): DownPaymentType =>
  s.toLowerCase() as DownPaymentType;

const runBaseCalculation = (form: LoanFormSnapshot, monthlyOverpayment: number) => (
  getLoanCalculations(
    form.loanAmount, form.interest, form.termInYears, form.termInMonths,
    form.desiredMonthlyPayment ?? 0, toCalcType(form.calculationType),
    form.downPayment, toDpType(form.downPaymentType),
    monthlyOverpayment, form.startDate,
  )
);

const baselineTotals = (form: LoanFormSnapshot): OverpaymentTotals => {
  const result = runBaseCalculation(form, 0);
  return {
    totalInterestPaid: result.totalInterestPaid,
    totalTermInMonths: result.tableItems.length,
    monthlyPayments: result.monthlyPayments,
  };
};

const scenarioTotals = (
  form: LoanFormSnapshot,
  monthlyOverpayment: number,
  lumpSums: LumpSumEntry[],
): OverpaymentTotals => (
  computePhasedTotals({
    baseResult: runBaseCalculation(form, monthlyOverpayment),
    interest: form.interest,
    startDate: form.startDate,
    lumpSums,
  })
);

export const buildScenarioRemainingArray = (
  form: LoanFormSnapshot,
  monthlyOverpayment: number,
  lumpSums: LumpSumEntry[],
): number[] => (
  computePhasedRemainingArray({
    baseResult: runBaseCalculation(form, monthlyOverpayment),
    interest: form.interest,
    startDate: form.startDate,
    lumpSums,
  })
);

export const computeLoanOverpayments = (
  form: LoanFormSnapshot,
  monthlyOverpayment: number,
  lumpSums: LumpSumEntry[],
): OverpaymentResult => {
  const baseline = baselineTotals(form);
  const scenario = scenarioTotals(form, monthlyOverpayment, lumpSums);
  return {
    baseline,
    scenario,
    interestSaved: Math.max(0, baseline.totalInterestPaid - scenario.totalInterestPaid),
    monthsSaved: Math.max(0, baseline.totalTermInMonths - scenario.totalTermInMonths),
  };
};
