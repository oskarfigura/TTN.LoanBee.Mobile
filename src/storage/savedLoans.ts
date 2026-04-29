import { storage } from './mmkv';
import { STORAGE_KEYS } from './keys';
import { SavedLoan } from '@/types/SavedLoan';

const loadAll = (): SavedLoan[] => {
  const raw = storage.getString(STORAGE_KEYS.SAVED_LOANS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedLoan[];
  } catch {
    return [];
  }
};

const saveAll = (loans: SavedLoan[]): void => {
  storage.set(STORAGE_KEYS.SAVED_LOANS, JSON.stringify(loans));
};

export const savedLoansStorage = {
  getAll(): SavedLoan[] {
    return loadAll();
  },

  getById(id: string): SavedLoan | undefined {
    return loadAll().find(l => l.id === id);
  },

  add(loan: SavedLoan): void {
    const loans = loadAll();
    loans.unshift(loan);
    saveAll(loans);
  },

  update(loan: SavedLoan): void {
    const loans = loadAll();
    const idx = loans.findIndex(l => l.id === loan.id);
    if (idx !== -1) {
      loans[idx] = { ...loan, updatedAt: new Date().toISOString() };
      saveAll(loans);
    }
  },

  remove(id: string): void {
    saveAll(loadAll().filter(l => l.id !== id));
  },

  clear(): void {
    storage.delete(STORAGE_KEYS.SAVED_LOANS);
  },
};
