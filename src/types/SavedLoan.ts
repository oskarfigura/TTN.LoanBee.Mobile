import { CurrencyCode } from '@/currency/currencies';

export type LoanCategory = 'mortgage' | 'loan';
export type LoanGroupStatus = 'draft' | 'tracked';
export type LoanDealStatus = 'draft' | 'active' | 'completed';
export type MortgageRepaymentType = 'repayment' | 'interestOnly';
export type MortgageEventType =
  | 'lumpOverpayment'
  | 'missedPayment'
  | 'paymentHoliday'
  | 'balanceCheckpoint'
  | 'note';

export interface LoanFormSnapshot {
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
}

export interface LoanResultSnapshot {
  monthlyPayments: number;
  totalAmountPaid: number;
  totalInterestPaid: number;
  totalInterestPaidBaseline: number;
  termInYears: number;
  termInMonths: number;
  totalTermInMonths: number;
}

export interface LoanDealCompletion {
  completedAt: string;
  closingBalance: number;
  feesAdded: number;
  notes?: string;
}

export interface LoanDeal {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  lender?: string;
  status: LoanDealStatus;
  startDate: string;
  endDate: string;
  openingBalance: number;
  interestRate: number;
  repaymentType: MortgageRepaymentType;
  monthlyPayment: number;
  regularOverpayment: number;
  additionalBorrowing?: number;
  remainingTermInYears: number;
  remainingTermInMonths: number;
  completion?: LoanDealCompletion;
}

export interface MortgageEvent {
  id: string;
  createdAt: string;
  updatedAt: string;
  dealId: string;
  type: MortgageEventType;
  date: string;
  amount?: number;
  balance?: number;
  note?: string;
}

export interface LoanGroup {
  id: string;
  createdAt: string;
  updatedAt: string;
  nickname: string;
  lender?: string;
  category: LoanCategory;
  currency: CurrencyCode;
  mortgageTermInMonths?: number;
  parentLoanId?: string;
  status: LoanGroupStatus;
  pinnedToDashboard: boolean;
  dashboardOrder?: number;
  deals: LoanDeal[];
  events: MortgageEvent[];
  formSnapshot: LoanFormSnapshot;
  resultSnapshot: LoanResultSnapshot;
}

export type SavedLoan = LoanGroup;

export type LegacySavedLoan = Omit<
  LoanGroup,
  'status' | 'pinnedToDashboard' | 'dashboardOrder' | 'deals' | 'events'
>;
