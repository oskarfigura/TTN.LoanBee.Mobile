import { storage } from './mmkv';
import { STORAGE_KEYS } from './keys';
import { upsertMortgageEvent } from '@/mortgage/events';
import { generateDefaultDealName } from '@/mortgage/tracker';
import {
  LegacySavedLoan,
  LOAN_GROUP_SCHEMA_VERSION,
  LoanDeal,
  LoanGroup,
  MortgageEvent,
  SavedLoan,
} from '@/types/SavedLoan';
import { getEffectiveLoanAmount } from '@/utils/paymentValidation';

export class SavedLoanStorageError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'SavedLoanStorageError';
  }
}

type StorageErrorListener = (error: SavedLoanStorageError) => void;
const errorListeners: StorageErrorListener[] = [];

export const onSavedLoanStorageError = (listener: StorageErrorListener): (() => void) => {
  errorListeners.push(listener);
  return () => {
    const idx = errorListeners.indexOf(listener);
    if (idx >= 0) errorListeners.splice(idx, 1);
  };
};

const reportStorageError = (error: SavedLoanStorageError): void => {
  // eslint-disable-next-line no-console
  console.error('[savedLoansStorage]', error.message, error.cause ?? '');
  errorListeners.forEach(listener => {
    try { listener(error); } catch { /* swallow — listener errors must not break storage */ }
  });
};

const parseJsonArray = <T,>(raw?: string, source = 'SAVED_LOANS'): T[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as T[];
    reportStorageError(new SavedLoanStorageError(
      `Stored ${source} payload is not an array; treating as empty`,
    ));
    return [];
  } catch (cause) {
    reportStorageError(new SavedLoanStorageError(
      `Failed to parse stored ${source} payload; treating as empty`,
      cause,
    ));
    return [];
  }
};

const addMonths = (dateString: string, months: number): string => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
};

const getEffectiveOpeningBalance = (loan: LegacySavedLoan): number => (
  getEffectiveLoanAmount(loan.formSnapshot.loanAmount, loan.formSnapshot.downPayment, loan.formSnapshot.downPaymentType)
);

const buildMigratedDeal = (loan: LegacySavedLoan): LoanDeal => {
  const now = loan.updatedAt || loan.createdAt || new Date().toISOString();
  const totalMonths = loan.resultSnapshot.totalTermInMonths
    || (loan.formSnapshot.termInYears * 12) + loan.formSnapshot.termInMonths
    || 12;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return {
    id: `${loan.id}-deal-1`,
    createdAt: loan.createdAt,
    updatedAt: now,
    name: loan.category === 'mortgage'
      ? generateDefaultDealName(years, months, 'repayment')
      : 'Fixed loan',
    lender: loan.lender,
    status: 'active',
    startDate: loan.formSnapshot.startDate,
    endDate: addMonths(loan.formSnapshot.startDate, totalMonths),
    openingBalance: getEffectiveOpeningBalance(loan),
    interestRate: loan.formSnapshot.interest,
    repaymentType: 'repayment',
    monthlyPayment: loan.resultSnapshot.monthlyPayments,
    regularOverpayment: loan.formSnapshot.additionalMonthlyPayment ?? 0,
    remainingTermInYears: loan.formSnapshot.termInYears,
    remainingTermInMonths: loan.formSnapshot.termInMonths,
    source: loan.category === 'mortgage' ? 'estimate' : undefined,
  };
};

const getMortgageTermInMonths = (loan: Pick<LoanGroup, 'formSnapshot' | 'resultSnapshot'>): number => (
  loan.resultSnapshot.totalTermInMonths
  || (loan.formSnapshot.termInYears * 12) + loan.formSnapshot.termInMonths
  || 12
);

export const migrateLegacySavedLoan = (loan: LegacySavedLoan): LoanGroup => ({
  ...loan,
  schemaVersion: LOAN_GROUP_SCHEMA_VERSION,
  status: 'tracked',
  pinnedToDashboard: false,
  mortgageTermInMonths: getMortgageTermInMonths(loan),
  deals: [buildMigratedDeal(loan)],
  events: [],
});

const isLoanGroup = (loan: Partial<LoanGroup>): loan is LoanGroup => (
  typeof loan.status === 'string'
  && typeof loan.pinnedToDashboard === 'boolean'
  && Array.isArray(loan.deals)
  && Array.isArray(loan.events)
);

const normaliseLoanGroup = (loan: LoanGroup): LoanGroup => {
  const needsTerm = !loan.mortgageTermInMonths;
  const needsVersion = loan.schemaVersion !== LOAN_GROUP_SCHEMA_VERSION;
  if (!needsTerm && !needsVersion) return loan;

  return {
    ...loan,
    mortgageTermInMonths: needsTerm ? getMortgageTermInMonths(loan) : loan.mortgageTermInMonths,
    schemaVersion: LOAN_GROUP_SCHEMA_VERSION,
  };
};

const saveAll = (loans: LoanGroup[]): void => {
  try {
    const stamped = loans.map(loan => (
      loan.schemaVersion === LOAN_GROUP_SCHEMA_VERSION
        ? loan
        : { ...loan, schemaVersion: LOAN_GROUP_SCHEMA_VERSION }
    ));
    storage.set(STORAGE_KEYS.SAVED_LOANS, JSON.stringify(stamped));
  } catch (cause) {
    const error = new SavedLoanStorageError('Failed to persist saved loans', cause);
    reportStorageError(error);
    throw error;
  }
};

const loadAll = (): LoanGroup[] => {
  const currentRaw = storage.getString(STORAGE_KEYS.SAVED_LOANS);
  const current = parseJsonArray<Partial<LoanGroup>>(currentRaw, 'SAVED_LOANS');
  if (currentRaw !== undefined) {
    const normalised = current.map(loan => (
      isLoanGroup(loan)
        ? normaliseLoanGroup(loan)
        : migrateLegacySavedLoan(loan as LegacySavedLoan)
    ));
    if (normalised.some((loan, index) => loan !== current[index])) {
      try { saveAll(normalised); }
      catch { /* the in-memory result is still usable; the throw was already reported */ }
    }
    return normalised;
  }

  const legacy = parseJsonArray<LegacySavedLoan>(
    storage.getString(STORAGE_KEYS.SAVED_LOANS_LEGACY),
    'SAVED_LOANS_LEGACY',
  );
  if (legacy.length === 0) return [];

  const migrated = legacy.map(migrateLegacySavedLoan);
  try {
    saveAll(migrated);
    storage.remove(STORAGE_KEYS.SAVED_LOANS_LEGACY);
  } catch { /* migration failed to persist; return in-memory copy this session */ }
  return migrated;
};

export const savedLoansStorage = {
  getAll(): LoanGroup[] {
    return loadAll();
  },

  getById(id: string): LoanGroup | undefined {
    return loadAll().find(l => l.id === id);
  },

  add(loan: SavedLoan): void {
    const loans = loadAll();
    loans.unshift({ ...loan, schemaVersion: LOAN_GROUP_SCHEMA_VERSION });
    saveAll(loans);
  },

  update(loan: SavedLoan): void {
    const loans = loadAll();
    const idx = loans.findIndex(l => l.id === loan.id);
    if (idx !== -1) {
      loans[idx] = { ...loan, schemaVersion: LOAN_GROUP_SCHEMA_VERSION, updatedAt: new Date().toISOString() };
      saveAll(loans);
    }
  },

  remove(id: string): void {
    saveAll(loadAll().filter(l => l.id !== id));
  },

  togglePinned(id: string): void {
    const loans = loadAll();
    const idx = loans.findIndex(l => l.id === id);
    if (idx === -1) return;

    const now = new Date().toISOString();
    const maxOrder = loans.reduce((max, loan) => Math.max(max, loan.dashboardOrder ?? 0), 0);
    const pinnedToDashboard = !loans[idx].pinnedToDashboard;
    loans[idx] = {
      ...loans[idx],
      pinnedToDashboard,
      dashboardOrder: pinnedToDashboard ? maxOrder + 1 : undefined,
      updatedAt: now,
    };
    saveAll(loans);
  },

  clear(): void {
    storage.remove(STORAGE_KEYS.SAVED_LOANS);
    storage.remove(STORAGE_KEYS.SAVED_LOANS_LEGACY);
  },

  getMaxDashboardOrder(): number {
    return loadAll().reduce((max, loan) => Math.max(max, loan.dashboardOrder ?? 0), 0);
  },

  addEvent(loanId: string, event: MortgageEvent): void {
    const loans = loadAll();
    const idx = loans.findIndex(l => l.id === loanId);
    if (idx === -1) return;
    loans[idx] = {
      ...upsertMortgageEvent(loans[idx], event),
      updatedAt: new Date().toISOString(),
    };
    saveAll(loans);
  },

  updateEvent(loanId: string, event: MortgageEvent): void {
    const loans = loadAll();
    const idx = loans.findIndex(l => l.id === loanId);
    if (idx === -1) return;
    loans[idx] = {
      ...upsertMortgageEvent(loans[idx], event),
      updatedAt: new Date().toISOString(),
    };
    saveAll(loans);
  },

  removeEvent(loanId: string, eventId: string): void {
    const loans = loadAll();
    const idx = loans.findIndex(l => l.id === loanId);
    if (idx === -1) return;
    loans[idx] = {
      ...loans[idx],
      events: loans[idx].events.filter(e => e.id !== eventId),
      updatedAt: new Date().toISOString(),
    };
    saveAll(loans);
  },
};
