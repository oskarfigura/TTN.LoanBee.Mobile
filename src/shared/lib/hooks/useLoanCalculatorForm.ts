import { useEffect, useRef } from 'react';
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

// Defined in the schema module (kept free of expo-localization / MMKV) so it can be
// unit-tested in isolation; re-exported here as the calculator's canonical import surface.
export { EXAMPLE_CALCULATOR_VALUES } from '@/shared/lib/hooks/loanCalculatorSchema';

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
  const previousCalculationType = useRef(calculationType);

  useEffect(() => {
    const previous = previousCalculationType.current;
    previousCalculationType.current = calculationType;

    // Validate an empty term when the user actively switches back to term mode.
    // Do not validate the default values on mount: edit routes hydrate the saved
    // calculation immediately afterwards, which otherwise flashes a false error.
    if (previous !== calculationType && calculationType === LoanCalculationType.TERM) {
      const years = Number(form.getValues('termInYears'));
      const months = Number(form.getValues('termInMonths'));
      if (years === 0 && months === 0) {
        form.trigger(['termInYears', 'termInMonths']);
      }
    }
  }, [calculationType, form]);

  return form;
};
