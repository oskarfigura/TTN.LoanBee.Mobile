import { describe, it, expect, beforeEach } from '@jest/globals';
import { savedLoansStorage } from '../../src/storage/savedLoans';
import { SavedLoan } from '../../src/types/SavedLoan';

const makeLoan = (overrides: Partial<SavedLoan> = {}): SavedLoan => ({
  id: 'test-id-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  nickname: 'My Mortgage',
  category: 'mortgage',
  currency: 'GBP',
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
});
