import { describe, expect, it } from '@jest/globals';
import {
  getProjectedDealBalanceAtDate,
  validateCompletionAmounts,
  validateCompletionOverpaymentRow,
  validateCompletionOverpaymentRows,
  validateCurrentDealDurationText,
  validateTrackLumpRows,
} from '@/shared/domain/mortgage/validation';
import { projectDeal } from '@/shared/domain/mortgage/tracker';
import { LoanDeal, MortgageEvent } from '@/shared/domain/types/SavedLoan';

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

describe('getProjectedDealBalanceAtDate', () => {
  it('returns the opening balance at the start date', () => {
    expect(getProjectedDealBalanceAtDate(deal, deal.startDate)).toBe(deal.openingBalance);
  });

  it('falls back to the opening balance for an unparseable date', () => {
    expect(getProjectedDealBalanceAtDate(deal, 'nope')).toBe(deal.openingBalance);
  });

  it('amortises down (never negative) and matches the shared projection engine', () => {
    const later = getProjectedDealBalanceAtDate(deal, '2029-01-01');
    expect(later).toBeGreaterThanOrEqual(0);
    expect(later).toBeLessThan(deal.openingBalance);
    // Locks the delegation: validation must read the same balance the projection shows.
    expect(later).toBe(projectDeal(deal, [], new Date('2029-01-01T00:00:00'), true).balance);
  });

  it('subtracts a prior lump overpayment event from the projected balance', () => {
    const priorLump: MortgageEvent = {
      id: 'ev-1',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      dealId: deal.id,
      type: 'lumpOverpayment',
      date: '2026-03-01',
      amount: 20000,
    };
    const withEvent = getProjectedDealBalanceAtDate(deal, '2029-01-01', [priorLump]);
    const withoutEvent = getProjectedDealBalanceAtDate(deal, '2029-01-01');
    expect(withEvent).toBeLessThan(withoutEvent);
  });
});

describe('validateCompletionOverpaymentRows (collective cap)', () => {
  it('accepts multiple rows that together stay within the balance', () => {
    const result = validateCompletionOverpaymentRows([
      { id: 'a', date: '2026-06-01', amount: '50000' },
      { id: 'b', date: '2027-06-01', amount: '50000' },
    ], deal, '2031-01-01');

    expect(result.get('a')).toMatchObject({ isValid: true });
    expect(result.get('b')).toMatchObject({ isValid: true });
  });

  it('flags a later row once the running total would exceed the balance', () => {
    const result = validateCompletionOverpaymentRows([
      { id: 'a', date: '2026-06-01', amount: '130000' },
      { id: 'b', date: '2027-06-01', amount: '130000' },
    ], deal, '2031-01-01');

    expect(result.get('a')).toMatchObject({ isValid: true });
    expect(result.get('b')).toMatchObject({
      isValid: false,
      amount: { errorKey: 'mortgage.overpaymentTooLarge' },
    });
  });
});

describe('validateTrackLumpRows', () => {
  const START = '2026-01-01';
  const PAYOFF = '2046-01-01';
  const BALANCE = 240000;

  const validate = (rows: { id: string; date: string; amount: string }[]) =>
    validateTrackLumpRows(rows, START, PAYOFF, BALANCE);

  it('ignores blank-amount rows so they never block save', () => {
    const [row] = validate([{ id: 'a', date: START, amount: '' }]);
    expect(row).toMatchObject({ ignored: true, isValid: true });
  });

  it('accepts a valid lump within the term', () => {
    const [row] = validate([{ id: 'a', date: '2030-06-01', amount: '5000' }]);
    expect(row).toMatchObject({ ignored: false, isValid: true });
  });

  it('rejects a lump dated before the start', () => {
    const [row] = validate([{ id: 'a', date: '2025-06-01', amount: '5000' }]);
    expect(row).toMatchObject({ isValid: false, dateErrorKey: 'mortgage.eventOutsideTerm' });
  });

  it('rejects a lump dated after the payoff', () => {
    const [row] = validate([{ id: 'a', date: '2047-01-01', amount: '5000' }]);
    expect(row).toMatchObject({ isValid: false, dateErrorKey: 'mortgage.eventOutsideTerm' });
  });

  it('flags an unparseable date', () => {
    const [row] = validate([{ id: 'a', date: 'nope', amount: '5000' }]);
    expect(row).toMatchObject({ isValid: false, dateErrorKey: 'mortgage.invalidEventDate' });
  });

  it('rejects lumps that collectively exceed the opening balance', () => {
    const rows = validate([
      { id: 'a', date: '2027-01-01', amount: '150000' },
      { id: 'b', date: '2028-01-01', amount: '150000' },
    ]);
    expect(rows[0]).toMatchObject({ isValid: true });
    expect(rows[1]).toMatchObject({ isValid: false, amountErrorKey: 'mortgage.overpaymentTooLarge' });
  });
});
