import { CurrencyCode } from '@/currency/currencies';

export type LoanCategory = 'mortgage' | 'loan';
export type LoanGroupStatus = 'draft' | 'tracked';
export type LoanDealStatus = 'draft' | 'active' | 'completed';
export type LoanDealSource = 'estimate' | 'userDeal';
export type MortgageRepaymentType = 'repayment' | 'interestOnly';
export type MortgageEventType =
  | 'lumpOverpayment'
  | 'missedPayment'
  | 'paymentHoliday'
  | 'balanceCheckpoint'
  | 'note';
export type MortgageVarianceReason =
  | 'missedPayment'
  | 'paymentHoliday'
  | 'unloggedOverpayment'
  | 'feeAdded'
  | 'rateOrPaymentChanged'
  | 'lenderTiming'
  | 'unknown';

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
  /** True when the deal was the final one — the mortgage was paid off in full. */
  terminal?: boolean;
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
  source?: LoanDealSource;
  completion?: LoanDealCompletion;
}

export interface MortgageEvent {
  id: string;
  createdAt: string;
  updatedAt: string;
  dealId?: string;
  type: MortgageEventType;
  date: string;
  amount?: number;
  balance?: number;
  projectedBalanceAtCheckpoint?: number;
  reconciliationVariance?: number;
  varianceReason?: MortgageVarianceReason;
  note?: string;
}

// Current schema version. Bump whenever the LoanGroup shape changes in a way
// that requires a migration step in src/storage/savedLoans.ts. Loans persisted
// without this field are treated as v1 and run through migrateLegacySavedLoan.
export const LOAN_GROUP_SCHEMA_VERSION = 2 as const;

export interface LoanGroup {
  schemaVersion?: typeof LOAN_GROUP_SCHEMA_VERSION;
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
