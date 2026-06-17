import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  BACKUP_APP_ID,
  BACKUP_TYPE,
  buildSavedLoansBackup,
  DataTransferError,
  importSavedLoansBackup,
  parseSavedLoansBackup,
} from '@/shared/lib/storage/dataTransfer';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';
import { LOAN_GROUP_SCHEMA_VERSION, SavedLoan } from '@/shared/domain/types/SavedLoan';
import { storage } from '@/shared/lib/storage/mmkv';

const makeLoan = (overrides: Partial<SavedLoan> = {}): SavedLoan => ({
  id: 'loan-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  nickname: 'My Mortgage',
  category: 'mortgage',
  currency: 'GBP',
  status: 'tracked',
  pinnedToDashboard: false,
  deals: [
    {
      id: 'deal-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      name: 'Initial deal',
      status: 'active',
      startDate: '2024-01-01',
      endDate: '2034-01-01',
      openingBalance: 270000,
      interestRate: 3,
      repaymentType: 'repayment',
      monthlyPayment: 2607,
      regularOverpayment: 0,
      remainingTermInYears: 10,
      remainingTermInMonths: 0,
    },
  ],
  events: [],
  formSnapshot: {
    loanAmount: 300000,
    interest: 3,
    termInYears: 10,
    termInMonths: 0,
    downPayment: 10,
    downPaymentType: 'PERCENT',
    desiredMonthlyPayment: null,
    additionalMonthlyPayment: null,
    startDate: '2024-01-01',
    calculationType: 'TERM',
    currency: 'GBP',
  },
  resultSnapshot: {
    monthlyPayments: 2607,
    totalAmountPaid: 342842,
    totalInterestPaid: 42842,
    totalInterestPaidBaseline: 42842,
    termInYears: 10,
    termInMonths: 0,
    totalTermInMonths: 120,
  },
  ...overrides,
});

beforeEach(() => {
  (storage as unknown as { clearAll: () => void }).clearAll();
});

describe('buildSavedLoansBackup', () => {
  it('wraps the current saved loans in a typed, dated envelope', () => {
    savedLoansStorage.add(makeLoan());

    const backup = JSON.parse(buildSavedLoansBackup(new Date('2026-05-31T10:00:00.000Z')));

    expect(backup.app).toBe(BACKUP_APP_ID);
    expect(backup.type).toBe(BACKUP_TYPE);
    expect(backup.schemaVersion).toBe(LOAN_GROUP_SCHEMA_VERSION);
    expect(backup.exportedAt).toBe('2026-05-31T10:00:00.000Z');
    expect(backup.loans).toHaveLength(1);
    expect(backup.loans[0].id).toBe('loan-1');
  });
});

describe('parseSavedLoansBackup', () => {
  it('accepts the backup envelope', () => {
    const raw = buildSavedLoansBackupWith([makeLoan()]);
    expect(parseSavedLoansBackup(raw)).toHaveLength(1);
  });

  it('accepts a bare array of loans', () => {
    expect(parseSavedLoansBackup(JSON.stringify([makeLoan()]))).toHaveLength(1);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseSavedLoansBackup('not json')).toThrow(DataTransferError);
    expect(() => parseSavedLoansBackup('not json')).toThrow('invalidJson');
  });

  it('rejects an empty backup', () => {
    expect(() => parseSavedLoansBackup(JSON.stringify({ loans: [] }))).toThrow('empty');
  });

  it('rejects a payload that is not loan-shaped', () => {
    expect(() => parseSavedLoansBackup(JSON.stringify({ loans: [{ id: 'x' }] }))).toThrow('invalidShape');
    expect(() => parseSavedLoansBackup(JSON.stringify({ foo: 1 }))).toThrow('invalidShape');
  });
});

describe('importSavedLoansBackup', () => {
  it('round-trips: export, clear, import restores the saved loans', () => {
    savedLoansStorage.add(makeLoan({ id: 'a' }));
    savedLoansStorage.add(makeLoan({ id: 'b' }));
    const backup = buildSavedLoansBackup();

    savedLoansStorage.clear();
    expect(savedLoansStorage.getAll()).toHaveLength(0);

    const imported = importSavedLoansBackup(backup);
    expect(imported).toHaveLength(2);
    expect(savedLoansStorage.getAll().map(l => l.id).sort()).toEqual(['a', 'b']);
  });
});

const buildSavedLoansBackupWith = (loans: SavedLoan[]): string =>
  JSON.stringify({
    app: BACKUP_APP_ID,
    type: BACKUP_TYPE,
    schemaVersion: LOAN_GROUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    loans,
  });
