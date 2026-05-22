import { describe, expect, it } from '@jest/globals';
import {
  validateCompletionAmounts,
  validateCompletionOverpaymentRow,
  validateCurrentDealDurationText,
} from '@/mortgage/validation';
import { LoanDeal } from '@/types/SavedLoan';

const deal: LoanDeal = {
  id: 'deal-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  name: '5-year Fixed',
  status: 'active',
  startDate: '2026-01-01',
  endDate: '2031-01-01',
  openingBalance: 240000,
  interestRate: 4.2,
  repaymentType: 'repayment',
  monthlyPayment: 1300,
  regularOverpayment: 100,
  remainingTermInYears: 25,
  remainingTermInMonths: 0,
};

describe('mortgage validation helpers', () => {
  it('validates save-flow current deal duration text', () => {
    expect(validateCurrentDealDurationText('5', '0', 300)).toMatchObject({
      totalMonths: 60,
      isValid: true,
    });
    expect(validateCurrentDealDurationText('5.5', '0', 300).years).toMatchObject({
      errorKey: 'forms.invalidInteger',
      isValid: false,
    });
    expect(validateCurrentDealDurationText('5', '12', 300).months).toMatchObject({
      errorKey: 'forms.monthRange',
      isValid: false,
    });
    expect(validateCurrentDealDurationText('31', '0', 300)).toMatchObject({
      errorKey: 'forms.durationTooLong',
      isValid: false,
    });
  });

  it('validates completion closing balance and fees', () => {
    expect(validateCompletionAmounts('0', '0')).toMatchObject({
      closingBalance: { numeric: 0, isValid: true },
      feesAdded: { numeric: 0, isValid: true },
    });
    expect(validateCompletionAmounts('abc', '0').closingBalance).toMatchObject({
      errorKey: 'forms.invalidNumber',
      isValid: false,
    });
    expect(validateCompletionAmounts('10', '-1').feesAdded).toMatchObject({
      errorKey: 'forms.requiredNonNegative',
      isValid: false,
    });
  });

  it('validates completion overpayment rows instead of silently dropping them', () => {
    expect(validateCompletionOverpaymentRow({ date: '2026-06-01', amount: '5000' }, deal, '2031-01-01')).toMatchObject({
      isValid: true,
      amount: { numeric: 5000 },
    });
    expect(validateCompletionOverpaymentRow({ date: '2026-06-01', amount: '12abc' }, deal, '2031-01-01')).toMatchObject({
      isValid: false,
      amount: { errorKey: 'forms.invalidNumber' },
    });
    expect(validateCompletionOverpaymentRow({ date: '2032-01-01', amount: '5000' }, deal, '2031-01-01')).toMatchObject({
      isValid: false,
      dateErrorKey: 'mortgage.eventOutsideDealDates',
    });
    expect(validateCompletionOverpaymentRow({ date: '2026-06-01', amount: '999999' }, deal, '2031-01-01')).toMatchObject({
      isValid: false,
      amount: { errorKey: 'mortgage.overpaymentTooLarge' },
    });
  });
});
