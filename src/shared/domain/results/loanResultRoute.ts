import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import type { LoanCalculatorFormValues } from '@/shared/lib/hooks/useLoanCalculatorForm';
import { recentCalculationsStorage } from '@/shared/lib/storage/recentCalculations';
import type { SavedLoan } from '@/shared/domain/types/SavedLoan';
import { createDraftResultSession } from './draftResultStore';

export type LoanResult = ReturnType<typeof getLoanCalculations>;

export const getResultForFormValues = (form: LoanCalculatorFormValues): LoanResult => (
  getLoanCalculations(
    form.loanAmount,
    form.interest,
    form.termInYears ?? 0,
    form.termInMonths ?? 0,
    form.desiredMonthlyPayment ?? 0,
    form.calculationType as LoanCalculationType,
    form.downPayment,
    form.downPaymentType as DownPaymentType,
    form.additionalMonthlyPayment,
    form.startDate,
  )
);

export const getResultForSavedLoan = (loan: SavedLoan): LoanResult => {
  const form = loan.formSnapshot;

  return getLoanCalculations(
    form.loanAmount,
    form.interest,
    form.termInYears,
    form.termInMonths,
    form.desiredMonthlyPayment ?? 0,
    form.calculationType.toLowerCase() as LoanCalculationType,
    form.downPayment,
    form.downPaymentType.toLowerCase() as DownPaymentType,
    form.additionalMonthlyPayment ?? 0,
    form.startDate,
  );
};

// Baseline variants: the same calculation with overpayments removed
// (additionalMonthlyPayment = 0). Their loanChartRemainingArray feeds the with/without
// comparison chart on the result/charts view. Mirrors how totalInterestPaidBaseline is
// derived (CLAUDE.md) — a second pass rather than a separate engine.
export const getBaselineResultForFormValues = (form: LoanCalculatorFormValues): LoanResult => (
  getLoanCalculations(
    form.loanAmount,
    form.interest,
    form.termInYears ?? 0,
    form.termInMonths ?? 0,
    form.desiredMonthlyPayment ?? 0,
    form.calculationType as LoanCalculationType,
    form.downPayment,
    form.downPaymentType as DownPaymentType,
    0,
    form.startDate,
  )
);

export const getBaselineResultForSavedLoan = (loan: SavedLoan): LoanResult => {
  const form = loan.formSnapshot;

  return getLoanCalculations(
    form.loanAmount,
    form.interest,
    form.termInYears,
    form.termInMonths,
    form.desiredMonthlyPayment ?? 0,
    form.calculationType.toLowerCase() as LoanCalculationType,
    form.downPayment,
    form.downPaymentType.toLowerCase() as DownPaymentType,
    0,
    form.startDate,
  );
};

export const buildSavedLoanResultParams = (loan: SavedLoan) => ({
  mode: 'saved',
  savedLoanId: loan.id,
  savedLoan: JSON.stringify(loan),
  currency: loan.currency,
});

// Opens a fresh calculation result: persists it twice — an ephemeral draft session
// (for the unsaved-result flow) and a durable Recent Calculations entry — then returns
// the route params that point at them. Unlike the sibling `build*Params` helpers this
// is not pure; the name signals the writes. Every calculator submit or shared-link open
// records one Recent entry (capped at MAX_RECENT_CALCULATIONS).
export const beginDraftResult = (
  result: LoanResult,
  formValues: LoanCalculatorFormValues,
  currency: CurrencyCode,
) => ({
  mode: 'draft',
  draftId: createDraftResultSession(result, formValues, currency).id,
  recentId: recentCalculationsStorage.addFromResult({
    result,
    formValues,
    currency,
  }).id,
  currency,
});

export const buildRecentResultParams = (recentId: string) => ({
  mode: 'recent',
  recentId,
});

// Reopen a calculation in the calculator with its inputs pre-filled, so "Edit" on a
// draft or recent result lets the user change the figures and recalculate rather
// than just bouncing back to wherever they came from.
export const buildEditCalculatorParams = (
  formValues: LoanCalculatorFormValues,
  currency: CurrencyCode,
) => ({
  editValues: JSON.stringify(formValues),
  currency,
});
