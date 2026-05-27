import { getLoanCalculations } from '@/core/amortisation';
import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { SavedLoan } from '@/types/SavedLoan';
import { computePhasedTotals, LumpSumEntry } from './phasedAmortisation';

export type LoanScenarioResult = {
  totalInterestPaid: number;
  totalTermInMonths: number;
  monthlyPayments: number;
};

export const computeLoanWithEvents = (
  loan: SavedLoan,
  monthlyOverpayment?: number,
): LoanScenarioResult => {
  const form = loan.formSnapshot;
  const calcType = form.calculationType.toLowerCase() as LoanCalculationType;
  const dpType = form.downPaymentType.toLowerCase() as DownPaymentType;
  const overpayment = monthlyOverpayment ?? (form.additionalMonthlyPayment ?? 0);

  const lumpSums: LumpSumEntry[] = loan.events
    .filter(e => e.type === 'lumpOverpayment' && (e.amount ?? 0) > 0)
    .map(e => ({ date: e.date, amount: e.amount ?? 0 }));

  const baseResult = getLoanCalculations(
    form.loanAmount, form.interest, form.termInYears, form.termInMonths,
    form.desiredMonthlyPayment ?? 0, calcType, form.downPayment, dpType,
    overpayment, form.startDate,
  );

  return computePhasedTotals({
    baseResult,
    interest: form.interest,
    startDate: form.startDate,
    lumpSums,
  });
};
