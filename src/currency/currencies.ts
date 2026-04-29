export interface Currency {
  code: 'GBP' | 'PLN' | 'EUR' | 'USD';
  symbol: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
];

export type CurrencyCode = Currency['code'];
