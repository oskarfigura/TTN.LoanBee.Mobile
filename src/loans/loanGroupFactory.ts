import { CurrencyCode } from '@/currency/currencies';
import { getLoanCalculations } from '@/core/amortisation';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { DownPaymentType } from '@/core/DownPaymentType';
import { generateDefaultDealName } from '@/mortgage/tracker';
import { LOAN_GROUP_SCHEMA_VERSION, LoanDeal, LoanFormSnapshot, LoanGroup, LoanResultSnapshot } from '@/types/SavedLoan';
import { DEFAULT_LOAN_PURPOSE } from '@/loans/loanPurpose';
import { getEffectiveLoanAmount as computeEffectiveLoanAmount } from '@/utils/paymentValidation';
import { advanceMonthsClamped, formatIsoDate } from '@/utils/date';

export type RawFormValues = {
  loanAmount: number;
  interest: number;
  termInYears?: number | null;
  termInMonths?: number | null;
  downPayment: number;
  downPaymentType: string;
  desiredMonthlyPayment?: number | null;
  additionalMonthlyPayment?: number | null;
  startDate: string;
  calculationType: string;
};

type RawResultValues = {
  monthlyPayments: number;
  totalAmountPaid: number;
  totalInterestPaid: number;
  termInYears: number;
  termInMonths: number;
  tableItems: unknown[];
};

interface InitialDealOptions {
  name?: string;
  durationInMonths?: number;
  source?: LoanDeal['source'];
}

const addMonths = (dateString: string, months: number): string => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  advanceMonthsClamped(date, months);
  return formatIsoDate(date);
};

export const getEffectiveLoanAmount = (form: Pick<LoanFormSnapshot, 'loanAmount' | 'downPayment' | 'downPaymentType'>): number => (
  computeEffectiveLoanAmount(form.loanAmount, form.downPayment, form.downPaymentType)
);

export const normaliseFormSnapshot = (
  formValues: RawFormValues,
  currency: CurrencyCode,
): LoanFormSnapshot => ({
  loanAmount: formValues.loanAmount,
  interest: formValues.interest,
  termInYears: formValues.termInYears ?? 0,
  termInMonths: formValues.termInMonths ?? 0,
  downPayment: formValues.downPayment,
  downPaymentType: formValues.downPaymentType.toUpperCase() as 'CASH' | 'PERCENT',
  desiredMonthlyPayment: formValues.desiredMonthlyPayment ?? null,
  additionalMonthlyPayment: formValues.additionalMonthlyPayment ?? null,
  startDate: formValues.startDate,
  calculationType: formValues.calculationType.toUpperCase() as 'TERM' | 'PAYMENT',
  currency,
});

export const buildResultSnapshot = (
  result: RawResultValues,
  totalInterestPaidBaseline: number,
): LoanResultSnapshot => ({
  monthlyPayments: result.monthlyPayments,
  totalAmountPaid: result.totalAmountPaid,
  totalInterestPaid: result.totalInterestPaid,
  totalInterestPaidBaseline,
  termInYears: result.termInYears,
  termInMonths: result.termInMonths,
  totalTermInMonths: result.tableItems.length,
});

export const buildInitialDeal = (
  id: string,
  loan: Pick<LoanGroup, 'category' | 'lender' | 'createdAt' | 'updatedAt' | 'mortgageTermInMonths' | 'formSnapshot' | 'resultSnapshot'>,
  options: InitialDealOptions = {},
): LoanDeal => {
  const totalMonths = loan.mortgageTermInMonths
    || loan.resultSnapshot.totalTermInMonths
    || (loan.formSnapshot.termInYears * 12) + loan.formSnapshot.termInMonths
    || 12;
  const requestedDealDuration = Number.isFinite(options.durationInMonths)
    ? Number(options.durationInMonths)
    : undefined;
  const dealDurationInMonths = loan.category === 'mortgage' && requestedDealDuration !== undefined
    ? Math.min(Math.max(1, Math.round(requestedDealDuration)), totalMonths)
    : totalMonths;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return {
    id,
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
    name: options.name?.trim() || (
      loan.category === 'mortgage'
        ? generateDefaultDealName(years, months, 'repayment')
        : 'Fixed loan'
    ),
    lender: loan.lender,
    status: 'active',
    startDate: loan.formSnapshot.startDate,
    endDate: addMonths(loan.formSnapshot.startDate, dealDurationInMonths),
    openingBalance: getEffectiveLoanAmount(loan.formSnapshot),
    interestRate: loan.formSnapshot.interest,
    repaymentType: 'repayment',
    monthlyPayment: loan.resultSnapshot.monthlyPayments,
    regularOverpayment: loan.formSnapshot.additionalMonthlyPayment ?? 0,
    remainingTermInYears: years,
    remainingTermInMonths: months,
    source: loan.category === 'mortgage' ? options.source ?? 'estimate' : undefined,
  };
};

/**
 * Build an in-memory, unsaved `LoanGroup` for previewing a fresh calculation with
 * the same summary surface the saved-loan detail uses. It mirrors the save-time
 * assembly (factory snapshot + initial deal + baseline interest) but stays a draft:
 * `status: 'draft'`, not pinned, no nickname. Always loan-shaped — a calculation has
 * no mortgage tracking yet. Not persisted; built per render for display only.
 */
export const buildDraftLoanPreview = (
  formValues: RawFormValues,
  result: RawResultValues,
  currency: CurrencyCode,
): LoanGroup => {
  const baseline = getLoanCalculations(
    formValues.loanAmount,
    formValues.interest,
    formValues.termInYears ?? 0,
    formValues.termInMonths ?? 0,
    formValues.desiredMonthlyPayment ?? 0,
    // The core engine compares lowercase enum values ('term', 'percent'); the
    // persisted snapshot below intentionally stores uppercase. Send lowercase here
    // so a term/percent draft baseline isn't computed down the payment/cash path.
    formValues.calculationType.toLowerCase() as LoanCalculationType,
    formValues.downPayment,
    formValues.downPaymentType.toLowerCase() as DownPaymentType,
    0,
    formValues.startDate,
  );
  const now = new Date().toISOString();
  const formSnapshot = normaliseFormSnapshot(formValues, currency);
  const resultSnapshot = buildResultSnapshot(result, baseline.totalInterestPaid);
  const base = {
    category: 'loan' as const,
    lender: undefined,
    createdAt: now,
    updatedAt: now,
    mortgageTermInMonths: undefined,
    formSnapshot,
    resultSnapshot,
  };
  const initialDeal = buildInitialDeal('draft-deal', base);

  return {
    schemaVersion: LOAN_GROUP_SCHEMA_VERSION,
    id: 'draft-preview',
    createdAt: now,
    updatedAt: now,
    nickname: '',
    lender: undefined,
    category: 'loan',
    loanPurpose: DEFAULT_LOAN_PURPOSE,
    currency,
    status: 'draft',
    pinnedToDashboard: false,
    deals: [initialDeal],
    events: [],
    formSnapshot,
    resultSnapshot,
  };
};
