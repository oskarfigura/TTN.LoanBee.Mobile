import { CurrencyCode } from '@/currency/currencies';
import { formatCurrency } from '@/currency/format';
import { buildScenarioRemainingArray, computeLoanOverpayments, LumpSumEntry } from '@/loans/loanOverpaymentCalc';
import { buildMortgageProjection } from '@/mortgage/projection';
import { getMortgageTrackerSummary, getPublishedDeals } from '@/mortgage/tracker';
import { LoanResult } from '@/results/loanResultRoute';
import { LoanDeal, SavedLoan } from '@/types/SavedLoan';
import { advanceMonthsClamped, formatFriendlyDate, formatIsoDate, monthsBetween, parseDateLabelValue } from '@/utils/date';

export type LoanInsightContext = 'saved' | 'calculation';

export interface LoanInsightMetric {
  labelKey: string;
  value: string;
}

export interface LoanInsightCaption {
  key: string;
  values?: Record<string, number | string>;
}

export interface LoanInsightProgress {
  labelKey: string;
  value: number;
  caption: LoanInsightCaption;
  startCaption?: LoanInsightCaption;
  endCaption?: LoanInsightCaption;
  metrics: LoanInsightMetric[];
  savingsAmount?: string;
  interestSaved?: number;
  termSavedMonths?: number;
}

export interface LoanDashboardProgress {
  labelKey: string;
  value: number;
  caption: LoanInsightCaption;
}

export interface LoanInsightSummary {
  context: LoanInsightContext;
  hero: LoanInsightMetric;
  metrics: LoanInsightMetric[];
  progress?: LoanInsightProgress;
}

export interface SavedLoanDisplayDetails {
  currentDeal?: LoanDeal;
  lender?: string;
}

const clamp = (value: number) => Math.max(0, Math.min(value, 1));

const formatPercent = (value: number) => `${Number.isFinite(value) ? value : 0}%`;

export const formatPayoffDate = (startDate: string, totalMonths: number, locale?: string) => {
  const date = parseDateLabelValue(startDate);
  if (!date) return '—';

  advanceMonthsClamped(date, Math.max(totalMonths, 0));

  return formatFriendlyDate(formatIsoDate(date), locale);
};

const getPrincipalAmount = (result: LoanResult) => Math.max(result.amount - result.downPayment, 0);

const getCurrentBalance = (result: LoanResult, startDate: string, asOf: Date) => {
  const principalAmount = getPrincipalAmount(result);
  const elapsed = Math.max(0, monthsBetween(startDate, asOf));
  const currentBalanceIndex = Math.min(elapsed, result.tableItems.length) - 1;
  const currentBalanceCandidate = currentBalanceIndex >= 0
    ? Number(result.tableItems[currentBalanceIndex]?.ending ?? principalAmount)
    : principalAmount;

  return Number.isFinite(currentBalanceCandidate) ? currentBalanceCandidate : principalAmount;
};

export const buildSavedLoanDisplayDetails = (
  loan: SavedLoan,
  asOf = new Date(),
): SavedLoanDisplayDetails => {
  if (loan.category !== 'mortgage') {
    return { lender: loan.lender };
  }

  const mortgageSummary = getMortgageTrackerSummary(loan, asOf);
  const firstPublishedDeal = getPublishedDeals(loan)[0];

  return {
    currentDeal: mortgageSummary.currentDeal,
    lender: mortgageSummary.currentDeal?.lender ?? firstPublishedDeal?.lender ?? loan.lender,
  };
};

const buildSavedProgress = (
  loan: SavedLoan,
  result: LoanResult,
  asOf: Date,
): LoanInsightProgress => {
  if (loan.category === 'mortgage') {
    const mortgageSummary = getMortgageTrackerSummary(loan, asOf);
    const mortgageProjection = buildMortgageProjection(loan, asOf);
    const interestPaidEstimate = +mortgageProjection.points
      .filter(point => !point.isProjected)
      .reduce((sum, point) => sum + point.interest, 0)
      .toFixed(2);
    const progress = clamp(mortgageSummary.balanceProgress);

    return {
      labelKey: 'mortgage.balancePaidShort',
      value: progress,
      caption: {
        key: 'mortgage.balancePaid',
        values: { percent: Math.round(progress * 100) },
      },
      startCaption: {
        key: 'mortgage.paidAmount',
        values: { amount: formatCurrency(mortgageSummary.principalPaid, loan.currency) },
      },
      endCaption: {
        key: 'mortgage.totalAmount',
        values: { amount: formatCurrency(mortgageSummary.originalBalance, loan.currency) },
      },
      metrics: [
        {
          labelKey: 'mortgage.estimatedInterestPaid',
          value: formatCurrency(interestPaidEstimate, loan.currency),
        },
        ...(mortgageProjection.overpaymentSavingsEstimate > 0 ? [{
          labelKey: 'mortgage.estimatedSavings',
          value: formatCurrency(mortgageProjection.overpaymentSavingsEstimate, loan.currency),
        }] : []),
      ],
    };
  }

  const additionalPayment = loan.formSnapshot.additionalMonthlyPayment ?? 0;
  const lumpEntries: LumpSumEntry[] = (loan.events ?? [])
    .filter(e => e.type === 'lumpOverpayment' && !e.dealId && (e.amount ?? 0) > 0)
    .map(e => ({ date: e.date, amount: e.amount ?? 0 }));
  const hasOverpayment = additionalPayment > 0 || lumpEntries.length > 0;
  const overpaymentResult = hasOverpayment
    ? computeLoanOverpayments(loan.formSnapshot, additionalPayment, lumpEntries)
    : null;
  const elapsed = Math.max(0, monthsBetween(loan.formSnapshot.startDate, asOf));
  const total = overpaymentResult
    ? Math.max(overpaymentResult.scenario.totalTermInMonths, 1)
    : Math.max(loan.resultSnapshot.totalTermInMonths, result.tableItems.length, 1);
  const progress = clamp(elapsed / total);
  const remaining = Math.max(0, total - elapsed);
  const principalAmount = getPrincipalAmount(result);
  const scenarioRemaining = overpaymentResult
    ? buildScenarioRemainingArray(loan.formSnapshot, additionalPayment, lumpEntries)
    : null;
  const currentBalance = scenarioRemaining
    ? scenarioRemaining[Math.min(elapsed, scenarioRemaining.length - 1)] ?? 0
    : getCurrentBalance(result, loan.formSnapshot.startDate, asOf);
  const paidSoFar = Math.max(0, principalAmount - currentBalance);
  const savings = overpaymentResult?.interestSaved ?? 0;
  const termSaved = overpaymentResult?.monthsSaved ?? 0;

  return {
    labelKey: 'saved.loanProgress',
    value: progress,
    caption: remaining > 0
      ? { key: 'saved.progress', values: { months: remaining, total } }
      : { key: 'saved.completed' },
    metrics: [
      {
        labelKey: 'mortgage.currentBalance',
        value: formatCurrency(currentBalance, loan.currency),
      },
      {
        labelKey: 'mortgage.paidSoFar',
        value: formatCurrency(paidSoFar, loan.currency),
      },
    ],
    savingsAmount: hasOverpayment && savings > 0
      ? formatCurrency(savings, loan.currency)
      : undefined,
    interestSaved: hasOverpayment && savings > 0 ? savings : undefined,
    termSavedMonths: hasOverpayment && termSaved > 0 ? termSaved : undefined,
  };
};

export const buildSavedLoanDashboardProgress = (
  loan: SavedLoan,
  result: LoanResult,
  asOf = new Date(),
): LoanDashboardProgress[] => {
  const totalMonths = Math.max(loan.resultSnapshot.totalTermInMonths, result.tableItems.length, 1);
  const elapsedMonths = Math.min(Math.max(0, monthsBetween(loan.formSnapshot.startDate, asOf)), totalMonths);
  const principalAmount = getPrincipalAmount(result);
  const mortgageSummary = loan.category === 'mortgage'
    ? getMortgageTrackerSummary(loan, asOf)
    : null;
  const paidAmount = mortgageSummary
    ? mortgageSummary.principalPaid
    : Math.max(0, principalAmount - getCurrentBalance(result, loan.formSnapshot.startDate, asOf));
  const valueTotal = mortgageSummary?.originalBalance ?? principalAmount;

  return [
    {
      labelKey: 'mortgage.timeProgress',
      value: clamp(elapsedMonths / totalMonths),
      caption: {
        key: 'mortgage.timeElapsed',
        values: { elapsed: elapsedMonths, total: totalMonths },
      },
    },
    {
      labelKey: 'mortgage.moneyProgress',
      value: valueTotal > 0 ? clamp(paidAmount / valueTotal) : 0,
      caption: {
        key: 'mortgage.valuePaid',
        values: {
          paid: formatCurrency(paidAmount, loan.currency),
          total: formatCurrency(valueTotal, loan.currency),
        },
      },
    },
  ];
};

export const buildCalculationSummary = (
  result: LoanResult,
  startDate: string,
  currency: CurrencyCode,
  locale?: string,
): LoanInsightSummary => {
  const totalMonths = Math.max(result.tableItems.length, result.termInYears * 12 + result.termInMonths);

  return {
    context: 'calculation',
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

export const buildSavedLoanSummary = (
  loan: SavedLoan,
  result: LoanResult,
  asOf = new Date(),
  locale?: string,
): LoanInsightSummary => {
  const mortgageSummary = loan.category === 'mortgage'
    ? getMortgageTrackerSummary(loan, asOf)
    : null;
  const mortgageProjection = mortgageSummary
    ? buildMortgageProjection(loan, asOf)
    : null;
  const currentDeal = mortgageSummary?.currentDeal;
  const totalMonths = Math.max(loan.resultSnapshot.totalTermInMonths, result.tableItems.length);
  const monthlyPayment = currentDeal?.monthlyPayment ?? loan.resultSnapshot.monthlyPayments;
  const interestRate = currentDeal?.interestRate ?? loan.formSnapshot.interest;
  const payoffDate = mortgageProjection?.projectedEndDate
    ? formatFriendlyDate(mortgageProjection.projectedEndDate, locale)
    : formatPayoffDate(loan.formSnapshot.startDate, totalMonths, locale);

  return {
    context: 'saved',
    hero: mortgageSummary
      ? {
        labelKey: 'mortgage.currentBalance',
        value: formatCurrency(mortgageSummary.currentBalance, loan.currency),
      }
      : {
        labelKey: 'results.payoffDate',
        value: payoffDate,
      },
    metrics: [
      {
        labelKey: 'results.monthlyPayment',
        value: formatCurrency(monthlyPayment, loan.currency),
      },
      {
        labelKey: 'calculator.interestRate',
        value: formatPercent(interestRate),
      },
      ...(mortgageSummary ? [{
        labelKey: 'results.payoffDate',
        value: payoffDate,
      }] : []),
      {
        labelKey: 'results.totalInterest',
        value: formatCurrency(mortgageProjection?.totalInterestPaid ?? result.totalInterestPaid, loan.currency),
      },
      {
        labelKey: 'results.totalCost',
        value: formatCurrency(mortgageProjection?.totalAmountPaid ?? result.totalAmountPaid, loan.currency),
      },
    ],
    progress: buildSavedProgress(loan, result, asOf),
  };
};
