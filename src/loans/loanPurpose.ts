import type { LoanGroup, LoanPurpose } from '@/types/SavedLoan';

export const DEFAULT_LOAN_PURPOSE: LoanPurpose = 'personal';

export const LOAN_PURPOSES: LoanPurpose[] = [
  'personal',
  'car',
  'bike',
  'motorbike',
  'homeImprovement',
  'education',
  'other',
];

export const isLoanPurpose = (value: unknown): value is LoanPurpose => (
  typeof value === 'string' && LOAN_PURPOSES.includes(value as LoanPurpose)
);

export const normaliseLoanPurpose = (value: unknown): LoanPurpose => (
  isLoanPurpose(value) ? value : DEFAULT_LOAN_PURPOSE
);

export const getLoanPurpose = (
  loan: Pick<LoanGroup, 'category' | 'loanPurpose'>,
): LoanPurpose | undefined => (
  loan.category === 'loan' ? normaliseLoanPurpose(loan.loanPurpose) : undefined
);
