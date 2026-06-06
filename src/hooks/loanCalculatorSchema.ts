import { z } from 'zod';
import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { getEffectiveLoanAmount, getMinimumAmortisingPayment } from '@/utils/paymentValidation';

// Mirrors LIMITS in src/share/calculationShareLink.ts. Keep in sync.
export const MAX_LOAN_AMOUNT = 100_000_000;
export const MAX_MONTHLY_PAYMENT = 1_000_000;

// Kept free of expo-localization / MMKV imports so it can be unit-tested in the
// node Jest project without native-module shims. useLoanCalculatorForm wires it
// up with react-hook-form and supplies the locale-derived default currency.
export const loanCalculatorSchema = z.object({
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
  // Strictly less than the loan amount: a 100% (or full-cash) down payment leaves
  // nothing to amortise, so the engine would produce an empty schedule.
  if (data.downPaymentType === DownPaymentType.PERCENT && data.downPayment >= 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'errors.downPaymentPercent',
      path: ['downPayment'],
    });
  }

  if (data.downPaymentType === DownPaymentType.CASH && data.downPayment >= data.loanAmount) {
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

export type LoanCalculatorFormInputValues = z.input<typeof loanCalculatorSchema>;
export type LoanCalculatorFormValues = z.output<typeof loanCalculatorSchema>;
