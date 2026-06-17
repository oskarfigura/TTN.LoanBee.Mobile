import type { CurrencyCode } from '@/shared/domain/currency/currencies';
import type { LoanCalculatorFormValues } from '@/shared/lib/hooks/useLoanCalculatorForm';
import { buildResultSnapshot } from '@/shared/domain/loans/loanGroupFactory';
import type { LoanResultSnapshot, LoanCategory } from '@/shared/domain/types/SavedLoan';
import { createLocalId } from '@/shared/lib/utils/id';
import { storage } from './mmkv';
import { STORAGE_KEYS } from './keys';

export interface RecentCalculation {
  id: string;
  createdAt: string;
  updatedAt: string;
  category?: LoanCategory;
  currency: CurrencyCode;
  formValues: LoanCalculatorFormValues;
  resultSnapshot: LoanResultSnapshot;
  sourceLabel?: string;
}

type RawResultValues = {
  monthlyPayments: number;
  totalAmountPaid: number;
  totalInterestPaid: number;
  termInYears: number;
  termInMonths: number;
  tableItems: unknown[];
};

const MAX_RECENT_CALCULATIONS = 12;

const readAll = (): RecentCalculation[] => {
  const raw = storage.getString(STORAGE_KEYS.RECENT_CALCULATIONS);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => (
      typeof item?.id === 'string'
      && typeof item?.createdAt === 'string'
      && typeof item?.updatedAt === 'string'
      && (item?.category === undefined || item?.category === 'mortgage' || item?.category === 'loan')
      && typeof item?.currency === 'string'
      && item?.formValues
      && item?.resultSnapshot
    )) as RecentCalculation[];
  } catch {
    return [];
  }
};

const writeAll = (items: RecentCalculation[]): void => {
  const ordered = [...items]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, MAX_RECENT_CALCULATIONS);
  storage.set(STORAGE_KEYS.RECENT_CALCULATIONS, JSON.stringify(ordered));
};

export const recentCalculationsStorage = {
  getAll(): RecentCalculation[] {
    return readAll();
  },

  getById(id: string): RecentCalculation | undefined {
    return readAll().find(item => item.id === id);
  },

  addFromResult({
    result,
    formValues,
    currency,
    category,
    sourceLabel,
  }: {
    result: RawResultValues;
    formValues: LoanCalculatorFormValues;
    currency: CurrencyCode;
    category?: LoanCategory;
    sourceLabel?: string;
  }): RecentCalculation {
    const now = new Date().toISOString();
    const item: RecentCalculation = {
      id: createLocalId('recent'),
      createdAt: now,
      updatedAt: now,
      ...(category ? { category } : {}),
      currency,
      formValues,
      // A recent calc has no overpayment baseline to compare against, so the
      // baseline mirrors the actual total (savings badges never show for recents).
      resultSnapshot: buildResultSnapshot(result, result.totalInterestPaid),
      sourceLabel,
    };
    writeAll([item, ...readAll()]);
    return item;
  },

  remove(id: string): void {
    writeAll(readAll().filter(item => item.id !== id));
  },

  clear(): void {
    storage.remove(STORAGE_KEYS.RECENT_CALCULATIONS);
  },
};
