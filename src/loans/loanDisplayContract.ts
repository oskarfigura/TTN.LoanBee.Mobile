import { CurrencyCode } from '@/currency/currencies';
import {
  LoanDashboardProgress,
  LoanInsightProgress,
  LoanInsightSummary,
  buildSavedLoanDashboardProgress,
  buildSavedLoanSummary,
} from '@/loans/loanInsightSummary';
import { LoanResult } from '@/results/loanResultRoute';
import { SavedLoan } from '@/types/SavedLoan';
import {
  buildAmortisationDisplayRows as buildPackageAmortisationDisplayRows,
  buildCalculationDisplayContract as buildPackageCalculationDisplayContract,
} from '@amortisation';

export type UserVisibleMetric = {
  id: string;
  labelKey: string;
  value: string;
};

export type UserVisibleSection = {
  id: string;
  metrics: UserVisibleMetric[];
};

export type UserVisibleLoanSummary = Omit<LoanInsightSummary, 'hero' | 'metrics' | 'progress'> & {
  hero: UserVisibleMetric;
  metrics: UserVisibleMetric[];
  progress?: Omit<LoanInsightProgress, 'metrics'> & {
    metrics: UserVisibleMetric[];
  };
};

export type CalculationDisplayContract = {
  summary: UserVisibleLoanSummary;
  sections: UserVisibleSection[];
  totalMonths: number;
  termDuration: string;
};

export type SavedLoanDisplayContract = {
  summary: UserVisibleLoanSummary;
  dashboardProgress: LoanDashboardProgress[];
  dashboardMetrics: UserVisibleMetric[];
};

export type AmortisationDisplayRow = {
  id: string;
  itemNo: number;
  period: string;
  metrics: UserVisibleMetric[];
};

const savedMetricIdByLabelKey: Record<string, string> = {
  'mortgage.currentBalance': 'currentBalance',
  'results.monthlyPayment': 'monthlyPayment',
  'calculator.interestRate': 'interestRate',
  'results.payoffDate': 'payoffDate',
  'results.totalInterest': 'totalInterest',
  'results.totalCost': 'totalCost',
  'mortgage.estimatedInterestPaid': 'estimatedInterestPaid',
  'mortgage.estimatedSavings': 'estimatedSavings',
  'mortgage.paidSoFar': 'paidSoFar',
};

const dashboardMetricKeys = [
  'mortgage.currentBalance',
  'results.monthlyPayment',
  'results.payoffDate',
];

const makeMetric = (id: string, labelKey: string, value: string): UserVisibleMetric => ({
  id,
  labelKey,
  value,
});

const getSavedMetricId = (labelKey: string, index: number): string => (
  savedMetricIdByLabelKey[labelKey] ?? `${labelKey}-${index}`
);

const addIdsToSavedSummary = (summary: LoanInsightSummary): UserVisibleLoanSummary => ({
  ...summary,
  hero: makeMetric(getSavedMetricId(summary.hero.labelKey, -1), summary.hero.labelKey, summary.hero.value),
  metrics: summary.metrics.map((metric, index) => (
    makeMetric(getSavedMetricId(metric.labelKey, index), metric.labelKey, metric.value)
  )),
  progress: summary.progress ? {
    ...summary.progress,
    metrics: summary.progress.metrics.map((metric, index) => (
      makeMetric(getSavedMetricId(metric.labelKey, index), metric.labelKey, metric.value)
    )),
  } : undefined,
});

export const buildCalculationDisplayContract = buildPackageCalculationDisplayContract as (args: {
  result: LoanResult;
  startDate: string;
  currency: CurrencyCode;
  locale?: string;
  additionalMonthlyPayment?: number;
  yearsLabel?: string;
  monthsLabel?: string;
}) => CalculationDisplayContract;

export const buildSavedLoanDisplayContract = ({
  loan,
  result,
  asOf = new Date(),
  locale,
}: {
  loan: SavedLoan;
  result: LoanResult;
  asOf?: Date;
  locale?: string;
}): SavedLoanDisplayContract => {
  const summary = addIdsToSavedSummary(buildSavedLoanSummary(loan, result, asOf, locale));
  const candidates = [summary.hero, ...summary.metrics, ...(summary.progress?.metrics ?? [])];
  const seenKeys = new Set<string>();
  const dashboardMetrics = dashboardMetricKeys
    .map(key => candidates.find(metric => metric.labelKey === key))
    .filter((metric): metric is UserVisibleMetric => {
      if (!metric || seenKeys.has(metric.labelKey)) return false;
      seenKeys.add(metric.labelKey);
      return true;
    });

  return {
    summary,
    dashboardProgress: buildSavedLoanDashboardProgress(loan, result, asOf),
    dashboardMetrics,
  };
};

export const buildAmortisationDisplayRows = buildPackageAmortisationDisplayRows as (args: {
  items: LoanResult['tableItems'];
  startDate: string;
  currency: CurrencyCode;
  language: string;
}) => AmortisationDisplayRow[];
