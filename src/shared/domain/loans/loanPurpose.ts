import type { LoanGroup, LoanPurpose } from '@/shared/domain/types/SavedLoan';

export const DEFAULT_LOAN_PURPOSE: LoanPurpose = 'personal';

export const LOAN_PURPOSES: LoanPurpose[] = [
  'bike',
  'boat',
  'business',
  'car',
  'crypto',
  'debtConsolidation',
  'education',
  'electronics',
  'furniture',
  'gaming',
  'jewellery',
  'medical',
  'motorbike',
  'moving',
  'personal',
  'pet',
  'homeImprovement',
  'shopping',
  'stocks',
  'travel',
  'truck',
  'wedding',
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
