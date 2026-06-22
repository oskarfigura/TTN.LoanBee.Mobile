import { describe, expect, it, beforeEach } from '@jest/globals';
import { buildVisualQaLoans, seedVisualQaLoans } from '@/shared/lib/dev/visualQaSeed';
import { savedLoansStorage } from '@/shared/lib/storage/savedLoans';

describe('visual QA seed data', () => {
  beforeEach(() => {
    savedLoansStorage.clear();
  });

  it('builds representative saved-loan fixtures for emulator visual checks', () => {
    const loans = buildVisualQaLoans();

    expect(loans).toHaveLength(10);
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

    const bankCheckpoints = loans
      .flatMap(loan => loan.events)
      .filter(event => event.type === 'balanceCheckpoint' && event.reconciliationVariance !== undefined);
    expect(bankCheckpoints.map(event => event.reconciliationVariance)).toEqual(
      expect.arrayContaining([2500, -800, 0]),
    );
    expect(bankCheckpoints.some(event => event.varianceReason === 'missedPayment')).toBe(true);
    expect(bankCheckpoints.some(event => event.varianceReason === 'lenderTiming')).toBe(true);
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
    ]);
    expect(loans[0].dashboardOrder).toBe(0);
    expect(loans[1].dashboardOrder).toBe(1);
  });
});
