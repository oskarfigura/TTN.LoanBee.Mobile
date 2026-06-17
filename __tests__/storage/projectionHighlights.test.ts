import { describe, expect, it } from '@jest/globals';
import { buildProjectionHighlights } from '@/shared/domain/mortgage/projectionHighlights';
import type { LoanGroup } from '@/shared/domain/types/SavedLoan';

const makeLoan = (): LoanGroup => ({
  id: 'loan-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  nickname: 'Home',
  lender: 'LoanBee Bank',
  category: 'mortgage',
  currency: 'GBP',
  status: 'tracked',
  pinnedToDashboard: false,
  deals: [
    {
      id: 'deal-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      name: '2-year fixed',
      lender: 'LoanBee Bank',
      status: 'completed',
      startDate: '2026-01-01',
      endDate: '2027-12-31',
      openingBalance: 250000,
      interestRate: 4.1,
      repaymentType: 'repayment',
      monthlyPayment: 1200,
      regularOverpayment: 0,
      remainingTermInYears: 23,
      remainingTermInMonths: 0,
      completion: {
        completedAt: '2027-12-31',
        closingBalance: 232000,
        feesAdded: 0,
      },
    },
    {
      id: 'deal-2',
      createdAt: '2027-12-31T00:00:00.000Z',
      updatedAt: '2027-12-31T00:00:00.000Z',
      name: '5-year fixed',
      lender: 'LoanBee Bank',
      status: 'active',
      startDate: '2028-01-01',
      endDate: '2032-12-31',
      openingBalance: 232000,
      interestRate: 3.7,
      repaymentType: 'repayment',
      monthlyPayment: 1280,
      regularOverpayment: 150,
      remainingTermInYears: 18,
      remainingTermInMonths: 0,
    },
    {
      id: 'deal-3',
      createdAt: '2032-12-31T00:00:00.000Z',
      updatedAt: '2032-12-31T00:00:00.000Z',
      name: 'Draft next deal',
      lender: 'LoanBee Bank',
      status: 'draft',
      startDate: '2033-01-01',
      endDate: '2035-12-31',
      openingBalance: 190000,
      interestRate: 3.9,
      repaymentType: 'repayment',
      monthlyPayment: 1320,
      regularOverpayment: 220,
      remainingTermInYears: 15,
      remainingTermInMonths: 0,
    },
  ],
  events: [
    {
      id: 'lump-live',
      createdAt: '2028-06-01T00:00:00.000Z',
      updatedAt: '2028-06-01T00:00:00.000Z',
      dealId: 'deal-2',
      type: 'lumpOverpayment',
      date: '2028-06-01',
      amount: 5000,
    },
    {
      id: 'checkpoint-live',
      createdAt: '2028-09-01T00:00:00.000Z',
      updatedAt: '2028-09-01T00:00:00.000Z',
      dealId: 'deal-2',
      type: 'balanceCheckpoint',
      date: '2028-09-01',
      balance: 221000,
    },
    {
      id: 'missed-live',
      createdAt: '2028-10-01T00:00:00.000Z',
      updatedAt: '2028-10-01T00:00:00.000Z',
      dealId: 'deal-2',
      type: 'missedPayment',
      date: '2028-10-01',
    },
    {
      id: 'lump-draft',
      createdAt: '2033-02-01T00:00:00.000Z',
      updatedAt: '2033-02-01T00:00:00.000Z',
      dealId: 'deal-3',
      type: 'lumpOverpayment',
      date: '2033-02-01',
      amount: 3000,
    },
    {
      id: 'holiday-draft',
      createdAt: '2033-03-01T00:00:00.000Z',
      updatedAt: '2033-03-01T00:00:00.000Z',
      dealId: 'deal-3',
      type: 'paymentHoliday',
      date: '2033-03-01',
    },
  ],
  formSnapshot: {
    loanAmount: 250000,
    interest: 4.1,
    termInYears: 25,
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
    monthlyPayments: 1200,
    totalAmountPaid: 0,
    totalInterestPaid: 0,
    totalInterestPaidBaseline: 0,
    termInYears: 25,
    termInMonths: 0,
    totalTermInMonths: 300,
  },
});

describe('buildProjectionHighlights', () => {
  it('summarises published deal changes and ignores draft-only events', () => {
    const highlights = buildProjectionHighlights(makeLoan());

    expect(highlights).toEqual([
      { kind: 'dealChanges', count: 1, labelKey: 'mortgage.projectionDealChanges' },
      { kind: 'regularOverpayments', count: 1, labelKey: 'mortgage.projectionRegularOverpayments' },
      { kind: 'lumpOverpayments', count: 1, labelKey: 'mortgage.projectionLumpOverpayments' },
      { kind: 'checkpoints', count: 1, labelKey: 'mortgage.projectionCheckpoints' },
      { kind: 'paymentPauses', count: 1, labelKey: 'mortgage.projectionPaymentPauses' },
    ]);
  });

  it('returns an empty list when the saved mortgage has no published changes or events', () => {
    const loan = makeLoan();
    loan.deals = [loan.deals[0]];
    loan.deals[0] = { ...loan.deals[0], status: 'active', completion: undefined };
    loan.events = [];

    expect(buildProjectionHighlights(loan)).toEqual([]);
  });
});
