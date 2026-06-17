import { CurrencyCode } from '@/shared/domain/currency/currencies';
import { storage } from '@/shared/lib/storage/mmkv';
import { STORAGE_KEYS } from '@/shared/lib/storage/keys';
import { createLocalId } from '@/shared/lib/utils/id';
import type { LoanResult } from './loanResultRoute';

export interface DraftResultSession<FormValues = Record<string, unknown>> {
  id: string;
  result: LoanResult;
  formValues: FormValues;
  currency: CurrencyCode;
  createdAt: number;
}

const MAX_STORED_DRAFT_SESSIONS = 8;
const draftSessions = new Map<string, DraftResultSession>();

const readStoredSessions = (): DraftResultSession[] => {
  try {
    const raw = storage.getString(STORAGE_KEYS.DRAFT_RESULTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as DraftResultSession[] : [];
  } catch {
    return [];
  }
};

const writeStoredSessions = (sessions: DraftResultSession[]) => {
  try {
    const recentSessions = [...sessions]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_STORED_DRAFT_SESSIONS);
    storage.set(STORAGE_KEYS.DRAFT_RESULTS, JSON.stringify(recentSessions));
  } catch {
    // Draft recovery is a convenience; calculation and saved-loan flows still work
    // if local persistence is unavailable.
  }
};

const persistSession = (session: DraftResultSession) => {
  const sessionsById = new Map(readStoredSessions().map(item => [item.id, item]));
  sessionsById.set(session.id, session);
  writeStoredSessions([...sessionsById.values()]);
};

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
  persistSession(session as DraftResultSession);
  return session;
};

export const getDraftResultSession = <FormValues = Record<string, unknown>>(
  id?: string,
): DraftResultSession<FormValues> | null => {
  if (!id) return null;
  const memorySession = draftSessions.get(id) as DraftResultSession<FormValues> | undefined;
  if (memorySession) return memorySession;

  const storedSession = readStoredSessions().find(session => session.id === id) as DraftResultSession<FormValues> | undefined;
  if (storedSession) {
    draftSessions.set(id, storedSession as DraftResultSession);
  }

  return storedSession ?? null;
};
