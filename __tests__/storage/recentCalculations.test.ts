import { beforeEach, describe, expect, it } from '@jest/globals';
import { getLoanCalculations } from '@/shared/domain/core/amortisation';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { recentCalculationsStorage } from '@/shared/lib/storage/recentCalculations';
import { storage } from '@/shared/lib/storage/mmkv';
import { STORAGE_KEYS } from '@/shared/lib/storage/keys';
import type { CurrencyCode } from '@/shared/domain/currency/currencies';
import type { LoanCalculatorFormValues } from '@/shared/lib/hooks/useLoanCalculatorForm';

const makeForm = (overrides: Partial<LoanCalculatorFormValues> = {}): LoanCalculatorFormValues => {
  const base: LoanCalculatorFormValues = {
  loanAmount: 200000,
  interest: 4,
  termInYears: 20,
  termInMonths: 0,
  downPayment: 0,
  downPaymentType: DownPaymentType.CASH,
  desiredMonthlyPayment: 0,
  additionalMonthlyPayment: 0,
  startDate: '2026-01-01',
  calculationType: LoanCalculationType.TERM,
  currency: 'GBP',
  };
  return { ...base, ...overrides };
};

const addRecent = (overrides: Partial<LoanCalculatorFormValues> = {}) => {
  const formValues = makeForm(overrides);
  const result = getLoanCalculations(
    formValues.loanAmount,
    formValues.interest,
    formValues.termInYears,
    formValues.termInMonths,
    formValues.desiredMonthlyPayment ?? 0,
    formValues.calculationType,
    formValues.downPayment,
    formValues.downPaymentType,
    formValues.additionalMonthlyPayment,
    formValues.startDate,
  );

  return recentCalculationsStorage.addFromResult({
    result,
    formValues,
    currency: formValues.currency as CurrencyCode,
  });
};

beforeEach(() => {
  recentCalculationsStorage.clear();
});

describe('recentCalculationsStorage', () => {
  it('stores recent calculations newest first', () => {
    const first = addRecent({ loanAmount: 100000 });
    const second = addRecent({ loanAmount: 150000 });

    expect(recentCalculationsStorage.getAll().map(item => item.id)).toEqual([second.id, first.id]);
  });

  it('caps stored calculations', () => {
    for (let index = 0; index < 14; index += 1) {
      addRecent({ loanAmount: 100000 + index });
    }

    expect(recentCalculationsStorage.getAll()).toHaveLength(12);
  });

  it('removes a calculation by id', () => {
    const first = addRecent({ loanAmount: 100000 });
    const second = addRecent({ loanAmount: 150000 });

    recentCalculationsStorage.remove(second.id);

    expect(recentCalculationsStorage.getAll().map(item => item.id)).toEqual([first.id]);
  });

  it('treats malformed storage as empty', () => {
    storage.set(STORAGE_KEYS.RECENT_CALCULATIONS, '{bad json');

    expect(recentCalculationsStorage.getAll()).toEqual([]);
  });
});
