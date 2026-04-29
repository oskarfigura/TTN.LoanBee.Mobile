import { CurrencyCode } from '@/currency/currencies';

export interface SavedLoan {
  id: string;
  createdAt: string;
  updatedAt: string;
  nickname: string;
  lender?: string;
  category: 'mortgage' | 'loan';
  currency: CurrencyCode;
  parentLoanId?: string;
  formSnapshot: {
    loanAmount: number;
    interest: number;
    termInYears: number;
    termInMonths: number;
    downPayment: number;
    downPaymentType: 'CASH' | 'PERCENT';
    desiredMonthlyPayment: number | null;
    additionalMonthlyPayment: number | null;
    startDate: string;
    calculationType: 'TERM' | 'PAYMENT';
    currency: CurrencyCode;
  };
  resultSnapshot: {
    monthlyPayments: number;
    totalAmountPaid: number;
    totalInterestPaid: number;
    totalInterestPaidBaseline: number;
    termInYears: number;
    termInMonths: number;
    totalTermInMonths: number;
  };
}
