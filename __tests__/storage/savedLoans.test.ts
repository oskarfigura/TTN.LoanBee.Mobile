import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  onSavedLoanStorageError,
  SavedLoanStorageError,
  savedLoansStorage,
} from '@/shared/lib/storage/savedLoans';
import {
  LegacySavedLoan,
  LOAN_GROUP_SCHEMA_VERSION,
  MortgageEvent,
  SavedLoan,
} from '@/shared/domain/types/SavedLoan';
import { storage } from '@/shared/lib/storage/mmkv';
import { STORAGE_KEYS } from '@/shared/lib/storage/keys';
import { InvalidMortgageEventError } from '@/shared/domain/mortgage/events';
import { DEFAULT_LOAN_PURPOSE } from '@/shared/domain/loans/loanPurpose';

const makeLoan = (overrides: Partial<SavedLoan> = {}): SavedLoan => ({
  id: 'test-id-1',
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

const makeEvent = (overrides: Partial<MortgageEvent> = {}): MortgageEvent => ({
  id: 'event-1',
  createdAt: '2024-02-01T00:00:00.000Z',
  updatedAt: '2024-02-01T00:00:00.000Z',
  dealId: 'deal-1',
  type: 'lumpOverpayment',
  date: '2024-02-01',
  amount: 5000,
  ...overrides,
});

beforeEach(() => {
  savedLoansStorage.clear();
});

describe('savedLoansStorage', () => {
  it('returns empty array when no loans saved', () => {
    expect(savedLoansStorage.getAll()).toEqual([]);
  });

  it('adds a loan and retrieves it', () => {
    const loan = makeLoan();
    savedLoansStorage.add(loan);
    expect(savedLoansStorage.getAll()).toHaveLength(1);
    expect(savedLoansStorage.getAll()[0].id).toBe('test-id-1');
  });

  it('retrieves loan by id', () => {
    const loan = makeLoan();
    savedLoansStorage.add(loan);
    expect(savedLoansStorage.getById('test-id-1')).toBeDefined();
    expect(savedLoansStorage.getById('nonexistent')).toBeUndefined();
  });

  it('preserves free-text lender names', () => {
    savedLoansStorage.add(makeLoan({ lender: 'Small Local Building Society' }));
    expect(savedLoansStorage.getById('test-id-1')?.lender).toBe('Small Local Building Society');
  });

  it('updates an existing loan', () => {
    const loan = makeLoan();
    savedLoansStorage.add(loan);
    savedLoansStorage.update({ ...loan, nickname: 'Updated Name' });
    expect(savedLoansStorage.getById('test-id-1')?.nickname).toBe('Updated Name');
  });

  it('removes a loan by id', () => {
    savedLoansStorage.add(makeLoan({ id: 'a' }));
    savedLoansStorage.add(makeLoan({ id: 'b' }));
    savedLoansStorage.remove('a');
    const all = savedLoansStorage.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('b');
  });

  it('new loans are prepended (most recent first)', () => {
    savedLoansStorage.add(makeLoan({ id: 'first' }));
    savedLoansStorage.add(makeLoan({ id: 'second' }));
    expect(savedLoansStorage.getAll()[0].id).toBe('second');
  });

  it('clears all loans', () => {
    savedLoansStorage.add(makeLoan());
    savedLoansStorage.clear();
    expect(savedLoansStorage.getAll()).toHaveLength(0);
  });

  it('toggles dashboard pin state and assigns dashboard order', () => {
    const originalUpdatedAt = '2024-03-04T12:00:00.000Z';
    savedLoansStorage.add(makeLoan({ updatedAt: originalUpdatedAt }));
    savedLoansStorage.togglePinned('test-id-1');

    const pinned = savedLoansStorage.getById('test-id-1');
    expect(pinned?.pinnedToDashboard).toBe(true);
    expect(pinned?.dashboardOrder).toBe(1);
    expect(pinned?.updatedAt).toBe(originalUpdatedAt);

    savedLoansStorage.togglePinned('test-id-1');
    expect(savedLoansStorage.getById('test-id-1')?.pinnedToDashboard).toBe(false);
    expect(savedLoansStorage.getById('test-id-1')?.updatedAt).toBe(originalUpdatedAt);
  });

  it('returns the highest dashboard order across pinned loans', () => {
    savedLoansStorage.add(makeLoan({ id: 'first', pinnedToDashboard: true, dashboardOrder: 2 }));
    savedLoansStorage.add(makeLoan({ id: 'second', pinnedToDashboard: true, dashboardOrder: 5 }));
    savedLoansStorage.add(makeLoan({ id: 'third', pinnedToDashboard: false }));

    expect(savedLoansStorage.getMaxDashboardOrder()).toBe(5);
  });

  it('adds, updates, and removes mortgage events for a loan', () => {
    savedLoansStorage.add(makeLoan());

    const originalEvent = makeEvent();
    savedLoansStorage.addEvent('test-id-1', originalEvent);
    expect(savedLoansStorage.getById('test-id-1')?.events).toEqual([originalEvent]);

    const updatedEvent = makeEvent({
      amount: 7500,
      note: 'Confirmed with lender',
      updatedAt: '2024-02-02T00:00:00.000Z',
    });
    savedLoansStorage.updateEvent('test-id-1', updatedEvent);
    expect(savedLoansStorage.getById('test-id-1')?.events).toEqual([updatedEvent]);

    savedLoansStorage.removeEvent('test-id-1', updatedEvent.id);
    expect(savedLoansStorage.getById('test-id-1')?.events).toEqual([]);
  });

  it('migrates legacy v1 loans into loan groups with one active deal', () => {
    const legacyLoan = makeLoan() as unknown as LegacySavedLoan;
    const { status, pinnedToDashboard, deals, events, ...v1Loan } = legacyLoan as LegacySavedLoan & SavedLoan;
    void status;
    void pinnedToDashboard;
    void deals;
    void events;

    storage.set(STORAGE_KEYS.SAVED_LOANS_LEGACY, JSON.stringify([v1Loan]));

    const migrated = savedLoansStorage.getAll();
    expect(migrated).toHaveLength(1);
    expect(migrated[0].status).toBe('tracked');
    expect(migrated[0].pinnedToDashboard).toBe(false);
    expect(migrated[0].mortgageTermInMonths).toBe(120);
    expect(migrated[0].deals).toHaveLength(1);
    expect(migrated[0].deals[0].openingBalance).toBe(270000);
  });

  it('picks up legacy loans written after an initial empty read (cache invariant)', () => {
    // Prime the read cache with the empty result first...
    expect(savedLoansStorage.getAll()).toEqual([]);

    const legacyLoan = makeLoan() as unknown as LegacySavedLoan;
    const { status, pinnedToDashboard, deals, events, ...v1Loan } = legacyLoan as LegacySavedLoan & SavedLoan;
    void status;
    void pinnedToDashboard;
    void deals;
    void events;
    storage.set(STORAGE_KEYS.SAVED_LOANS_LEGACY, JSON.stringify([v1Loan]));

    // ...then ensure the cache does not mask the newly available legacy payload.
    expect(savedLoansStorage.getAll()).toHaveLength(1);
  });

  it('backfills mortgage term on existing loan groups', () => {
    const loan = makeLoan();
    const { mortgageTermInMonths, ...withoutMortgageTerm } = loan;
    void mortgageTermInMonths;

    storage.set(STORAGE_KEYS.SAVED_LOANS, JSON.stringify([withoutMortgageTerm]));

    expect(savedLoansStorage.getAll()[0].mortgageTermInMonths).toBe(120);
  });

  it('backfills loan purpose on existing tracked loans', () => {
    const loan = makeLoan({ category: 'loan' });
    const { loanPurpose, ...withoutPurpose } = loan;
    void loanPurpose;

    storage.set(STORAGE_KEYS.SAVED_LOANS, JSON.stringify([withoutPurpose]));

    const restored = savedLoansStorage.getAll()[0];
    expect(restored.loanPurpose).toBe(DEFAULT_LOAN_PURPOSE);

    const raw = storage.getString(STORAGE_KEYS.SAVED_LOANS) ?? '';
    expect(JSON.parse(raw)[0].loanPurpose).toBe(DEFAULT_LOAN_PURPOSE);
  });

  it('stamps schemaVersion on add() so future migrations have a discriminator', () => {
    savedLoansStorage.add(makeLoan());
    const raw = storage.getString(STORAGE_KEYS.SAVED_LOANS) ?? '';
    const parsed = JSON.parse(raw);
    expect(parsed[0].schemaVersion).toBe(LOAN_GROUP_SCHEMA_VERSION);
  });

  it('backfills schemaVersion on loans persisted without one', () => {
    const loan = makeLoan();
    storage.set(STORAGE_KEYS.SAVED_LOANS, JSON.stringify([loan]));
    savedLoansStorage.getAll();
    const raw = storage.getString(STORAGE_KEYS.SAVED_LOANS) ?? '';
    expect(JSON.parse(raw)[0].schemaVersion).toBe(LOAN_GROUP_SCHEMA_VERSION);
  });

  it('reports corruption via onSavedLoanStorageError instead of silently wiping', () => {
    const listener = jest.fn();
    const unsubscribe = onSavedLoanStorageError(listener);
    const consoleErr = jest.spyOn(console, 'error').mockImplementation(() => {});

    storage.set(STORAGE_KEYS.SAVED_LOANS, '{not valid json');

    const result = savedLoansStorage.getAll();
    expect(result).toEqual([]);
    expect(listener).toHaveBeenCalled();
    const reported = listener.mock.calls[0][0] as SavedLoanStorageError;
    expect(reported).toBeInstanceOf(SavedLoanStorageError);

    unsubscribe();
    consoleErr.mockRestore();
  });

  it('skips malformed records and keeps the valid ones, then self-heals the payload', () => {
    const listener = jest.fn();
    const unsubscribe = onSavedLoanStorageError(listener);
    const consoleErr = jest.spyOn(console, 'error').mockImplementation(() => {});

    const valid = makeLoan({ id: 'good-1' });
    // A legacy-shaped record missing formSnapshot throws during migration.
    const malformed = { id: 'bad-1', createdAt: '2024-01-01T00:00:00.000Z' };
    storage.set(STORAGE_KEYS.SAVED_LOANS, JSON.stringify([valid, malformed]));

    const result = savedLoansStorage.getAll();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('good-1');
    expect(listener).toHaveBeenCalled();
    // The bad record is rewritten out of the stored payload.
    const persisted = JSON.parse(storage.getString(STORAGE_KEYS.SAVED_LOANS) ?? '[]');
    expect(persisted).toHaveLength(1);
    expect(persisted[0].id).toBe('good-1');

    unsubscribe();
    consoleErr.mockRestore();
  });

  it('addEvent rejects events with malformed dates', () => {
    savedLoansStorage.add(makeLoan());
    const badEvent = makeEvent({ date: 'nonsense' });
    expect(() => savedLoansStorage.addEvent('test-id-1', badEvent))
      .toThrow(InvalidMortgageEventError);
    expect(savedLoansStorage.getById('test-id-1')?.events).toEqual([]);
  });
});
