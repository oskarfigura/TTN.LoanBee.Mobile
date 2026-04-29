import { CurrencyCode, CURRENCIES } from './currencies';

export const formatCurrency = (amount: number, currency: CurrencyCode): string => {
  const curr = CURRENCIES.find(c => c.code === currency);
  const symbol = curr?.symbol ?? '£';
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
};

export const formatCurrencyCompact = (amount: number, currency: CurrencyCode): string => {
  const curr = CURRENCIES.find(c => c.code === currency);
  const symbol = curr?.symbol ?? '£';
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
