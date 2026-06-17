import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { OverpaymentsView } from '@/features/tracker/components/overpayments/OverpaymentsView';
import { createDealOverpaymentScope } from '@/shared/domain/loans/overpaymentScope';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';

export default function DealOverpaymentsScreen() {
  const { id, dealId } = useLocalSearchParams<{ id: string; dealId: string }>();
  const createScope = useCallback((loan: SavedLoan) => {
    const deal = loan.deals.find(d => d.id === dealId);
    return deal ? createDealOverpaymentScope(loan, deal) : null;
  }, [dealId]);

  return (
    <OverpaymentsView id={id} notFoundTitleKey="mortgage.dealOverpaymentsTitle" createScope={createScope} />
  );
}
