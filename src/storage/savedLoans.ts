import { storage } from './mmkv';
import { STORAGE_KEYS } from './keys';
import {
  LegacySavedLoan,
  LoanDeal,
  LoanGroup,
  SavedLoan,
} from '@/types/SavedLoan';

const parseJsonArray = <T,>(raw?: string): T[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
};

const addMonths = (dateString: string, months: number): string => {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
};

const getEffectiveOpeningBalance = (loan: LegacySavedLoan): number => {
  const form = loan.formSnapshot;
  const downPayment = form.downPaymentType === 'PERCENT'
    ? (form.downPayment / 100) * form.loanAmount
    : form.downPayment;

  return Math.max(0, form.loanAmount - downPayment);
};

const buildMigratedDeal = (loan: LegacySavedLoan): LoanDeal => {
  const now = loan.updatedAt || loan.createdAt || new Date().toISOString();
  const totalMonths = loan.resultSnapshot.totalTermInMonths
    || (loan.formSnapshot.termInYears * 12) + loan.formSnapshot.termInMonths
    || 12;

  return {
    id: `${loan.id}-deal-1`,
    createdAt: loan.createdAt,
    updatedAt: now,
    name: loan.category === 'mortgage' ? 'Initial deal' : 'Fixed loan',
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
  };
};

const getMortgageTermInMonths = (loan: Pick<LoanGroup, 'formSnapshot' | 'resultSnapshot'>): number => (
  loan.resultSnapshot.totalTermInMonths
  || (loan.formSnapshot.termInYears * 12) + loan.formSnapshot.termInMonths
  || 12
);

export const migrateLegacySavedLoan = (loan: LegacySavedLoan): LoanGroup => ({
  ...loan,
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

const normaliseLoanGroup = (loan: LoanGroup): LoanGroup => (
  loan.mortgageTermInMonths
    ? loan
    : {
      ...loan,
      mortgageTermInMonths: getMortgageTermInMonths(loan),
    }
);

const saveAll = (loans: LoanGroup[]): void => {
  storage.set(STORAGE_KEYS.SAVED_LOANS, JSON.stringify(loans));
};

const loadAll = (): LoanGroup[] => {
  const currentRaw = storage.getString(STORAGE_KEYS.SAVED_LOANS);
  const current = parseJsonArray<Partial<LoanGroup>>(currentRaw);
  if (currentRaw !== undefined) {
    const normalised = current.map(loan => (
      isLoanGroup(loan)
        ? normaliseLoanGroup(loan)
        : migrateLegacySavedLoan(loan as LegacySavedLoan)
    ));
    if (normalised.some((loan, index) => loan !== current[index])) {
      saveAll(normalised);
    }
    return normalised;
  }

  const legacy = parseJsonArray<LegacySavedLoan>(storage.getString(STORAGE_KEYS.SAVED_LOANS_LEGACY));
  if (legacy.length === 0) return [];

  const migrated = legacy.map(migrateLegacySavedLoan);
  saveAll(migrated);
  storage.remove(STORAGE_KEYS.SAVED_LOANS_LEGACY);
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
};
