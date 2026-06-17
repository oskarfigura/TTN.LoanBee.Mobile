import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { OverpaymentsView } from '@/features/tracker/components/overpayments/OverpaymentsView';
import { createLoanOverpaymentScope } from '@/shared/domain/loans/overpaymentScope';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';

export default function OverpaymentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const createScope = useCallback((loan: SavedLoan) => createLoanOverpaymentScope(loan), []);

  return (
    <OverpaymentsView id={id} notFoundTitleKey="overpayments.title" createScope={createScope} />
  );
}
