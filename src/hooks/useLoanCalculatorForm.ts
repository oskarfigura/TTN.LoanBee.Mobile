import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { CurrencyCode } from '@/currency/currencies';
import { storage } from '@/storage/mmkv';
import { STORAGE_KEYS } from '@/storage/keys';
import { languageToCurrency } from '@/currency/defaults';
import { getLocales } from 'expo-localization';
import { getEffectiveLoanAmount, getMinimumAmortisingPayment } from '@/utils/paymentValidation';

const schema = z.object({
  loanAmount: z.coerce
    .number({ message: 'Loan amount must be greater than 0' })
    .min(1, { message: 'Loan amount must be greater than 0' }),
  interest: z.coerce
    .number({ message: 'Interest rate must be greater than 0' })
    .positive({ message: 'Interest rate must be greater than 0' })
    .max(100, { message: 'Interest rate must be less than or equal to 100' }),
  termInYears: z.coerce
    .number({ message: 'Term in years must be a non-negative integer' })
    .min(0, { message: 'Term in years must be a non-negative integer' })
    .max(100, { message: 'Term cannot be longer than 100 years' })
    .int({ message: 'Term in years must be a non-negative integer' }),
  termInMonths: z.coerce
    .number({ message: 'Term in months must be between 0 and 12' })
    .min(0, { message: 'Term in months must be between 0 and 12' })
    .max(12, { message: 'Term in months must be between 0 and 12' })
    .int({ message: 'Term in months must be between 0 and 12' }),
  downPayment: z.coerce
    .number({ message: 'Down payment must be greater than or equal to 0' })
    .min(0, { message: 'Down payment must be greater than or equal to 0' }),
  downPaymentType: z.enum(['percent', 'cash']),
  desiredMonthlyPayment: z.coerce
    .number({ message: 'Desired monthly payment must be greater than or equal to 0' })
    .min(0, { message: 'Desired monthly payment must be greater than or equal to 0' })
    .optional(),
  additionalMonthlyPayment: z.coerce
    .number({ message: 'Additional monthly payment must be greater than or equal to 0' })
    .min(0, { message: 'Additional monthly payment must be greater than or equal to 0' }),
  startDate: z.string().min(1, { message: 'Please enter a valid date' }),
  calculationType: z.enum(['term', 'payment']),
  currency: z.string(),
}).superRefine((data, ctx) => {
  if (data.downPaymentType === DownPaymentType.PERCENT && data.downPayment > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Down payment percentage cannot exceed 100%',
      path: ['downPayment'],
    });
  }

  if (data.downPaymentType === DownPaymentType.CASH && data.downPayment > data.loanAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Down payment cannot exceed the loan amount',
      path: ['downPayment'],
    });
  }

  if (data.calculationType === LoanCalculationType.TERM && data.termInYears === 0 && data.termInMonths === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Term in years and months cannot both be 0',
      path: ['termInYears'],
    });
  }

  if (data.calculationType === LoanCalculationType.PAYMENT && (data.desiredMonthlyPayment ?? 0) === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Desired monthly payment must be greater than 0',
      path: ['desiredMonthlyPayment'],
    });
  }

  const effectiveLoanAmount = getEffectiveLoanAmount(
    data.loanAmount,
    data.downPayment,
    data.downPaymentType,
  );
  const minimumAmortisingPayment = getMinimumAmortisingPayment(
    data.loanAmount,
    data.interest,
    data.downPayment,
    data.downPaymentType,
  );

  if (data.calculationType === LoanCalculationType.PAYMENT && (data.desiredMonthlyPayment ?? 0) > effectiveLoanAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Desired monthly payment cannot exceed the loan balance after down payment',
      path: ['desiredMonthlyPayment'],
    });
  }

  if (
    data.calculationType === LoanCalculationType.PAYMENT
    && effectiveLoanAmount > 0
    && (data.desiredMonthlyPayment ?? 0) < minimumAmortisingPayment
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Desired monthly payment must be at least ${minimumAmortisingPayment.toFixed(2)} to reduce the balance`,
      path: ['desiredMonthlyPayment'],
    });
  }

  if (data.calculationType === LoanCalculationType.TERM && data.additionalMonthlyPayment > effectiveLoanAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Additional monthly payment cannot exceed the loan balance after down payment',
      path: ['additionalMonthlyPayment'],
    });
  }
});

export type LoanCalculatorFormInputValues = z.input<typeof schema>;
export type LoanCalculatorFormValues = z.output<typeof schema>;

export const getDefaultCurrency = (): CurrencyCode => {
  const saved = storage.getString(STORAGE_KEYS.USER_CURRENCY) as CurrencyCode | undefined;
  if (saved) return saved;
  const locale = getLocales()[0]?.languageCode ?? 'en';
  return languageToCurrency(locale);
};

const defaultValues: LoanCalculatorFormValues = {
  loanAmount: 300000,
  interest: 3,
  termInYears: 10,
  termInMonths: 0,
  downPayment: 10,
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
    resolver: zodResolver(schema),
    reValidateMode: 'onChange',
    mode: 'onSubmit',
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
