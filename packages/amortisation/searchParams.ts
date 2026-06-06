import { normalizeCurrency } from './currency';
import {
  CALCULATION_LIMITS,
  defaultShareValues,
  normalizeDate,
  normalizeShareableCalculationValues,
  parseNumberParam,
} from './normalise';
import {
  CurrencyCode,
  DownPaymentType,
  LoanCalculationType,
  ShareableCalculationValues,
} from './types';

export const WEB_CALCULATOR_URL = 'https://www.loanamortisationcalculator.com/';
export const LOANBEE_APP_SCHEME = 'loanbee://calculator/share';

export const LOAN_QUERY_PARAM_KEYS = {
  loanAmount: 'amount',
  interest: 'interest',
  termInYears: 'years',
  termInMonths: 'months',
  downPayment: 'downPayment',
  downPaymentType: 'downPaymentType',
  desiredMonthlyPayment: 'payment',
  additionalMonthlyPayment: 'extra',
  startDate: 'startDate',
  calculationType: 'mode',
  currency: 'currency',
} as const;

export const MOBILE_SHARE_QUERY_PARAM_KEYS = {
  currency: 'currency',
  source: 'source',
  share: 'share',
} as const;

export interface ShareSearchParamOptions {
  includeMobileMetadata?: boolean;
  fallbackCurrency?: CurrencyCode;
}

export const getCalculationShareSearchParams = (
  values: ShareableCalculationValues,
  { includeMobileMetadata = false, fallbackCurrency }: ShareSearchParamOptions = {},
) => {
  const normalized = normalizeShareableCalculationValues(values, fallbackCurrency);
  const params = new URLSearchParams();

  params.set(LOAN_QUERY_PARAM_KEYS.loanAmount, String(normalized.loanAmount));
  params.set(LOAN_QUERY_PARAM_KEYS.interest, String(normalized.interest));
  params.set(LOAN_QUERY_PARAM_KEYS.downPayment, String(normalized.downPayment));
  params.set(LOAN_QUERY_PARAM_KEYS.downPaymentType, String(normalized.downPaymentType));
  params.set(LOAN_QUERY_PARAM_KEYS.startDate, normalized.startDate);
  params.set(LOAN_QUERY_PARAM_KEYS.calculationType, String(normalized.calculationType));
  params.set(LOAN_QUERY_PARAM_KEYS.currency, String(normalized.currency));

  if (includeMobileMetadata) {
    params.set(MOBILE_SHARE_QUERY_PARAM_KEYS.source, 'mobile');
    params.set(MOBILE_SHARE_QUERY_PARAM_KEYS.share, '1');
  }

  if (normalized.calculationType === LoanCalculationType.PAYMENT) {
    params.set(LOAN_QUERY_PARAM_KEYS.desiredMonthlyPayment, String(normalized.desiredMonthlyPayment ?? 0));
  } else {
    params.set(LOAN_QUERY_PARAM_KEYS.termInYears, String(normalized.termInYears));
    params.set(LOAN_QUERY_PARAM_KEYS.termInMonths, String(normalized.termInMonths));
    if ((normalized.additionalMonthlyPayment ?? 0) > 0) {
      params.set(LOAN_QUERY_PARAM_KEYS.additionalMonthlyPayment, String(normalized.additionalMonthlyPayment));
    }
  }

  return params;
};

export const getCalculationWebShareUrl = (values: ShareableCalculationValues) => (
  `${WEB_CALCULATOR_URL}?${getCalculationShareSearchParams(values).toString()}`
);

export const getCalculationAppShareUrl = (values: ShareableCalculationValues) => (
  `${LOANBEE_APP_SCHEME}?${getCalculationShareSearchParams(values, { includeMobileMetadata: true }).toString()}`
);

export const getShareableCalculationValuesFromParams = (
  searchParams: URLSearchParams,
  fallbackCurrency?: CurrencyCode,
): ShareableCalculationValues => {
  const downPaymentType = searchParams.get(LOAN_QUERY_PARAM_KEYS.downPaymentType) === DownPaymentType.CASH
    ? DownPaymentType.CASH
    : DownPaymentType.PERCENT;
  const calculationType = searchParams.get(LOAN_QUERY_PARAM_KEYS.calculationType) === LoanCalculationType.PAYMENT
    ? LoanCalculationType.PAYMENT
    : LoanCalculationType.TERM;
  const loanAmount = parseNumberParam(searchParams.get(LOAN_QUERY_PARAM_KEYS.loanAmount), defaultShareValues.loanAmount, CALCULATION_LIMITS.loanAmount);
  const downPayment = parseNumberParam(
    searchParams.get(LOAN_QUERY_PARAM_KEYS.downPayment),
    defaultShareValues.downPayment,
    downPaymentType === DownPaymentType.CASH ? CALCULATION_LIMITS.downPaymentCash : CALCULATION_LIMITS.downPaymentPercent,
  );
  const effectiveLoanAmount = loanAmount - (
    downPaymentType === DownPaymentType.PERCENT ? (downPayment / 100) * loanAmount : downPayment
  );
  const desiredMonthlyPayment = parseNumberParam(
    searchParams.get(LOAN_QUERY_PARAM_KEYS.desiredMonthlyPayment),
    defaultShareValues.desiredMonthlyPayment ?? 0,
    CALCULATION_LIMITS.desiredMonthlyPayment,
  );
  const additionalMonthlyPayment = parseNumberParam(
    searchParams.get(LOAN_QUERY_PARAM_KEYS.additionalMonthlyPayment),
    defaultShareValues.additionalMonthlyPayment ?? 0,
    CALCULATION_LIMITS.additionalMonthlyPayment,
  );
  const termInYears = parseNumberParam(searchParams.get(LOAN_QUERY_PARAM_KEYS.termInYears), defaultShareValues.termInYears, CALCULATION_LIMITS.termInYears);
  const termInMonths = parseNumberParam(searchParams.get(LOAN_QUERY_PARAM_KEYS.termInMonths), defaultShareValues.termInMonths, CALCULATION_LIMITS.termInMonths);

  return normalizeShareableCalculationValues({
    loanAmount,
    interest: parseNumberParam(searchParams.get(LOAN_QUERY_PARAM_KEYS.interest), defaultShareValues.interest, CALCULATION_LIMITS.interest),
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
    startDate: normalizeDate(searchParams.get(LOAN_QUERY_PARAM_KEYS.startDate) ?? undefined, defaultShareValues.startDate),
    calculationType,
    currency: normalizeCurrency(searchParams.get(LOAN_QUERY_PARAM_KEYS.currency) ?? undefined, fallbackCurrency),
  }, fallbackCurrency);
};

export const buildLoanBeeDeepLink = (search: string) => {
  if (!search) return LOANBEE_APP_SCHEME;
  return `${LOANBEE_APP_SCHEME}${search.startsWith('?') ? search : `?${search}`}`;
};

export const CALCULATION_QUERY_KEYS = new Set<string>(Object.values(LOAN_QUERY_PARAM_KEYS));

export const isSharedCalculationLink = (searchParams: URLSearchParams) => {
  const isExplicitShare =
    searchParams.get(MOBILE_SHARE_QUERY_PARAM_KEYS.share) === '1'
    || searchParams.get(MOBILE_SHARE_QUERY_PARAM_KEYS.source) === 'mobile';

  if (isExplicitShare) return true;

  return [...CALCULATION_QUERY_KEYS].some(key => searchParams.has(key));
};
