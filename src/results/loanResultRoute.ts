import { getLoanCalculations } from '@/core/amortisation';
import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { CurrencyCode } from '@/currency/currencies';
import { SavedLoan } from '@/types/SavedLoan';
import { createDraftResultSession } from './draftResultStore';

export type LoanResult = ReturnType<typeof getLoanCalculations>;

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

export const buildSavedLoanResultParams = (loan: SavedLoan) => ({
  mode: 'saved',
  savedLoanId: loan.id,
  savedLoan: JSON.stringify(loan),
  currency: loan.currency,
});

export const buildDraftResultParams = (
  result: LoanResult,
  formValues: unknown,
  currency: CurrencyCode,
) => ({
  mode: 'draft',
  draftId: createDraftResultSession(result, formValues, currency).id,
  currency,
});
