export const LENDERS = [
  'Nationwide',
  'Halifax',
  'Barclays',
  'HSBC',
  'Lloyds',
  'NatWest',
  'Santander',
  'Virgin Money',
  'Other',
] as const;

export type Lender = typeof LENDERS[number] | string;
