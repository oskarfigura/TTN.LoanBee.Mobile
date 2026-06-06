export const DownPaymentType = {
  PERCENT: 'percent',
  CASH: 'cash',
} as const;

export type DownPaymentType = typeof DownPaymentType[keyof typeof DownPaymentType];

export const LoanCalculationType = {
  TERM: 'term',
  PAYMENT: 'payment',
} as const;

export type LoanCalculationType = typeof LoanCalculationType[keyof typeof LoanCalculationType];

export type CurrencyCode = 'GBP' | 'PLN' | 'EUR' | 'USD';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

export interface AmortisationTableItem {
  itemNo: number;
  date?: string;
  dealId?: string;
  dealName?: string;
  dealStatus?: 'draft' | 'active' | 'completed';
  isProjected?: boolean;
  remaining: string;
  principal: string;
  interest: string;
  ending: string;
}

export interface LoanCalculationInput {
  loanAmount: number;
  interest: number;
  termInYears: number;
  termInMonths: number;
  desiredMonthlyPayment: number;
  calculationType: LoanCalculationType | string;
  downPayment: number;
  downPaymentType: DownPaymentType | string;
  additionalMonthlyPayment: number;
  startDate: string;
}

export interface LoanCalculationResult {
  tableItems: AmortisationTableItem[];
  totalAmountPaid: number;
  totalInterestPaid: number;
  termInYears: number;
  termInMonths: number;
  loanChartMonthlyArray: number[];
  loanChartInterestArray: number[];
  loanChartRemainingArray: number[];
  loanChartLabelArray: string[];
  monthlyPayments: number;
  downPayment: number;
  amount: number;
  interest: number;
  startDate: string;
}

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

export interface UserVisibleMetric {
  id: string;
  labelKey: string;
  value: string;
}

export interface UserVisibleSection {
  id: string;
  metrics: UserVisibleMetric[];
}

export interface CalculationDisplayContract {
  summary: {
    context: 'calculation';
    hero: UserVisibleMetric;
    metrics: UserVisibleMetric[];
  };
  sections: UserVisibleSection[];
  totalMonths: number;
  termDuration: string;
}

export interface AmortisationDisplayRow {
  id: string;
  itemNo: number;
  period: string;
  metrics: UserVisibleMetric[];
}
