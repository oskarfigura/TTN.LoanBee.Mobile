import { CurrencyCode } from '@/currency/currencies';
import { createLocalId } from '@/utils/id';
import type { LoanResult } from './loanResultRoute';

export interface DraftResultSession<FormValues = Record<string, unknown>> {
  id: string;
  result: LoanResult;
  formValues: FormValues;
  currency: CurrencyCode;
  createdAt: number;
}

const draftSessions = new Map<string, DraftResultSession>();

export const createDraftResultSession = <FormValues,>(
  result: LoanResult,
  formValues: FormValues,
  currency: CurrencyCode,
): DraftResultSession<FormValues> => {
  const session: DraftResultSession<FormValues> = {
    id: createLocalId('draft'),
    result,
    formValues,
    currency,
    createdAt: Date.now(),
  };

  draftSessions.set(session.id, session as DraftResultSession);
  return session;
};

export const getDraftResultSession = <FormValues = Record<string, unknown>>(
  id?: string,
): DraftResultSession<FormValues> | null => {
  if (!id) return null;
  return (draftSessions.get(id) as DraftResultSession<FormValues> | undefined) ?? null;
};
