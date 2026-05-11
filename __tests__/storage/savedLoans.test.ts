import { describe, it, expect, beforeEach } from '@jest/globals';
import { savedLoansStorage } from '../../src/storage/savedLoans';
import { LegacySavedLoan, SavedLoan } from '../../src/types/SavedLoan';
import { storage } from '../../src/storage/mmkv';
import { STORAGE_KEYS } from '../../src/storage/keys';

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
    savedLoansStorage.add(makeLoan());
    savedLoansStorage.togglePinned('test-id-1');

    const pinned = savedLoansStorage.getById('test-id-1');
    expect(pinned?.pinnedToDashboard).toBe(true);
    expect(pinned?.dashboardOrder).toBe(1);

    savedLoansStorage.togglePinned('test-id-1');
    expect(savedLoansStorage.getById('test-id-1')?.pinnedToDashboard).toBe(false);
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

  it('backfills mortgage term on existing loan groups', () => {
    const loan = makeLoan();
    const { mortgageTermInMonths, ...withoutMortgageTerm } = loan;
    void mortgageTermInMonths;

    storage.set(STORAGE_KEYS.SAVED_LOANS, JSON.stringify([withoutMortgageTerm]));

    expect(savedLoansStorage.getAll()[0].mortgageTermInMonths).toBe(120);
  });
});
