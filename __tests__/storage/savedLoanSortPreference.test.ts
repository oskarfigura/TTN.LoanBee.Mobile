import { beforeEach, describe, expect, it } from '@jest/globals';
import { savedLoanSortPreference } from '@/shared/lib/storage/savedLoanSortPreference';
import { STORAGE_KEYS } from '@/shared/lib/storage/keys';
import { storage } from '@/shared/lib/storage/mmkv';

beforeEach(() => {
  storage.remove(STORAGE_KEYS.SAVED_LOANS_SORT);
});

describe('saved loan sort preference', () => {
  it('defaults to recently added', () => {
    expect(savedLoanSortPreference.get()).toBe('recentlyAdded');
  });

  it('persists a selected sort option', () => {
    savedLoanSortPreference.set('nameAscending');
    expect(savedLoanSortPreference.get()).toBe('nameAscending');
  });

  it('falls back safely when the stored value is unknown', () => {
    storage.set(STORAGE_KEYS.SAVED_LOANS_SORT, 'unexpected-sort');
    expect(savedLoanSortPreference.get()).toBe('recentlyAdded');
  });
});
