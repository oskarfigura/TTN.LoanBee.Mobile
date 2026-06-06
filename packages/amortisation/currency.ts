import { Currency, CurrencyCode } from './types';

export const CURRENCIES: Currency[] = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'GBP';

export const isCurrencyCode = (value: unknown): value is CurrencyCode => (
  typeof value === 'string' && CURRENCIES.some(currency => currency.code === value)
);

export const normalizeCurrency = (value: unknown, fallback: CurrencyCode = DEFAULT_CURRENCY): CurrencyCode => (
  isCurrencyCode(value) ? value : fallback
);

export const getCurrencySymbol = (currency: CurrencyCode | string): string => (
  CURRENCIES.find(item => item.code === currency)?.symbol ?? '£'
);

export const formatCurrency = (amount: number, currency: CurrencyCode | string): string => {
  const symbol = getCurrencySymbol(currency);
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
};

export const formatCurrencyCompact = (amount: number, currency: CurrencyCode | string): string => {
  const symbol = getCurrencySymbol(currency);
  const abs = Math.abs(amount);
  let formatted: string;

  if (abs >= 1_000_000) {
    formatted = `${(abs / 1_000_000).toFixed(2)}M`;
  } else if (abs >= 1_000) {
    formatted = `${(abs / 1_000).toFixed(1)}k`;
  } else {
    formatted = abs.toFixed(2);
  }

  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
};
