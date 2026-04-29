import { CurrencyCode } from './currencies';

export const languageToCurrency = (locale: string): CurrencyCode => {
  const lang = locale.split('-')[0].toLowerCase();
  if (lang === 'pl') return 'PLN';
  return 'GBP';
};
