import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import { CurrencyCode } from '@/shared/domain/currency/currencies';
import { storage } from '@/shared/lib/storage/mmkv';
import { STORAGE_KEYS } from '@/shared/lib/storage/keys';
import { languageToCurrency } from '@/shared/domain/currency/defaults';
import { getLocales } from 'expo-localization';
import {
  LoanCalculatorFormInputValues,
  LoanCalculatorFormValues,
  loanCalculatorSchema,
} from '@/shared/lib/hooks/loanCalculatorSchema';

export type { LoanCalculatorFormInputValues, LoanCalculatorFormValues };

export const getDefaultCurrency = (): CurrencyCode => {
  const saved = storage.getString(STORAGE_KEYS.USER_CURRENCY) as CurrencyCode | undefined;
  if (saved) return saved;
  const locale = getLocales()[0]?.languageCode ?? 'en';
  return languageToCurrency(locale);
};

const defaultValues: LoanCalculatorFormInputValues = {
  category: 'mortgage',
  loanAmount: '',
  interest: '',
  termInYears: '',
  termInMonths: 0,
  downPayment: '',
  downPaymentType: DownPaymentType.PERCENT,
  desiredMonthlyPayment: 0,
  additionalMonthlyPayment: 0,
  startDate: new Date().toISOString().split('T')[0],
  calculationType: LoanCalculationType.TERM,
  currency: getDefaultCurrency(),
};

interface Props {
  initialValues?: Partial<LoanCalculatorFormValues>;
}

export const useLoanCalculatorForm = ({ initialValues }: Props = {}) => {
  const form = useForm<LoanCalculatorFormInputValues, undefined, LoanCalculatorFormValues>({
    defaultValues: { ...defaultValues, ...initialValues },
    resolver: zodResolver(loanCalculatorSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const calculationType = form.watch('calculationType');

  useEffect(() => {
    if (calculationType === LoanCalculationType.TERM) {
      const years = Number(form.getValues('termInYears'));
      const months = Number(form.getValues('termInMonths'));
      if (years === 0 && months === 0) {
        form.trigger(['termInYears', 'termInMonths']);
      }
    }
  }, [calculationType]);

  return form;
};
