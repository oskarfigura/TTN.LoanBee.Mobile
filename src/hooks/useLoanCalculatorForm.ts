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

// Mirrors LIMITS in src/share/calculationShareLink.ts. Keep in sync.
const MAX_LOAN_AMOUNT = 1_000_000_000;
const MAX_MONTHLY_PAYMENT = 10_000_000;

const schema = z.object({
  loanAmount: z.coerce
    .number({ message: 'errors.loanAmount' })
    .min(1, { message: 'errors.loanAmount' })
    .max(MAX_LOAN_AMOUNT, { message: 'errors.loanAmountMax' }),
  interest: z.coerce
    .number({ message: 'errors.interest' })
    .positive({ message: 'errors.interest' })
    .max(100, { message: 'errors.interestMax' }),
  termInYears: z.coerce
    .number({ message: 'errors.termYearInvalid' })
    .min(0, { message: 'errors.termYearInvalid' })
    .max(100, { message: 'errors.termTooLong' })
    .int({ message: 'errors.termYearInvalid' }),
  termInMonths: z.coerce
    .number({ message: 'errors.termMonthRange' })
    .min(0, { message: 'errors.termMonthRange' })
    .max(11, { message: 'errors.termMonthRange' })
    .int({ message: 'errors.termMonthRange' }),
  downPayment: z.coerce
    .number({ message: 'errors.downPaymentNonNegative' })
    .min(0, { message: 'errors.downPaymentNonNegative' }),
  downPaymentType: z.enum(['percent', 'cash']),
  desiredMonthlyPayment: z.coerce
    .number({ message: 'errors.desiredPaymentNonNegative' })
    .min(0, { message: 'errors.desiredPaymentNonNegative' })
    .max(MAX_MONTHLY_PAYMENT, { message: 'errors.desiredPaymentMax' })
    .optional(),
  additionalMonthlyPayment: z.coerce
    .number({ message: 'errors.additionalPaymentNonNegative' })
    .min(0, { message: 'errors.additionalPaymentNonNegative' })
    .max(MAX_MONTHLY_PAYMENT, { message: 'errors.additionalPaymentMax' }),
  startDate: z.string().min(1, { message: 'errors.startDate' }),
  calculationType: z.enum(['term', 'payment']),
  currency: z.string(),
}).superRefine((data, ctx) => {
  if (data.downPaymentType === DownPaymentType.PERCENT && data.downPayment > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'errors.downPaymentPercent',
      path: ['downPayment'],
    });
  }

  if (data.downPaymentType === DownPaymentType.CASH && data.downPayment > data.loanAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'errors.downPaymentCash',
      path: ['downPayment'],
    });
  }

  if (data.calculationType === LoanCalculationType.TERM && data.termInYears === 0 && data.termInMonths === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'errors.termRequired',
      path: ['termInYears'],
    });
  }

  if (data.calculationType === LoanCalculationType.PAYMENT && (data.desiredMonthlyPayment ?? 0) === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'errors.desiredPaymentRequired',
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
      message: 'errors.desiredPaymentExceeds',
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
      message: `errors.desiredPaymentMinimum|${minimumAmortisingPayment.toFixed(2)}`,
      path: ['desiredMonthlyPayment'],
    });
  }

  if (data.calculationType === LoanCalculationType.TERM && data.additionalMonthlyPayment > effectiveLoanAmount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'errors.additionalPaymentExceeds',
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
