import { describe, expect, it } from '@jest/globals';
import { buildDraftLoanPreview, buildInitialDeal, RawFormValues } from '@/shared/domain/loans/loanGroupFactory';
import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { LoanGroup } from '@/shared/domain/types/SavedLoan';

const makeMortgage = (overrides: Partial<LoanGroup> = {}): LoanGroup => ({
  id: 'mortgage-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nickname: 'Home',
  lender: 'Halifax',
  category: 'mortgage',
  currency: 'GBP',
  mortgageTermInMonths: 420,
  status: 'tracked',
  pinnedToDashboard: false,
  deals: [],
  events: [],
  formSnapshot: {
    loanAmount: 300000,
    interest: 4.2,
    termInYears: 35,
    termInMonths: 0,
    downPayment: 0,
    downPaymentType: 'CASH',
    desiredMonthlyPayment: null,
    additionalMonthlyPayment: null,
    startDate: '2026-01-01',
    calculationType: 'TERM',
    currency: 'GBP',
  },
  resultSnapshot: {
    monthlyPayments: 1295,
    totalAmountPaid: 543900,
    totalInterestPaid: 243900,
    totalInterestPaidBaseline: 243900,
    termInYears: 35,
    termInMonths: 0,
    totalTermInMonths: 420,
  },
  ...overrides,
});

describe('loanGroupFactory', () => {
  it('builds the first mortgage deal with a separate current deal duration', () => {
    const deal = buildInitialDeal('deal-1', makeMortgage(), {
      name: '5-year fixed',
      durationInMonths: 60,
      source: 'userDeal',
    });

    expect(deal.name).toBe('5-year fixed');
    expect(deal.startDate).toBe('2026-01-01');
    expect(deal.endDate).toBe('2031-01-01');
    expect(deal.remainingTermInYears).toBe(35);
    expect(deal.remainingTermInMonths).toBe(0);
    expect(deal.source).toBe('userDeal');
  });

  it('marks bare-bones first mortgage deals as estimate-backed by default', () => {
    const deal = buildInitialDeal('deal-1', makeMortgage());

    expect(deal.endDate).toBe('2061-01-01');
    expect(deal.source).toBe('estimate');
  });
});

describe('buildDraftLoanPreview baseline', () => {
  const draftForm: RawFormValues = {
    loanAmount: 300000,
    interest: 4,
    termInYears: 25,
    termInMonths: 0,
    downPayment: 10,
    downPaymentType: 'percent',
    desiredMonthlyPayment: 0,
    additionalMonthlyPayment: 0,
    startDate: '2026-01-01',
    calculationType: 'term',
  };
  const result = getLoanCalculations(
    300000, 4, 25, 0, 0, LoanCalculationType.TERM, 10, DownPaymentType.PERCENT, 0, '2026-01-01',
  );

  it('computes the baseline down the lowercase core path (term + percent deposit)', () => {
    const preview = buildDraftLoanPreview(draftForm, result, 'GBP');
    // The core compares lowercase enums; the baseline must match the term/percent path,
    // not the payment/cash path that uppercase values would (wrongly) select.
    const expected = getLoanCalculations(
      300000, 4, 25, 0, 0, LoanCalculationType.TERM, 10, DownPaymentType.PERCENT, 0, '2026-01-01',
    );

    expect(preview.resultSnapshot.totalInterestPaidBaseline).toBeCloseTo(expected.totalInterestPaid, 2);
    expect(preview.resultSnapshot.totalInterestPaidBaseline).toBeGreaterThan(0);
  });
});
