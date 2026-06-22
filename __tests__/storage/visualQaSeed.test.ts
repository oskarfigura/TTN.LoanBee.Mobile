import { describe, expect, it, beforeEach } from '@jest/globals';
import { buildVisualQaLoans, seedVisualQaLoans } from '@/shared/lib/dev/visualQaSeed';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';

describe('visual QA seed data', () => {
  beforeEach(() => {
    savedLoansStorage.clear();
  });

  it('builds representative saved-loan fixtures for emulator visual checks', () => {
    const loans = buildVisualQaLoans();

    expect(loans).toHaveLength(12);
    expect(loans.map(loan => loan.id)).toEqual([
      'demo-mega-mortgage',
      'demo-family-home',
      'demo-riverside-remortgage',
      'demo-holiday-let',
      'demo-kitchen-renovation',
      'demo-electric-car',
      'demo-road-bike',
      'demo-motorbike',
      'demo-education',
      'demo-photo-studio',
      'demo-paid-off',
      'demo-draft-plan',
    ]);
    expect(loans.some(loan => loan.currency === 'PLN')).toBe(true);
    expect(loans.some(loan => loan.currency === 'USD')).toBe(true);
    expect(loans.some(loan => loan.category === 'loan' && (loan.formSnapshot.additionalMonthlyPayment ?? 0) > 0)).toBe(true);
    expect(loans.filter(loan => loan.category === 'loan').map(loan => loan.loanPurpose)).toEqual(
      expect.arrayContaining(['homeImprovement', 'car', 'bike', 'motorbike', 'education', 'business']),
    );
    expect(loans.some(loan => loan.deals.some(deal => deal.status === 'draft'))).toBe(true);
    expect(loans.some(loan => loan.deals.some(deal => deal.repaymentType === 'interestOnly'))).toBe(true);
    expect(loans.some(loan => loan.events.some(event => event.type === 'paymentHoliday'))).toBe(true);
    expect(loans.filter(loan => loan.pinnedToDashboard).map(loan => loan.id)).toEqual([
      'demo-mega-mortgage',
      'demo-family-home',
      'demo-riverside-remortgage',
    ]);

    // Both down-payment types are represented (CASH and PERCENT).
    expect(loans.some(loan => loan.formSnapshot.downPaymentType === 'CASH')).toBe(true);
    expect(loans.some(loan => loan.formSnapshot.downPaymentType === 'PERCENT')).toBe(true);
    // Both calculation types are represented (TERM and PAYMENT).
    expect(loans.some(loan => loan.formSnapshot.calculationType === 'PAYMENT')).toBe(true);
    // A draft loan group exists alongside the tracked ones.
    expect(loans.some(loan => loan.status === 'draft')).toBe(true);
    expect(loans.some(loan => loan.status === 'tracked')).toBe(true);
    // An estimate-source projected deal is present.
    expect(loans.some(loan => loan.deals.some(deal => deal.source === 'estimate'))).toBe(true);
    // A mortgage repaid in full (terminal completion) is present.
    expect(loans.some(loan => loan.deals.some(deal => deal.completion?.terminal === true))).toBe(true);
    // A remortgage that drew additional borrowing is present.
    expect(loans.some(loan => loan.deals.some(deal => (deal.additionalBorrowing ?? 0) > 0))).toBe(true);

    const bankCheckpoints = loans
      .flatMap(loan => loan.events)
      .filter(event => event.type === 'balanceCheckpoint' && event.reconciliationVariance !== undefined);
    expect(bankCheckpoints.map(event => event.reconciliationVariance)).toEqual(
      expect.arrayContaining([2500, -800, 0]),
    );
    // Every variance reason is exercised across the checkpoint events.
    const seenVarianceReasons = new Set(
      bankCheckpoints.map(event => event.varianceReason).filter(Boolean),
    );
    expect(seenVarianceReasons).toEqual(
      new Set([
        'missedPayment',
        'paymentHoliday',
        'unloggedOverpayment',
        'feeAdded',
        'rateOrPaymentChanged',
        'lenderTiming',
        'unknown',
      ]),
    );
    expect(bankCheckpoints.some(event => event.reconciliationVariance === 0 && event.varianceReason === undefined)).toBe(true);
    const today = new Date().toISOString().split('T')[0];
    expect(bankCheckpoints.every(event => event.date <= today)).toBe(true);
  });

  it('replaces saved loans with deterministic fixtures', () => {
    seedVisualQaLoans();

    const loans = savedLoansStorage.getAll();
    expect(loans.map(loan => loan.id)).toEqual([
      'demo-mega-mortgage',
      'demo-family-home',
      'demo-riverside-remortgage',
      'demo-holiday-let',
      'demo-kitchen-renovation',
      'demo-electric-car',
      'demo-road-bike',
      'demo-motorbike',
      'demo-education',
      'demo-photo-studio',
      'demo-paid-off',
      'demo-draft-plan',
    ]);
    expect(loans[0].dashboardOrder).toBe(0);
    expect(loans[1].dashboardOrder).toBe(1);
  });
});
