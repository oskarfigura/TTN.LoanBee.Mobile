import { describe, expect, it } from '@jest/globals';
import {
  InvalidMortgageEventError,
  upsertMortgageEvent,
} from '@/shared/domain/mortgage/events';
import { LoanGroup, MortgageEvent } from '@/shared/domain/types/SavedLoan';

const emptyLoan: LoanGroup = {
  id: 'l1',
  createdAt: '',
  updatedAt: '',
  nickname: 'Test',
  category: 'mortgage',
  currency: 'GBP',
  status: 'tracked',
  pinnedToDashboard: false,
  deals: [],
  events: [],
  formSnapshot: {
    loanAmount: 300000,
    interest: 3,
    termInYears: 10,
    termInMonths: 0,
    downPayment: 0,
    downPaymentType: 'PERCENT',
    desiredMonthlyPayment: null,
    additionalMonthlyPayment: null,
    startDate: '2024-01-01',
    calculationType: 'TERM',
    currency: 'GBP',
  },
  resultSnapshot: {
    monthlyPayments: 2700,
    totalAmountPaid: 320000,
    totalInterestPaid: 50000,
    totalInterestPaidBaseline: 60000,
    termInYears: 10,
    termInMonths: 0,
    totalTermInMonths: 120,
  },
};

const makeEvent = (overrides: Partial<MortgageEvent>): MortgageEvent => ({
  id: 'evt-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  type: 'lumpOverpayment',
  date: '2024-06-15',
  amount: 1000,
  ...overrides,
});

describe('upsertMortgageEvent validation', () => {
  it('accepts a valid event', () => {
    const result = upsertMortgageEvent(emptyLoan, makeEvent({}));
    expect(result.events).toHaveLength(1);
  });

  it('throws InvalidMortgageEventError for malformed dates', () => {
    expect(() => upsertMortgageEvent(emptyLoan, makeEvent({ date: 'not-a-date' })))
      .toThrow(InvalidMortgageEventError);
  });

  it('throws when date does not match the YYYY-MM-DD shape', () => {
    expect(() => upsertMortgageEvent(emptyLoan, makeEvent({ date: '2024/06/15' })))
      .toThrow(InvalidMortgageEventError);
  });

  it('throws for non-finite amount', () => {
    expect(() => upsertMortgageEvent(emptyLoan, makeEvent({ amount: Number.NaN })))
      .toThrow(InvalidMortgageEventError);
  });

  it('throws for non-finite balance', () => {
    expect(() => upsertMortgageEvent(emptyLoan, makeEvent({
      type: 'balanceCheckpoint',
      balance: Number.POSITIVE_INFINITY,
    }))).toThrow(InvalidMortgageEventError);
  });
});
