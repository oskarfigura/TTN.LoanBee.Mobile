import { DownPaymentType } from '@/core/DownPaymentType';
import { LoanCalculationType } from '@/core/LoanCalculationType';
import { CurrencyCode, CURRENCIES } from '@/currency/currencies';
import { getEffectiveLoanAmount, getMinimumAmortisingPayment } from '@/utils/paymentValidation';

const WEB_CALCULATOR_URL = 'https://www.loanamortisationcalculator.com/';

const LIMITS = {
  loanAmount: { min: 0.01, max: 1000000000 },
  interest: { min: 0.01, max: 100 },
  termInYears: { min: 0, max: 100, integer: true },
  termInMonths: { min: 0, max: 11, integer: true },
  downPaymentPercent: { min: 0, max: 100 },
  downPaymentCash: { min: 0, max: 1000000000 },
  desiredMonthlyPayment: { min: 0.01, max: 10000000 },
  additionalMonthlyPayment: { min: 0, max: 10000000 },
} as const;

const DECIMAL_NUMBER_PATTERN = /^-?(?:\d+\.?\d*|\.\d+)$/;
const CURRENCY_CODES = new Set(CURRENCIES.map(currency => currency.code));

export interface ShareableCalculationValues {
  loanAmount: number;
  interest: number;
  termInYears: number;
  termInMonths: number;
  downPayment: number;
  downPaymentType: DownPaymentType | string;
  desiredMonthlyPayment?: number | null;
  additionalMonthlyPayment?: number | null;
  startDate: string;
  calculationType: LoanCalculationType | string;
  currency?: CurrencyCode | string;
}

const defaultShareValues: ShareableCalculationValues = {
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
  currency: 'GBP',
};

const normalizeEnum = (value: string | undefined, fallback: string) => value?.toLowerCase() ?? fallback;

const normalizeDate = (value: string | undefined, fallback: string) => {
  if (!value) return fallback;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isInteger(part))) return fallback;

  const [year, month, day] = parts;
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return fallback;
  }

  return [
    String(year).padStart(4, '0'),
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
};

const parseNumberParam = (
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

const normalizeCurrency = (value: string | undefined): CurrencyCode => (
  value && CURRENCY_CODES.has(value as CurrencyCode) ? value as CurrencyCode : 'GBP'
);

const finiteOrDefault = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeShareableCalculationValues = (
  values: Partial<ShareableCalculationValues>,
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
  const safeLoanAmount = Math.min(Math.max(loanAmount, LIMITS.loanAmount.min), LIMITS.loanAmount.max);
  const interest = finiteOrDefault(values.interest, defaultShareValues.interest);
  const safeInterest = Math.min(Math.max(interest, LIMITS.interest.min), LIMITS.interest.max);
  const termInYears = Number.isInteger(Number(values.termInYears)) ? Number(values.termInYears) : defaultShareValues.termInYears;
  const safeTermInYears = Math.min(Math.max(termInYears, LIMITS.termInYears.min), LIMITS.termInYears.max);
  const termInMonths = Number.isInteger(Number(values.termInMonths)) ? Number(values.termInMonths) : defaultShareValues.termInMonths;
  const safeTermInMonths = Math.min(Math.max(termInMonths, LIMITS.termInMonths.min), LIMITS.termInMonths.max);

  const downPayment = finiteOrDefault(values.downPayment, defaultShareValues.downPayment);
  const downPaymentLimit = safeDownPaymentType === DownPaymentType.CASH
    ? LIMITS.downPaymentCash
    : LIMITS.downPaymentPercent;
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
    currency: normalizeCurrency(String(values.currency ?? 'GBP')),
  };
};

interface ShareSearchParamOptions {
  includeMobileMetadata?: boolean;
}

export const getCalculationShareSearchParams = (
  values: ShareableCalculationValues,
  { includeMobileMetadata = false }: ShareSearchParamOptions = {},
) => {
  const normalized = normalizeShareableCalculationValues(values);
  const params = new URLSearchParams();

  params.set('amount', String(normalized.loanAmount));
  params.set('interest', String(normalized.interest));
  params.set('downPayment', String(normalized.downPayment));
  params.set('downPaymentType', String(normalized.downPaymentType));
  params.set('startDate', normalized.startDate);
  params.set('mode', String(normalized.calculationType));
  params.set('currency', String(normalized.currency));

  if (includeMobileMetadata) {
    params.set('source', 'mobile');
    params.set('share', '1');
  }

  if (normalized.calculationType === LoanCalculationType.PAYMENT) {
    params.set('payment', String(normalized.desiredMonthlyPayment ?? 0));
  } else {
    params.set('years', String(normalized.termInYears));
    params.set('months', String(normalized.termInMonths));
    if ((normalized.additionalMonthlyPayment ?? 0) > 0) {
      params.set('extra', String(normalized.additionalMonthlyPayment));
    }
  }

  return params;
};

export const getCalculationWebShareUrl = (values: ShareableCalculationValues) => (
  `${WEB_CALCULATOR_URL}?${getCalculationShareSearchParams(values).toString()}`
);

export const getCalculationAppShareUrl = (values: ShareableCalculationValues) => (
  `loanbee://calculator/share?${getCalculationShareSearchParams(values, { includeMobileMetadata: true }).toString()}`
);

export const getShareableCalculationValuesFromParams = (
  searchParams: URLSearchParams,
): ShareableCalculationValues => {
  const downPaymentType = searchParams.get('downPaymentType') === DownPaymentType.CASH
    ? DownPaymentType.CASH
    : DownPaymentType.PERCENT;
  const calculationType = searchParams.get('mode') === LoanCalculationType.PAYMENT
    ? LoanCalculationType.PAYMENT
    : LoanCalculationType.TERM;
  const loanAmount = parseNumberParam(searchParams.get('amount'), defaultShareValues.loanAmount, LIMITS.loanAmount);
  const downPayment = parseNumberParam(
    searchParams.get('downPayment'),
    defaultShareValues.downPayment,
    downPaymentType === DownPaymentType.CASH ? LIMITS.downPaymentCash : LIMITS.downPaymentPercent,
  );
  const effectiveLoanAmount = loanAmount - (
    downPaymentType === DownPaymentType.PERCENT ? (downPayment / 100) * loanAmount : downPayment
  );
  const desiredMonthlyPayment = parseNumberParam(
    searchParams.get('payment'),
    defaultShareValues.desiredMonthlyPayment ?? 0,
    LIMITS.desiredMonthlyPayment,
  );
  const additionalMonthlyPayment = parseNumberParam(
    searchParams.get('extra'),
    defaultShareValues.additionalMonthlyPayment ?? 0,
    LIMITS.additionalMonthlyPayment,
  );
  const termInYears = parseNumberParam(searchParams.get('years'), defaultShareValues.termInYears, LIMITS.termInYears);
  const termInMonths = parseNumberParam(searchParams.get('months'), defaultShareValues.termInMonths, LIMITS.termInMonths);

  return normalizeShareableCalculationValues({
    loanAmount,
    interest: parseNumberParam(searchParams.get('interest'), defaultShareValues.interest, LIMITS.interest),
    termInYears,
    termInMonths,
    downPayment: downPaymentType === DownPaymentType.CASH && downPayment > loanAmount ? 0 : downPayment,
    downPaymentType,
    desiredMonthlyPayment: calculationType === LoanCalculationType.PAYMENT && desiredMonthlyPayment > effectiveLoanAmount
      ? defaultShareValues.desiredMonthlyPayment
      : desiredMonthlyPayment,
    additionalMonthlyPayment: calculationType === LoanCalculationType.TERM && additionalMonthlyPayment > effectiveLoanAmount
      ? defaultShareValues.additionalMonthlyPayment
      : additionalMonthlyPayment,
    startDate: normalizeDate(searchParams.get('startDate') ?? undefined, defaultShareValues.startDate),
    calculationType,
    currency: normalizeCurrency(searchParams.get('currency') ?? undefined),
  });
};
