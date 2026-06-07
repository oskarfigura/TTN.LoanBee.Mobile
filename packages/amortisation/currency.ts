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

// Each currency is formatted in a locale where it is the native currency, so the
// symbol placement, grouping and decimal separators match how that currency is
// actually written: e.g. PLN renders as "1601,68 zł" (suffix, comma decimal),
// not the old en-GB-everywhere "zł1,601.68". GBP/USD/EUR use English-language
// locales to keep the leading-symbol style the rest of the (English) UI expects.
const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  GBP: 'en-GB',
  USD: 'en-US',
  EUR: 'en-IE',
  PLN: 'pl-PL',
};

export const formatCurrency = (amount: number, currency: CurrencyCode | string): string => {
  const code = normalizeCurrency(currency);
  const value = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALES[code], {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  // Intl emits non-breaking / narrow-no-break spaces (e.g. "300 000,00 zł").
  // Normalise to a regular space so output is deterministic across ICU versions
  // (Node in tests vs Hermes on-device) and free of invisible characters.
  return formatted.replace(/[\u00A0\u202F]/g, ' ');
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
