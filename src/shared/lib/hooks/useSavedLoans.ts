import { useState, useCallback } from 'react';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';

export const useSavedLoans = () => {
  const [loans, setLoans] = useState<SavedLoan[]>(() => savedLoansStorage.getAll());

  const refresh = useCallback(() => {
    setLoans(savedLoansStorage.getAll());
  }, []);

  const add = useCallback((loan: SavedLoan) => {
    savedLoansStorage.add(loan);
    refresh();
  }, [refresh]);

  const update = useCallback((loan: SavedLoan) => {
    savedLoansStorage.update(loan);
    refresh();
  }, [refresh]);

  const remove = useCallback((id: string) => {
    savedLoansStorage.remove(id);
    refresh();
  }, [refresh]);

  const togglePinned = useCallback((id: string) => {
    savedLoansStorage.togglePinned(id);
    refresh();
  }, [refresh]);

  return { loans, add, update, remove, togglePinned, refresh };
};
