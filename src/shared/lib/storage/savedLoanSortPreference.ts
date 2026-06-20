import {
  SAVED_LOAN_SORT_OPTIONS,
  SavedLoanSortOption,
} from '@/shared/domain/loans/savedLoanSort';
import { STORAGE_KEYS } from './keys';
import { storage } from './mmkv';

const DEFAULT_SORT: SavedLoanSortOption = 'recentlyAdded';

const isSavedLoanSortOption = (value: string | undefined): value is SavedLoanSortOption => (
  SAVED_LOAN_SORT_OPTIONS.includes(value as SavedLoanSortOption)
);

export const savedLoanSortPreference = {
  get(): SavedLoanSortOption {
    const stored = storage.getString(STORAGE_KEYS.SAVED_LOANS_SORT);
    return isSavedLoanSortOption(stored) ? stored : DEFAULT_SORT;
  },

  set(option: SavedLoanSortOption): void {
    storage.set(STORAGE_KEYS.SAVED_LOANS_SORT, option);
  },
};
