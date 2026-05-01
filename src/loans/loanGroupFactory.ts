import { CurrencyCode } from '@/currency/currencies';
import { LoanDeal, LoanFormSnapshot, LoanGroup, LoanResultSnapshot } from '@/types/SavedLoan';

type RawFormValues = {
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

const addMonths = (dateString: string, months: number): string => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
};

export const getEffectiveLoanAmount = (form: Pick<LoanFormSnapshot, 'loanAmount' | 'downPayment' | 'downPaymentType'>): number => {
  const downPayment = form.downPaymentType === 'PERCENT'
    ? (form.downPayment / 100) * form.loanAmount
    : form.downPayment;

  return Math.max(0, form.loanAmount - downPayment);
};

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
  loan: Pick<LoanGroup, 'category' | 'lender' | 'createdAt' | 'updatedAt' | 'formSnapshot' | 'resultSnapshot'>,
): LoanDeal => {
  const totalMonths = loan.resultSnapshot.totalTermInMonths
    || (loan.formSnapshot.termInYears * 12) + loan.formSnapshot.termInMonths
    || 12;

  return {
    id,
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
    name: loan.category === 'mortgage' ? 'Initial deal' : 'Fixed loan',
    lender: loan.lender,
    status: 'active',
    startDate: loan.formSnapshot.startDate,
    endDate: addMonths(loan.formSnapshot.startDate, totalMonths),
    openingBalance: getEffectiveLoanAmount(loan.formSnapshot),
    interestRate: loan.formSnapshot.interest,
    repaymentType: 'repayment',
    monthlyPayment: loan.resultSnapshot.monthlyPayments,
    regularOverpayment: loan.formSnapshot.additionalMonthlyPayment ?? 0,
    remainingTermInYears: loan.formSnapshot.termInYears,
    remainingTermInMonths: loan.formSnapshot.termInMonths,
  };
};
