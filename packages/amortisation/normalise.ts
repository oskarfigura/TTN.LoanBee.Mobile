import { calculateMinPayment } from './calculation';
import { DEFAULT_CURRENCY, normalizeCurrency } from './currency';
import { formatIsoDate, isValidIsoDate } from './dates';
import {
  CurrencyCode,
  DownPaymentType,
  LoanCalculationType,
  ShareableCalculationValues,
} from './types';

export const CALCULATION_LIMITS = {
  loanAmount: { min: 0.01, max: 100_000_000 },
  interest: { min: 0.01, max: 100 },
  termInYears: { min: 0, max: 100, integer: true },
  termInMonths: { min: 0, max: 11, integer: true },
  downPaymentPercent: { min: 0, max: 100 },
  downPaymentCash: { min: 0, max: 100_000_000 },
  desiredMonthlyPayment: { min: 0.01, max: 1_000_000 },
  additionalMonthlyPayment: { min: 0, max: 1_000_000 },
} as const;

export const MAX_LOAN_AMOUNT = CALCULATION_LIMITS.loanAmount.max;
export const MAX_MONTHLY_PAYMENT = CALCULATION_LIMITS.desiredMonthlyPayment.max;

export const DECIMAL_NUMBER_PATTERN = /^-?(?:\d+\.?\d*|\.\d+)$/;

export const defaultShareValues: ShareableCalculationValues = {
  loanAmount: 300000,
  interest: 3,
  termInYears: 10,
  termInMonths: 0,
  downPayment: 10,
  downPaymentType: DownPaymentType.PERCENT,
  desiredMonthlyPayment: 0,
  additionalMonthlyPayment: 0,
  startDate: formatIsoDate(new Date()),
  calculationType: LoanCalculationType.TERM,
  currency: DEFAULT_CURRENCY,
};

export const normalizeEnum = (value: string | undefined, fallback: string) => (
  value?.toLowerCase() ?? fallback
);

export const parseNumberParam = (
  value: string | null,
  fallback: number,
  { min, max, integer = false }: { min?: number; max?: number; integer?: boolean } = {},
) => {
  if (value === null || value.trim() === '') return fallback;

  const normalized = value.trim();
  if (!DECIMAL_NUMBER_PATTERN.test(normalized)) return fallback;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  if (integer && !Number.isInteger(parsed)) return fallback;
  if (min !== undefined && parsed < min) return fallback;
  if (max !== undefined && parsed > max) return fallback;

  return parsed;
};

export const finiteOrDefault = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeDate = (value: string | undefined, fallback: string) => (
  value && isValidIsoDate(value) ? value : fallback
);

export const isPercentDownPayment = (downPaymentType: DownPaymentType | string): boolean => (
  String(downPaymentType).toLowerCase() === DownPaymentType.PERCENT
);

export const getEffectiveLoanAmount = (
  loanAmount: number,
  downPayment: number,
  downPaymentType: DownPaymentType | string,
) => {
  const reduction = isPercentDownPayment(downPaymentType)
    ? (downPayment / 100) * loanAmount
    : downPayment;
  return Math.max(0, loanAmount - reduction);
};

export const getMinimumAmortisingPayment = (
  loanAmount: number,
  interest: number,
  downPayment: number,
  downPaymentType: DownPaymentType | string,
) => {
  const effectiveLoanAmount = getEffectiveLoanAmount(loanAmount, downPayment, downPaymentType);
  return calculateMinPayment(effectiveLoanAmount, interest);
};

export const normalizeShareableCalculationValues = (
  values: Partial<ShareableCalculationValues>,
  fallbackCurrency: CurrencyCode = DEFAULT_CURRENCY,
): ShareableCalculationValues => {
  const calculationType = normalizeEnum(String(values.calculationType ?? ''), LoanCalculationType.TERM);
  const safeCalculationType = calculationType === LoanCalculationType.PAYMENT
    ? LoanCalculationType.PAYMENT
    : LoanCalculationType.TERM;
  const downPaymentType = normalizeEnum(String(values.downPaymentType ?? ''), DownPaymentType.PERCENT);
  const safeDownPaymentType = downPaymentType === DownPaymentType.CASH
    ? DownPaymentType.CASH
    : DownPaymentType.PERCENT;

  const loanAmount = finiteOrDefault(values.loanAmount, defaultShareValues.loanAmount);
  const safeLoanAmount = Math.min(Math.max(loanAmount, CALCULATION_LIMITS.loanAmount.min), CALCULATION_LIMITS.loanAmount.max);
  const interest = finiteOrDefault(values.interest, defaultShareValues.interest);
  const safeInterest = Math.min(Math.max(interest, CALCULATION_LIMITS.interest.min), CALCULATION_LIMITS.interest.max);
  const termInYears = Number.isInteger(Number(values.termInYears)) ? Number(values.termInYears) : defaultShareValues.termInYears;
  const safeTermInYears = Math.min(Math.max(termInYears, CALCULATION_LIMITS.termInYears.min), CALCULATION_LIMITS.termInYears.max);
  const termInMonths = Number.isInteger(Number(values.termInMonths)) ? Number(values.termInMonths) : defaultShareValues.termInMonths;
  const safeTermInMonths = Math.min(Math.max(termInMonths, CALCULATION_LIMITS.termInMonths.min), CALCULATION_LIMITS.termInMonths.max);
  const downPayment = finiteOrDefault(values.downPayment, defaultShareValues.downPayment);
  const downPaymentLimit = safeDownPaymentType === DownPaymentType.CASH
    ? CALCULATION_LIMITS.downPaymentCash
    : CALCULATION_LIMITS.downPaymentPercent;
  const safeDownPayment = Math.min(Math.max(downPayment, downPaymentLimit.min), downPaymentLimit.max);
  const finalDownPayment = safeDownPaymentType === DownPaymentType.CASH && safeDownPayment > safeLoanAmount ? 0 : safeDownPayment;
  const effectiveLoanAmount = getEffectiveLoanAmount(
    safeLoanAmount,
    finalDownPayment,
    safeDownPaymentType,
  );
  const requestedPayment = Math.max(Number(values.desiredMonthlyPayment ?? 0) || 0, 0);
  const minimumPayment = getMinimumAmortisingPayment(
    safeLoanAmount,
    safeInterest,
    finalDownPayment,
    safeDownPaymentType,
  );
  const desiredMonthlyPayment = safeCalculationType === LoanCalculationType.PAYMENT && requestedPayment < minimumPayment
    ? minimumPayment
    : requestedPayment;
  const requestedAdditionalPayment = Math.max(Number(values.additionalMonthlyPayment ?? 0) || 0, 0);

  return {
    loanAmount: safeLoanAmount,
    interest: safeInterest,
    termInYears: safeCalculationType === LoanCalculationType.TERM && safeTermInYears === 0 && safeTermInMonths === 0 ? 10 : safeTermInYears,
    termInMonths: safeTermInMonths,
    downPayment: finalDownPayment,
    downPaymentType: safeDownPaymentType,
    desiredMonthlyPayment,
    additionalMonthlyPayment: requestedAdditionalPayment > effectiveLoanAmount ? 0 : requestedAdditionalPayment,
    startDate: normalizeDate(values.startDate, defaultShareValues.startDate),
    calculationType: safeCalculationType,
    currency: normalizeCurrency(values.currency, fallbackCurrency),
  };
};
