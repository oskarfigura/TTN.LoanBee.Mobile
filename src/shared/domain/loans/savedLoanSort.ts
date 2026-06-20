import { SavedLoan } from '@/shared/domain/types/SavedLoan';

export const SAVED_LOAN_SORT_OPTIONS = [
  'recentlyAdded',
  'oldestAdded',
  'recentlyUpdated',
  'nameAscending',
  'nameDescending',
] as const;

export type SavedLoanSortOption = typeof SAVED_LOAN_SORT_OPTIONS[number];

const timestamp = (value?: string): number => {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const displayName = (loan: SavedLoan): string => (
  loan.nickname?.trim() || loan.lender?.trim() || ''
);

export const sortSavedLoans = (
  loans: SavedLoan[],
  option: SavedLoanSortOption,
  locale?: string,
): SavedLoan[] => {
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });

  return loans
    .map((loan, index) => ({ loan, index }))
    .sort((a, b) => {
      let comparison = 0;

      switch (option) {
        case 'oldestAdded':
          comparison = timestamp(a.loan.createdAt) - timestamp(b.loan.createdAt);
          break;
        case 'recentlyUpdated':
          comparison = timestamp(b.loan.updatedAt) - timestamp(a.loan.updatedAt);
          break;
        case 'nameAscending':
          comparison = collator.compare(displayName(a.loan), displayName(b.loan));
          break;
        case 'nameDescending':
          comparison = collator.compare(displayName(b.loan), displayName(a.loan));
          break;
        case 'recentlyAdded':
        default:
          comparison = timestamp(b.loan.createdAt) - timestamp(a.loan.createdAt);
          break;
      }

      return comparison || a.index - b.index;
    })
    .map(({ loan }) => loan);
};
