import { formatCurrency } from './currency';
import {
  formatAmortisationPeriodLabel,
  formatFriendlyMonthYear,
  formatPayoffDate,
} from './dates';
import {
  AmortisationDisplayRow,
  AmortisationTableItem,
  CalculationDisplayContract,
  CurrencyCode,
  LoanCalculationResult,
  UserVisibleMetric,
} from './types';

const calculationMetricIds = [
  'loanAmount',
  'payoffDate',
  'interestRate',
  'totalInterest',
  'totalCost',
];

const makeMetric = (id: string, labelKey: string, value: string): UserVisibleMetric => ({
  id,
  labelKey,
  value,
});

const getMetric = (metrics: UserVisibleMetric[], id: string): UserVisibleMetric | undefined => (
  metrics.find(metric => metric.id === id)
);

const formatPercent = (value: number) => `${Number.isFinite(value) ? value : 0}%`;

const formatTermDuration = (months: number, yrsLabel: string, moLabel: string): string => {
  const years = Math.floor(months / 12);
  const mo = months % 12;
  if (years === 0) return `${mo} ${moLabel}`;
  if (mo === 0) return `${years} ${yrsLabel}`;
  return `${years} ${yrsLabel} ${mo} ${moLabel}`;
};

export const buildCalculationSummary = (
  result: LoanCalculationResult,
  startDate: string,
  currency: CurrencyCode,
  locale?: string,
) => {
  const totalMonths = Math.max(result.tableItems.length, result.termInYears * 12 + result.termInMonths);

  return {
    context: 'calculation' as const,
    hero: {
      labelKey: 'results.monthlyPayment',
      value: formatCurrency(result.monthlyPayments, currency),
    },
    metrics: [
      {
        labelKey: 'calculator.loanAmount',
        value: formatCurrency(result.amount, currency),
      },
      {
        labelKey: 'results.payoffDate',
        value: formatPayoffDate(startDate, totalMonths, locale),
      },
      {
        labelKey: 'calculator.interestRate',
        value: formatPercent(result.interest),
      },
      {
        labelKey: 'results.totalInterest',
        value: formatCurrency(result.totalInterestPaid, currency),
      },
      {
        labelKey: 'results.totalCost',
        value: formatCurrency(result.totalAmountPaid, currency),
      },
    ],
  };
};

export const buildCalculationDisplayContract = ({
  result,
  startDate,
  currency,
  locale,
  additionalMonthlyPayment = 0,
  yearsLabel = 'yrs',
  monthsLabel = 'mo',
}: {
  result: LoanCalculationResult;
  startDate: string;
  currency: CurrencyCode;
  locale?: string;
  additionalMonthlyPayment?: number;
  yearsLabel?: string;
  monthsLabel?: string;
}): CalculationDisplayContract => {
  const rawSummary = buildCalculationSummary(result, startDate, currency, locale);
  const summary = {
    ...rawSummary,
    hero: makeMetric('monthlyPayment', rawSummary.hero.labelKey, rawSummary.hero.value),
    metrics: rawSummary.metrics.map((metric, index) => (
      makeMetric(calculationMetricIds[index] ?? metric.labelKey, metric.labelKey, metric.value)
    )),
  };
  const totalMonths = Math.max(
    result.tableItems.length,
    result.termInYears * 12 + result.termInMonths,
  );
  const monthlyPayment = summary.hero;
  const loanAmount = getMetric(summary.metrics, 'loanAmount');
  const payoffDate = getMetric(summary.metrics, 'payoffDate');
  const interestRate = getMetric(summary.metrics, 'interestRate');
  const totalInterest = getMetric(summary.metrics, 'totalInterest');
  const totalCost = getMetric(summary.metrics, 'totalCost');
  const loanDetailsMetrics = [
    loanAmount,
    interestRate,
    additionalMonthlyPayment > 0
      ? makeMetric(
        'additionalMonthlyPayment',
        'calculator.additionalPayment',
        formatCurrency(additionalMonthlyPayment, currency),
      )
      : undefined,
  ].filter((metric): metric is UserVisibleMetric => Boolean(metric));

  return {
    summary,
    totalMonths,
    termDuration: formatTermDuration(totalMonths, yearsLabel, monthsLabel),
    sections: [
      {
        id: 'keyMetrics',
        metrics: [monthlyPayment, payoffDate, totalInterest, totalCost]
          .filter((metric): metric is UserVisibleMetric => Boolean(metric)),
      },
      {
        id: 'loanDetails',
        metrics: loanDetailsMetrics,
      },
    ],
  };
};

export const buildAmortisationDisplayRows = ({
  items,
  startDate,
  currency,
  language,
}: {
  items: AmortisationTableItem[];
  startDate: string;
  currency: CurrencyCode;
  language: string;
}): AmortisationDisplayRow[] => (
  items.map(item => ({
    id: String(item.itemNo),
    itemNo: item.itemNo,
    period: item.date
      ? formatFriendlyMonthYear(item.date, language)
      : formatAmortisationPeriodLabel(startDate, item.itemNo, language),
    metrics: [
      makeMetric('openingBalance', 'results.openingBalance', formatCurrency(+item.remaining, currency)),
      makeMetric('principal', 'results.principal', formatCurrency(+item.principal, currency)),
      makeMetric('interest', 'results.interest', formatCurrency(+item.interest, currency)),
      makeMetric('closingBalance', 'results.closingBalance', formatCurrency(+item.ending, currency)),
    ],
  }))
);
