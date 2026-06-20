import { describe, expect, it } from '@jest/globals';
import { SavedLoanSortOption, sortSavedLoans } from '@/shared/domain/loans/savedLoanSort';
import { SavedLoan } from '@/shared/domain/types/SavedLoan';

const makeLoan = (
  id: string,
  nickname: string,
  createdAt: string,
  updatedAt: string,
  pinnedToDashboard = false,
): SavedLoan => ({
  id,
  nickname,
  createdAt,
  updatedAt,
  category: 'mortgage',
  currency: 'GBP',
  status: 'tracked',
  pinnedToDashboard,
  deals: [],
  events: [],
  formSnapshot: {
    loanAmount: 200000,
    interest: 5,
    termInYears: 20,
    termInMonths: 0,
    downPayment: 0,
    downPaymentType: 'CASH',
    desiredMonthlyPayment: null,
    additionalMonthlyPayment: 0,
    startDate: '2026-01-01',
    calculationType: 'PAYMENT',
    currency: 'GBP',
  },
  resultSnapshot: {
    monthlyPayments: 1200,
    totalAmountPaid: 288000,
    totalInterestPaid: 88000,
    totalInterestPaidBaseline: 88000,
    termInYears: 20,
    termInMonths: 0,
    totalTermInMonths: 240,
  },
});

const loans = [
  makeLoan('bravo', 'Bravo', '2026-02-01T00:00:00.000Z', '2026-04-01T00:00:00.000Z', true),
  makeLoan('alpha', 'Alpha', '2026-03-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z'),
  makeLoan('charlie', 'Charlie', '2026-01-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
];

describe('saved loan sorting', () => {
  const cases: Array<[SavedLoanSortOption, string[]]> = [
    ['recentlyAdded', ['alpha', 'bravo', 'charlie']],
    ['oldestAdded', ['charlie', 'bravo', 'alpha']],
    ['recentlyUpdated', ['charlie', 'bravo', 'alpha']],
    ['nameAscending', ['alpha', 'bravo', 'charlie']],
    ['nameDescending', ['charlie', 'bravo', 'alpha']],
  ];

  it.each(cases)('sorts by %s', (option, expected) => {
    expect(sortSavedLoans(loans, option).map(loan => loan.id)).toEqual(expected);
  });

  it('does not mutate the source list or use pin state as an ordering signal', () => {
    const source = [...loans];
    const unpinned = loans.map(loan => ({ ...loan, pinnedToDashboard: false }));

    expect(sortSavedLoans(loans, 'recentlyAdded').map(loan => loan.id))
      .toEqual(sortSavedLoans(unpinned, 'recentlyAdded').map(loan => loan.id));
    expect(loans).toEqual(source);
  });
});
